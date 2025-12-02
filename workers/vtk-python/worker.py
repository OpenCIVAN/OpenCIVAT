#!/usr/bin/env python3
"""
VTK Python Worker

Processes compute jobs from the BullMQ queue.
Supports mesh decimation, LOD generation, smoothing, etc.
"""

import os
import sys
import json
import time
import logging
import tempfile
from pathlib import Path

import redis
import requests
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy, numpy_to_vtk
from minio import Minio

# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
QUEUE_NAME = os.environ.get("QUEUE_NAME", "vtk-python")
WORKER_ID = os.environ.get("WORKER_ID", f"vtk-worker-{os.getpid()}")

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "cia-files")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

API_CALLBACK_URL = os.environ.get(
    "API_CALLBACK_URL", "http://localhost:3001/api/compute/internal"
)

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("vtk-worker")

# =============================================================================
# MINIO CLIENT
# =============================================================================

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


# =============================================================================
# VTK OPERATIONS
# =============================================================================


def read_vtk_file(filepath: str):
    """Read any VTK-supported file format."""
    ext = Path(filepath).suffix.lower()

    readers = {
        ".vtp": vtk.vtkXMLPolyDataReader,
        ".vti": vtk.vtkXMLImageDataReader,
        ".vtu": vtk.vtkXMLUnstructuredGridReader,
        ".vtk": vtk.vtkDataSetReader,
        ".stl": vtk.vtkSTLReader,
        ".obj": vtk.vtkOBJReader,
        ".ply": vtk.vtkPLYReader,
    }

    reader_class = readers.get(ext)
    if not reader_class:
        raise ValueError(f"Unsupported file format: {ext}")

    reader = reader_class()
    reader.SetFileName(filepath)
    reader.Update()

    return reader.GetOutput()


def write_vtk_file(data, filepath: str):
    """Write VTK data to file."""
    ext = Path(filepath).suffix.lower()

    if ext == ".vtp":
        writer = vtk.vtkXMLPolyDataWriter()
    elif ext == ".vti":
        writer = vtk.vtkXMLImageDataWriter()
    elif ext == ".vtu":
        writer = vtk.vtkXMLUnstructuredGridWriter()
    else:
        raise ValueError(f"Unsupported output format: {ext}")

    writer.SetFileName(filepath)
    writer.SetInputData(data)
    writer.Write()


def mesh_decimation(polydata, params: dict):
    """
    Decimate mesh using quadric error metrics.

    Args:
        polydata: vtkPolyData input
        params: {
            targetReduction: float (0-100, percentage to remove),
            preserveBoundary: bool
        }

    Returns:
        vtkPolyData: Decimated mesh
    """
    target = params.get("targetReduction", 50) / 100.0
    preserve_boundary = params.get("preserveBoundary", True)

    log.info(
        f"Decimating mesh: target={target*100}%, preserveBoundary={preserve_boundary}"
    )
    log.info(
        f"Input: {polydata.GetNumberOfPolys()} polygons, {polydata.GetNumberOfPoints()} points"
    )

    decimate = vtk.vtkQuadricDecimation()
    decimate.SetInputData(polydata)
    decimate.SetTargetReduction(target)

    if preserve_boundary:
        decimate.SetBoundaryVertexDeletion(False)

    decimate.Update()

    output = decimate.GetOutput()
    log.info(
        f"Output: {output.GetNumberOfPolys()} polygons, {output.GetNumberOfPoints()} points"
    )

    return output


def mesh_smoothing(polydata, params: dict):
    """
    Apply Laplacian smoothing to mesh.
    """
    iterations = params.get("iterations", 20)
    relaxation = params.get("relaxationFactor", 0.1)

    log.info(f"Smoothing mesh: iterations={iterations}, relaxation={relaxation}")

    smoother = vtk.vtkSmoothPolyDataFilter()
    smoother.SetInputData(polydata)
    smoother.SetNumberOfIterations(iterations)
    smoother.SetRelaxationFactor(relaxation)
    smoother.Update()

    return smoother.GetOutput()


