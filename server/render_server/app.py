"""
app.py — CIA_Web Python VTK Render Server

FastAPI application for server-side VTK dataset rendering.
Provides HTTP endpoints for dataset listing, loading, and camera control,
plus a WebSocket endpoint for interactive frame streaming.

HTTP Endpoints:
  GET  /health        Server health and VTK version
  GET  /datasets      Available dataset listing
  POST /load          Load dataset, return metadata + first PNG frame (base64)
  POST /camera        Update camera, return new PNG frame
  GET  /frame         Latest PNG frame (HTTP polling fallback)

WebSocket:
  WS   /ws            Bidirectional streaming: camera commands in, frames out

See docs/server-rendering.md for full protocol documentation.
"""

import os
import sys
import json
import base64
import logging
import asyncio
import uuid
import time
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("app")

# ── Config from environment ───────────────────────────────────────────────────
DATASET_DIR = os.environ.get("DATASET_DIR", "./datasets")
EXTRA_DATASET_DIR = os.environ.get("EXTRA_DATASET_DIR", "")
RENDER_WIDTH = int(os.environ.get("RENDER_WIDTH", "1024"))
RENDER_HEIGHT = int(os.environ.get("RENDER_HEIGHT", "768"))
MAX_SESSIONS = int(os.environ.get("MAX_SESSIONS", "10"))

log.info("[app] Starting CIA_Web VTK Render Server")
log.info(f"[app] Dataset dir: {DATASET_DIR}")
log.info(f"[app] Render size: {RENDER_WIDTH}x{RENDER_HEIGHT}")
log.info(f"[app] Max sessions: {MAX_SESSIONS}")

# ── VTK availability check ────────────────────────────────────────────────────
try:
    import vtk
    VTK_VERSION = vtk.vtkVersion.GetVTKVersion()
    VTK_AVAILABLE = True
    log.info(f"[app] VTK version: {VTK_VERSION}")
except ImportError:
    VTK_VERSION = "not available"
    VTK_AVAILABLE = False
    log.error("[app] VTK is not installed. Install with: pip install vtk")

# ── Dataset discovery ─────────────────────────────────────────────────────────
from dataset_loader import scan_datasets

dataset_dirs = [d for d in [DATASET_DIR, EXTRA_DATASET_DIR] if d]
_datasets_list = scan_datasets(dataset_dirs)
DATASETS = {d["id"]: d for d in _datasets_list}
log.info(f"[app] Registered {len(DATASETS)} dataset(s): {list(DATASETS.keys())}")

# ── Session manager ───────────────────────────────────────────────────────────
from render_state import SessionManager

session_manager = None
if VTK_AVAILABLE:
    session_manager = SessionManager(RENDER_WIDTH, RENDER_HEIGHT, MAX_SESSIONS)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CIA_Web VTK Render Server",
    description="Server-side scientific visualization for CIA_Web",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

class LoadRequest(BaseModel):
    datasetId: str
    path: Optional[str] = None
    sessionId: Optional[str] = None


class CameraRequest(BaseModel):
    sessionId: str
    position: Optional[list] = None
    focalPoint: Optional[list] = None
    viewUp: Optional[list] = None
    zoom: Optional[float] = 1.0


# ── HTTP endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "ok": True,
        "vtk_available": VTK_AVAILABLE,
        "vtk_version": VTK_VERSION,
        "dataset_count": len(DATASETS),
        "render_size": f"{RENDER_WIDTH}x{RENDER_HEIGHT}",
        "max_sessions": MAX_SESSIONS,
        "gpu_rendering_enabled": os.environ.get("ENABLE_GPU_RENDERING") == "true",
    }


@app.get("/datasets")
async def list_datasets():
    """Return list of available datasets discovered from DATASET_DIR."""
    return list(DATASETS.values())