def isosurface_extraction(imagedata, params: dict):
    """
    Extract isosurface from volume data.
    """
    iso_value = params.get("isoValue", 0.5)
    compute_normals = params.get("computeNormals", True)

    log.info(
        f"Extracting isosurface: isoValue={iso_value}, computeNormals={compute_normals}"
    )

    # Get scalar range to scale iso value
    scalar_range = imagedata.GetScalarRange()
    actual_iso = scalar_range[0] + iso_value * (scalar_range[1] - scalar_range[0])

    contour = vtk.vtkContourFilter()
    contour.SetInputData(imagedata)
    contour.SetValue(0, actual_iso)
    contour.Update()

    if compute_normals:
        normals = vtk.vtkPolyDataNormals()
        normals.SetInputConnection(contour.GetOutputPort())
        normals.ComputePointNormalsOn()
        normals.Update()
        return normals.GetOutput()

    return contour.GetOutput()


def compute_statistics(dataset, params: dict):
    """
    Compute dataset statistics.
    Returns JSON-serializable dict.
    """
    stats = {
        "bounds": list(dataset.GetBounds()),
        "numberOfPoints": dataset.GetNumberOfPoints(),
    }

    if hasattr(dataset, "GetNumberOfPolys"):
        stats["numberOfPolys"] = dataset.GetNumberOfPolys()
    if hasattr(dataset, "GetNumberOfCells"):
        stats["numberOfCells"] = dataset.GetNumberOfCells()

    # Point data arrays
    point_data = dataset.GetPointData()
    stats["pointArrays"] = []
    for i in range(point_data.GetNumberOfArrays()):
        arr = point_data.GetArray(i)
        if arr:
            stats["pointArrays"].append(
                {
                    "name": arr.GetName(),
                    "components": arr.GetNumberOfComponents(),
                    "range": list(arr.GetRange()),
                }
            )

    return stats


def lod_generation(polydata, params: dict):
    """
    Generate Level-of-Detail hierarchy.
    Returns the highest resolution version (LOD 0).
    In production, this would generate multiple files.
    """
    levels = params.get("levels", 4)
    reduction_ratio = params.get("reductionRatio", 0.5)

    log.info(f"Generating LOD: levels={levels}, reductionRatio={reduction_ratio}")

    # For now, just return the original mesh
    # In production, we'd generate multiple decimated versions
    # and store them in a hierarchy

    return polydata


# Operation dispatcher
OPERATIONS = {
    "mesh-decimation": mesh_decimation,
    "mesh-smoothing": mesh_smoothing,
    "isosurface-extraction": isosurface_extraction,
    "compute-statistics": compute_statistics,
    "lod-generation": lod_generation,
}


# =============================================================================
# JOB PROCESSING
# =============================================================================


def download_file(storage_key: str, local_path: str):
    """Download file from MinIO."""
    log.info(f"Downloading {storage_key} to {local_path}")
    minio_client.fget_object(MINIO_BUCKET, storage_key, local_path)


def upload_file(local_path: str, storage_key: str):
    """Upload file to MinIO."""
    log.info(f"Uploading {local_path} to {storage_key}")
    minio_client.fput_object(MINIO_BUCKET, storage_key, local_path)


def report_progress(job_id: str, progress: int, message: str = None):
    """Report job progress to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-progress",
            json={
                "jobId": job_id,
                "progress": progress,
                "message": message,
            },
            timeout=5,
        )
    except Exception as e:
        log.warning(f"Failed to report progress: {e}")


def report_complete(
    job_id: str,
    cache_key: str,
    result_key: str,
    metadata: dict,
    compute_time: int,
    size: int,
):
    """Report job completion to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-complete",
            json={
                "jobId": job_id,
                "cacheKey": cache_key,
                "resultStorageKey": result_key,
                "resultMetadata": metadata,
                "computeTimeMs": compute_time,
                "resultSizeBytes": size,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report completion: {e}")


def report_failed(job_id: str, error: str):
    """Report job failure to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-failed",
            json={
                "jobId": job_id,
                "error": error,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report failure: {e}")


def process_job(job_data: dict):
    """Process a single compute job."""
    job_id = job_data["jobId"]
    operation = job_data["operation"]
    file_storage_key = job_data["fileStorageKey"]
    params = job_data.get("params", {})
    cache_key = job_data.get("cacheKey", job_id)

    log.info(f"Processing job {job_id}: {operation}")
    start_time = time.time()

    try:
        # Get operation handler
        handler = OPERATIONS.get(operation)
        if not handler:
            raise ValueError(f"Unknown operation: {operation}")

        report_progress(job_id, 10, "Downloading file")

        # Download input file
        with tempfile.TemporaryDirectory() as tmpdir:
            input_ext = Path(file_storage_key).suffix
            input_path = os.path.join(tmpdir, f"input{input_ext}")
            download_file(file_storage_key, input_path)

            report_progress(job_id, 30, "Reading file")

            # Read input
            data = read_vtk_file(input_path)

            report_progress(job_id, 50, f"Running {operation}")

            # Process
            result = handler(data, params)

            # Handle different output types
            if operation == "compute-statistics":
                # JSON output
                result_metadata = result
                result_storage_key = None
                result_size = len(json.dumps(result))
            else:
                # VTK output
                report_progress(job_id, 80, "Writing output")

                output_path = os.path.join(tmpdir, "output.vtp")
                write_vtk_file(result, output_path)

                # Upload result
                result_storage_key = f"computed/{job_id}/result.vtp"
                upload_file(output_path, result_storage_key)

                result_size = os.path.getsize(output_path)
                result_metadata = {
                    "numberOfPoints": result.GetNumberOfPoints(),
                    "numberOfPolys": (
                        result.GetNumberOfPolys()
                        if hasattr(result, "GetNumberOfPolys")
                        else None
                    ),
                }

            compute_time = int((time.time() - start_time) * 1000)

            report_progress(job_id, 100, "Complete")
            report_complete(
                job_id,
                cache_key,
                result_storage_key,
                result_metadata,
                compute_time,
                result_size,
            )

            log.info(f"Job {job_id} completed in {compute_time}ms")

    except Exception as e:
        log.exception(f"Job {job_id} failed: {e}")
        report_failed(job_id, str(e))


# =============================================================================
# MAIN LOOP
# =============================================================================


#!/usr/bin/env python3
"""
VTK Python Worker

Processes compute jobs from the BullMQ queue.
Supports mesh decimation, LOD generation, smoothing, etc.

UPDATED: Uses BullMQ v4+ queue patterns (prioritized sorted set)
"""

import os
import sys
import json
import time
import logging
import tempfile
from pathlib import Path

import redis
import requests
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy, numpy_to_vtk
from minio import Minio

# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
QUEUE_NAME = os.environ.get("QUEUE_NAME", "vtk-python")
WORKER_ID = os.environ.get("WORKER_ID", f"vtk-worker-{os.getpid()}")

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "cia-files")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

API_CALLBACK_URL = os.environ.get(
    "API_CALLBACK_URL", "http://localhost:3001/api/compute/internal"
)

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("vtk-worker")

# =============================================================================
# MINIO CLIENT
# =============================================================================

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE,
)


# =============================================================================
# VTK OPERATIONS (same as before - truncated for brevity)
# =============================================================================

def read_vtk_file(filepath: str):
    """Read any VTK-supported file format."""
    ext = Path(filepath).suffix.lower()

    readers = {
        ".vtp": vtk.vtkXMLPolyDataReader,
        ".vti": vtk.vtkXMLImageDataReader,
        ".vtu": vtk.vtkXMLUnstructuredGridReader,
        ".vtk": vtk.vtkDataSetReader,
        ".stl": vtk.vtkSTLReader,
        ".obj": vtk.vtkOBJReader,
        ".ply": vtk.vtkPLYReader,
    }

    reader_class = readers.get(ext)
    if not reader_class:
        raise ValueError(f"Unsupported file format: {ext}")

    reader = reader_class()
    reader.SetFileName(filepath)
    reader.Update()

    return reader.GetOutput()


def write_vtk_file(data, filepath: str):
    """Write VTK data to file."""
    ext = Path(filepath).suffix.lower()

    writers = {
        ".vtp": vtk.vtkXMLPolyDataWriter,
        ".vti": vtk.vtkXMLImageDataWriter,
        ".vtu": vtk.vtkXMLUnstructuredGridWriter,
        ".stl": vtk.vtkSTLWriter,
        ".ply": vtk.vtkPLYWriter,
    }

    writer_class = writers.get(ext)
    if not writer_class:
        raise ValueError(f"Unsupported output format: {ext}")

    writer = writer_class()
    writer.SetFileName(filepath)
    writer.SetInputData(data)
    writer.Write()


def decimate_mesh(polydata, reduction=0.5):
    """Reduce mesh polygon count."""
    decimate = vtk.vtkDecimatePro()
    decimate.SetInputData(polydata)
    decimate.SetTargetReduction(reduction)
    decimate.PreserveTopologyOn()
    decimate.Update()
    return decimate.GetOutput()


def smooth_mesh(polydata, iterations=20, relaxation=0.1):
    """Smooth mesh surface."""
    smoother = vtk.vtkSmoothPolyDataFilter()
    smoother.SetInputData(polydata)
    smoother.SetNumberOfIterations(iterations)
    smoother.SetRelaxationFactor(relaxation)
    smoother.Update()
    return smoother.GetOutput()


def compute_statistics(data):
    """Compute dataset statistics (no output file)."""
    bounds = data.GetBounds()
    
    stats = {
        "bounds": {
            "xMin": bounds[0], "xMax": bounds[1],
            "yMin": bounds[2], "yMax": bounds[3],
            "zMin": bounds[4], "zMax": bounds[5],
        },
        "numberOfPoints": data.GetNumberOfPoints(),
        "numberOfCells": data.GetNumberOfCells(),
    }
    
    # Get data arrays info
    if hasattr(data, 'GetPointData'):
        point_data = data.GetPointData()
        stats["pointArrays"] = []
        for i in range(point_data.GetNumberOfArrays()):
            arr = point_data.GetArray(i)
            if arr:
                stats["pointArrays"].append({
                    "name": arr.GetName(),
                    "components": arr.GetNumberOfComponents(),
                    "tuples": arr.GetNumberOfTuples(),
                    "range": list(arr.GetRange()),
                })
    
    return stats


def generate_lod(polydata, levels=3):
    """Generate multiple LOD versions."""
    results = []
    reductions = [0.0, 0.5, 0.75, 0.9][:levels + 1]
    
    for i, reduction in enumerate(reductions):
        if reduction == 0:
            results.append({"level": i, "reduction": 0, "data": polydata})
        else:
            decimated = decimate_mesh(polydata, reduction)
            results.append({"level": i, "reduction": reduction, "data": decimated})
    
    return results


# =============================================================================
# API CALLBACKS
# =============================================================================

def report_progress(job_id: str, progress: int, message: str = None):
    """Report job progress to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-progress",
            json={
                "jobId": job_id,
                "progress": progress,
                "message": message,
            },
            timeout=5,
        )
    except Exception as e:
        log.warning(f"Failed to report progress: {e}")