@app.post("/load")
async def load_dataset(req: LoadRequest):
    """
    Load a dataset and return metadata + first rendered frame.
    Creates a render session if sessionId is not provided.
    """
    if not VTK_AVAILABLE or session_manager is None:
        raise HTTPException(503, "VTK rendering not available — check server logs")

    dataset_info = DATASETS.get(req.datasetId)
    path = req.path or (dataset_info["path"] if dataset_info else None)

    if not path:
        raise HTTPException(
            404,
            f"Dataset '{req.datasetId}' not found. Available: {list(DATASETS.keys())}"
        )

    file_type = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    if file_type not in ("vtp", "vtu", "vti"):
        raise HTTPException(400, f"Unsupported file type: .{file_type}")

    session_id = req.sessionId or str(uuid.uuid4())
    session = session_manager.get_or_create(session_id)

    log.info(f"[app] Session {session_id} — loading '{req.datasetId}' from {path}")

    try:
        # Run VTK operations on the calling thread (main thread on macOS).
        # macOS Cocoa requires NSWindow/GL context on the main thread; using
        # run_in_executor would push to a worker thread and crash with
        # "NSWindow should only be instantiated on the main thread".
        t0 = time.perf_counter()
        metadata = session.renderer.load(path, file_type)
        png_bytes = session.renderer.render_to_png()
        elapsed = time.perf_counter() - t0
        log.info(f"[app] Session {session_id} — dataset loaded in {elapsed:.2f}s")

        session.loaded_dataset_id = req.datasetId
        session.loaded_dataset_path = path
        session.touch()

        frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
        camera_state = session.renderer.get_camera_state()

        return {
            "ok": True,
            "sessionId": session_id,
            "datasetId": req.datasetId,
            "metadata": metadata,
            "camera": camera_state,
            "frame": frame_b64,
            "frameWidth": RENDER_WIDTH,
            "frameHeight": RENDER_HEIGHT,
        }

    except FileNotFoundError as e:
        log.error(f"[app] File not found: {e}")
        raise HTTPException(404, str(e))
    except ValueError as e:
        log.error(f"[app] Invalid dataset: {e}")
        raise HTTPException(422, str(e))
    except Exception as e:
        log.error(f"[app] Render error: {e}", exc_info=True)
        raise HTTPException(500, f"Render failed: {e}")


@app.post("/camera")
async def update_camera(req: CameraRequest):
    """Update camera position and return a new rendered frame."""
    if not VTK_AVAILABLE or session_manager is None:
        raise HTTPException(503, "VTK rendering not available")

    session = session_manager.get_or_create(req.sessionId)

    if not session.loaded_dataset_id:
        raise HTTPException(400, "No dataset loaded in this session. Call /load first.")

    log.debug(f"[app] Session {req.sessionId} — camera update")

    try:
        t0 = time.perf_counter()
        session.renderer.set_camera(
            req.position, req.focalPoint, req.viewUp, req.zoom or 1.0
        )
        png_bytes = session.renderer.render_to_png()
        elapsed = time.perf_counter() - t0
        log.debug(f"[app] Camera frame in {elapsed * 1000:.0f}ms")
        session.touch()

        frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
        camera_state = session.renderer.get_camera_state()

        return {
            "ok": True,
            "sessionId": req.sessionId,
            "camera": camera_state,
            "frame": frame_b64,
            "frameWidth": RENDER_WIDTH,
            "frameHeight": RENDER_HEIGHT,
        }

    except Exception as e:
        log.error(f"[app] Camera update error: {e}", exc_info=True)
        raise HTTPException(500, f"Camera update failed: {e}")