def report_complete(
    job_id: str,
    cache_key: str,
    result_key: str,
    metadata: dict,
    compute_time: int,
    size: int,
):
    """Report job completion to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-complete",
            json={
                "jobId": job_id,
                "cacheKey": cache_key,
                "resultStorageKey": result_key,
                "resultMetadata": metadata,
                "computeTimeMs": compute_time,
                "resultSizeBytes": size,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report completion: {e}")


def report_failed(job_id: str, error: str):
    """Report job failure to API."""
    try:
        requests.post(
            f"{API_CALLBACK_URL}/job-failed",
            json={
                "jobId": job_id,
                "error": error,
            },
            timeout=10,
        )
    except Exception as e:
        log.error(f"Failed to report failure: {e}")


# =============================================================================
# JOB PROCESSING
# =============================================================================

def process_job(job_data: dict):
    """Process a single compute job."""
    job_id = job_data.get("jobId")
    operation = job_data.get("operation")
    file_storage_key = job_data.get("fileStorageKey")
    params = job_data.get("params", {})
    cache_key = job_data.get("cacheKey")

    log.info(f"Processing job {job_id}: {operation}")
    start_time = time.time()

    try:
        report_progress(job_id, 10, "Downloading file...")

        # Download file from MinIO
        with tempfile.NamedTemporaryFile(suffix=Path(file_storage_key).suffix, delete=False) as tmp:
            tmp_path = tmp.name
            minio_client.fget_object(MINIO_BUCKET, file_storage_key, tmp_path)

        report_progress(job_id, 30, "Reading file...")

        # Read VTK data
        data = read_vtk_file(tmp_path)
        
        report_progress(job_id, 50, f"Running {operation}...")

        # Execute operation
        result_data = None
        metadata = {}

        if operation == "mesh-decimation":
            reduction = params.get("reduction", 0.5)
            result_data = decimate_mesh(data, reduction)
            metadata = {
                "originalPoints": data.GetNumberOfPoints(),
                "resultPoints": result_data.GetNumberOfPoints(),
                "reduction": reduction,
            }

        elif operation == "mesh-smoothing":
            iterations = params.get("iterations", 20)
            relaxation = params.get("relaxation", 0.1)
            result_data = smooth_mesh(data, iterations, relaxation)
            metadata = {
                "iterations": iterations,
                "relaxation": relaxation,
            }

        elif operation == "compute-statistics":
            metadata = compute_statistics(data)
            # No output file for statistics
            report_progress(job_id, 90, "Finalizing...")
            compute_time = int((time.time() - start_time) * 1000)
            report_complete(job_id, cache_key, None, metadata, compute_time, 0)
            os.unlink(tmp_path)
            return

        elif operation == "lod-generation":
            levels = params.get("levels", 3)
            lod_results = generate_lod(data, levels)
            # For now, just return the medium LOD
            result_data = lod_results[1]["data"] if len(lod_results) > 1 else data
            metadata = {
                "levels": len(lod_results),
                "selectedLevel": 1,
            }

        else:
            raise ValueError(f"Unknown operation: {operation}")

        report_progress(job_id, 70, "Writing result...")

        # Write result to temp file
        result_suffix = Path(file_storage_key).suffix
        with tempfile.NamedTemporaryFile(suffix=result_suffix, delete=False) as result_tmp:
            result_path = result_tmp.name
            write_vtk_file(result_data, result_path)

        report_progress(job_id, 85, "Uploading result...")

        # Upload to MinIO
        result_key = f"computed/{job_id}/result{result_suffix}"
        result_size = os.path.getsize(result_path)
        minio_client.fput_object(MINIO_BUCKET, result_key, result_path)

        report_progress(job_id, 95, "Finalizing...")

        # Cleanup temp files
        os.unlink(tmp_path)
        os.unlink(result_path)

        compute_time = int((time.time() - start_time) * 1000)
        log.info(f"Job {job_id} completed in {compute_time}ms")

        report_complete(job_id, cache_key, result_key, metadata, compute_time, result_size)

    except Exception as e:
        log.exception(f"Job {job_id} failed: {e}")
        report_failed(job_id, str(e))


# =============================================================================
# MAIN LOOP - FIXED FOR BULLMQ V4+
# =============================================================================

def main():
    """Main worker loop using BullMQ v4+ queue patterns."""
    log.info(f"Starting VTK worker: {WORKER_ID}")
    log.info(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    log.info(f"Queue: {QUEUE_NAME}")
    log.info(f"MinIO: {MINIO_ENDPOINT}/{MINIO_BUCKET}")

    # Connect to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    # BullMQ v4+ key patterns
    prioritized_key = f"bull:{QUEUE_NAME}:prioritized"  # Sorted set for prioritized jobs
    wait_key = f"bull:{QUEUE_NAME}:wait"  # List for non-prioritized jobs (fallback)
    active_key = f"bull:{QUEUE_NAME}:active"

    log.info("Worker ready, waiting for jobs...")

    while True:
        try:
            job_id = None

            # First, try to get from prioritized sorted set (BullMQ v4+ default)
            # BZPOPMIN blocks and returns the item with lowest score (highest priority)
            result = r.bzpopmin(prioritized_key, timeout=1)
            
            if result:
                # result is (key, member, score) tuple
                job_id = result[1]
                log.debug(f"Got job from prioritized queue: {job_id}")
            else:
                # Fallback: try the wait list (non-prioritized jobs)
                job_id = r.brpoplpush(wait_key, active_key, timeout=1)
                if job_id:
                    log.debug(f"Got job from wait queue: {job_id}")

            if job_id:
                # Move to active set (for prioritized jobs)
                r.zadd(active_key, {job_id: time.time()})

                # Get job data from the job hash
                job_key = f"bull:{QUEUE_NAME}:{job_id}"
                job_json = r.hget(job_key, "data")

                if job_json:
                    job_data = json.loads(job_json)
                    log.info(f"Processing job: {job_id}")
                    process_job(job_data)
                else:
                    log.warning(f"No data found for job {job_id}")

                # Remove from active
                r.zrem(active_key, job_id)
                
                # Mark job as completed in BullMQ (move to completed set)
                completed_key = f"bull:{QUEUE_NAME}:completed"
                r.zadd(completed_key, {job_id: time.time()})

        except redis.ConnectionError as e:
            log.error(f"Redis connection error: {e}")
            time.sleep(5)
        except KeyboardInterrupt:
            log.info("Shutting down...")
            break
        except Exception as e:
            log.exception(f"Unexpected error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
    """Main worker loop."""
    log.info(f"Starting VTK worker: {WORKER_ID}")
    log.info(f"Redis: {REDIS_HOST}:{REDIS_PORT}")
    log.info(f"Queue: {QUEUE_NAME}")
    log.info(f"MinIO: {MINIO_ENDPOINT}/{MINIO_BUCKET}")

    # Connect to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    # BullMQ uses specific key patterns
    queue_key = f"bull:{QUEUE_NAME}:wait"
    processing_key = f"bull:{QUEUE_NAME}:active"

    log.info("Worker ready, waiting for jobs...")

    while True:
        try:
            # BRPOPLPUSH: atomically move job from wait to active
            job_id = r.brpoplpush(queue_key, processing_key, timeout=5)

            if job_id:
                # Get job data
                job_key = f"bull:{QUEUE_NAME}:{job_id}"
                job_json = r.hget(job_key, "data")

                if job_json:
                    job_data = json.loads(job_json)
                    process_job(job_data)

                # Remove from active list
                r.lrem(processing_key, 1, job_id)

        except redis.ConnectionError as e:
            log.error(f"Redis connection error: {e}")
            time.sleep(5)
        except KeyboardInterrupt:
            log.info("Shutting down...")
            break
        except Exception as e:
            log.exception(f"Unexpected error: {e}")
            time.sleep(1)