@app.get("/frame")
async def get_frame(sessionId: Optional[str] = None):
    """Return latest rendered PNG as image/png (HTTP polling fallback)."""
    if not VTK_AVAILABLE or session_manager is None:
        raise HTTPException(503, "VTK rendering not available")

    if not sessionId:
        raise HTTPException(400, "sessionId query parameter required")

    session = session_manager.get_or_create(sessionId)

    if not session.loaded_dataset_id:
        raise HTTPException(400, "No dataset loaded in this session")

    png_bytes = session.renderer.render_to_png()
    return Response(content=png_bytes, media_type="image/png")


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Bidirectional WebSocket for interactive rendering.

    Client → Server messages:
      { "type": "loadDataset", "datasetId": "...", "path": "..." }
      { "type": "cameraUpdate", "camera": { "position": [], "focalPoint": [], "viewUp": [] } }
      { "type": "setRepresentation", "representation": "surface|wireframe|points" }
      { "type": "resetCamera" }
      { "type": "ping" }

    Server → Client messages:
      { "type": "connected", "sessionId": "..." }
      { "type": "datasetLoaded", "datasetId": "...", "metadata": {...}, "camera": {...} }
      { "type": "frame", "image": "<base64-png>", "width": ..., "height": ... }
      { "type": "error", "message": "...", "stage": "load|parse|render|camera" }
      { "type": "pong" }
    """
    await websocket.accept()

    session_id = str(uuid.uuid4())
    log.info(f"[app] WS connected: {session_id}")

    session = None
    if session_manager:
        session = session_manager.get_or_create(session_id)

    try:
        await websocket.send_json({
            "type": "connected",
            "sessionId": session_id,
            "vtkAvailable": VTK_AVAILABLE,
        })

        while True:
            raw = await websocket.receive_text()

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON",
                    "stage": "parse",
                })
                continue

            msg_type = msg.get("type", "")
            log.debug(f"[app] WS {session_id} recv: {msg_type}")

            # ── ping ────────────────────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            # ── loadDataset ─────────────────────────────────────────────────
            elif msg_type == "loadDataset":
                dataset_id = msg.get("datasetId", "")
                path = msg.get("path", "")

                if not path and dataset_id in DATASETS:
                    path = DATASETS[dataset_id]["path"]

                if not path:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Dataset '{dataset_id}' not found. "
                                   f"Available: {list(DATASETS.keys())}",
                        "stage": "load",
                    })
                    continue

                file_type = path.rsplit(".", 1)[-1].lower() if "." in path else ""
                log.info(f"[app] WS {session_id} — loading '{dataset_id}'")

                try:
                    # VTK must run on main thread on macOS (Cocoa constraint)
                    t0 = time.perf_counter()
                    metadata = session.renderer.load(path, file_type)
                    png_bytes = session.renderer.render_to_png()
                    log.info(
                        f"[app] WS {session_id} — loaded in "
                        f"{time.perf_counter() - t0:.2f}s"
                    )
                    session.loaded_dataset_id = dataset_id
                    session.loaded_dataset_path = path
                    session.touch()

                    frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
                    camera_state = session.renderer.get_camera_state()

                    await websocket.send_json({
                        "type": "datasetLoaded",
                        "datasetId": dataset_id,
                        "metadata": metadata,
                        "camera": camera_state,
                    })

                    await websocket.send_json({
                        "type": "frame",
                        "image": frame_b64,
                        "width": RENDER_WIDTH,
                        "height": RENDER_HEIGHT,
                        "camera": camera_state,
                    })

                except FileNotFoundError as e:
                    await websocket.send_json({"type": "error", "message": str(e), "stage": "load"})
                except ValueError as e:
                    await websocket.send_json({"type": "error", "message": str(e), "stage": "parse"})
                except Exception as e:
                    log.error(f"[app] WS load error: {e}", exc_info=True)
                    await websocket.send_json({"type": "error", "message": str(e), "stage": "render"})

            # ── cameraUpdate ────────────────────────────────────────────────
            elif msg_type == "cameraUpdate":
                if not session or not session.loaded_dataset_id:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No dataset loaded. Send loadDataset first.",
                        "stage": "camera",
                    })
                    continue

                camera = msg.get("camera", {})

                try:
                    session.renderer.set_camera(
                        camera.get("position"),
                        camera.get("focalPoint"),
                        camera.get("viewUp"),
                        camera.get("zoom", 1.0),
                    )
                    png_bytes = session.renderer.render_to_png()
                    session.touch()

                    frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
                    await websocket.send_json({
                        "type": "frame",
                        "image": frame_b64,
                        "width": RENDER_WIDTH,
                        "height": RENDER_HEIGHT,
                    })

                except Exception as e:
                    log.error(f"[app] Camera error: {e}", exc_info=True)
                    await websocket.send_json({"type": "error", "message": str(e), "stage": "camera"})

            # ── resetCamera ─────────────────────────────────────────────────
            elif msg_type == "resetCamera":
                if not session or not session.loaded_dataset_id:
                    continue

                session.renderer.reset_camera()
                png_bytes = session.renderer.render_to_png()
                session.touch()

                frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
                camera_state = session.renderer.get_camera_state()
                await websocket.send_json({
                    "type": "frame",
                    "image": frame_b64,
                    "width": RENDER_WIDTH,
                    "height": RENDER_HEIGHT,
                    "camera": camera_state,
                })

            # ── setRepresentation ───────────────────────────────────────────
            elif msg_type == "setRepresentation":
                if not session or not session.loaded_dataset_id:
                    continue

                session.renderer.set_representation(msg.get("representation", "surface"))
                png_bytes = session.renderer.render_to_png()
                session.touch()

                frame_b64 = base64.b64encode(png_bytes).decode("utf-8")
                await websocket.send_json({
                    "type": "frame",
                    "image": frame_b64,
                    "width": RENDER_WIDTH,
                    "height": RENDER_HEIGHT,
                })

            else:
                log.debug(f"[app] WS unknown message type: {msg_type}")

    except WebSocketDisconnect:
        log.info(f"[app] WS disconnected: {session_id}")
    except Exception as e:
        log.error(f"[app] WS error: {e}", exc_info=True)
    finally:
        if session_manager:
            session_manager.remove(session_id)
