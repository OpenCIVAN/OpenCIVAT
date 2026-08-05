"""
vtk_renderer.py
Server-side VTK rendering pipeline for CIA_Web.
Renders VTP, VTU, and VTI datasets to PNG frames using offscreen VTK.
"""
import logging
import os
import math
import base64

try:
    import vtk
    VTK_AVAILABLE = True
except ImportError:
    VTK_AVAILABLE = False

log = logging.getLogger(__name__)


class VTKRenderer:
    """Offscreen VTK renderer for scientific datasets."""

    READERS = {
        "vtp": "vtkXMLPolyDataReader",
        "vtu": "vtkXMLUnstructuredGridReader",
        "vti": "vtkXMLImageDataReader",
    }

    MAPPERS = {
        "vtp": "vtkPolyDataMapper",
        "vtu": "vtkDataSetMapper",
        "vti": "vtkDataSetMapper",
    }

    def __init__(self, width: int = 1024, height: int = 768):
        if not VTK_AVAILABLE:
            raise RuntimeError("VTK is not installed. Run: pip install vtk")

        self.width = width
        self.height = height

        self.renderer = vtk.vtkRenderer()
        self.renderer.SetBackground(0.15, 0.15, 0.15)

        if os.environ.get("ENABLE_GPU_RENDERING") == "true" and hasattr(vtk, "vtkEGLRenderWindow"):
            self.render_window = vtk.vtkEGLRenderWindow()
            self.render_window.SetDeviceIndex(int(os.environ.get("EGL_DEVICE_INDEX", "0")))
        else:
            self.render_window = vtk.vtkRenderWindow()

        self.render_window.SetOffScreenRendering(1)
        self.render_window.AddRenderer(self.renderer)
        self.render_window.SetSize(width, height)

        log.info(
            f"[vtk_renderer] Initialized offscreen renderer {width}x{height} "
            f"({self.render_window.GetClassName()})"
        )

    def load(self, path: str, file_type: str) -> dict:
        """
        Load a VTK dataset from file.
        Returns metadata dict with pointCount, cellCount, bounds, availableArrays.
        Raises ValueError / FileNotFoundError / RuntimeError on failure.
        """
        file_type = file_type.lower().strip(".")

        if file_type not in self.READERS:
            raise ValueError(
                f"Unsupported file type: .{file_type}. "
                f"Supported: {', '.join('.' + t for t in self.READERS)}"
            )

        if not os.path.isfile(path):
            raise FileNotFoundError(f"Dataset file not found: {path}")

        log.info(f"[vtk_renderer] Loading: {path} ({file_type})")
        log.info(f"[vtk_renderer] Reader: {self.READERS[file_type]}")

        reader = getattr(vtk, self.READERS[file_type])()
        reader.SetFileName(path)

        try:
            reader.Update()
        except Exception as e:
            raise RuntimeError(f"VTK reader failed for {path}: {e}")

        output = reader.GetOutput()
        if output is None:
            raise RuntimeError(f"VTK reader returned no output for {path}")

        num_points = output.GetNumberOfPoints()
        num_cells = output.GetNumberOfCells()

        log.info(f"[vtk_renderer] Points: {num_points:,} | Cells: {num_cells:,}")

        if num_points == 0:
            raise ValueError(f"Dataset has no geometry (0 points): {path}")

        bounds = list(output.GetBounds())
        log.info(f"[vtk_renderer] Bounds: {[round(b, 3) for b in bounds]}")

        if not all(math.isfinite(b) for b in bounds):
            raise ValueError(f"Dataset has invalid (infinite/NaN) bounds: {bounds}")

        available_arrays = []
        point_data = output.GetPointData()
        cell_data = output.GetCellData()

        for i in range(point_data.GetNumberOfArrays()):
            arr = point_data.GetAbstractArray(i)
            if arr and arr.GetName():
                available_arrays.append({
                    "name": arr.GetName(),
                    "location": "point",
                    "components": arr.GetNumberOfComponents(),
                })

        for i in range(cell_data.GetNumberOfArrays()):
            arr = cell_data.GetAbstractArray(i)
            if arr and arr.GetName():
                available_arrays.append({
                    "name": arr.GetName(),
                    "location": "cell",
                    "components": arr.GetNumberOfComponents(),
                })

        mapper = getattr(vtk, self.MAPPERS[file_type])()
        mapper.SetInputConnection(reader.GetOutputPort())

        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetColor(0.8, 0.8, 0.8)
        actor.GetProperty().SetAmbient(0.2)
        actor.GetProperty().SetDiffuse(0.8)

        self.renderer.RemoveAllViewProps()
        self.renderer.AddActor(actor)
        self.renderer.ResetCamera()

        log.info(f"[vtk_renderer] Scene setup complete")

        return {
            "pointCount": num_points,
            "cellCount": num_cells,
            "bounds": bounds,
            "availableArrays": available_arrays,
            "fileType": file_type,
        }

    def set_camera(self, position=None, focal_point=None, view_up=None, zoom=1.0):
        """Update camera state."""
        cam = self.renderer.GetActiveCamera()
        if position and len(position) >= 3:
            cam.SetPosition(*position[:3])
        if focal_point and len(focal_point) >= 3:
            cam.SetFocalPoint(*focal_point[:3])
        if view_up and len(view_up) >= 3:
            cam.SetViewUp(*view_up[:3])
        self.renderer.ResetCameraClippingRange()

    def reset_camera(self):
        """Reset camera to fit dataset."""
        self.renderer.ResetCamera()
        self.renderer.ResetCameraClippingRange()

    def set_representation(self, representation: str):
        """Set surface/wireframe/points representation on all actors."""
        actors = self.renderer.GetActors()
        actors.InitTraversal()
        actor = actors.GetNextActor()
        while actor:
            prop = actor.GetProperty()
            rep = representation.lower()
            if rep == "wireframe":
                prop.SetRepresentationToWireframe()
            elif rep == "points":
                prop.SetRepresentationToPoints()
                prop.SetPointSize(3.0)
            else:
                prop.SetRepresentationToSurface()
            actor = actors.GetNextActor()

    def get_camera_state(self) -> dict:
        """Return serializable camera state."""
        cam = self.renderer.GetActiveCamera()
        return {
            "position": list(cam.GetPosition()),
            "focalPoint": list(cam.GetFocalPoint()),
            "viewUp": list(cam.GetViewUp()),
            "zoom": cam.GetParallelScale(),
            "clippingRange": list(cam.GetClippingRange()),
        }

    def render_to_png(self) -> bytes:
        """Render current scene to PNG bytes."""
        self.render_window.Render()

        w2i = vtk.vtkWindowToImageFilter()
        w2i.SetInput(self.render_window)
        w2i.SetScale(1)
        w2i.Update()

        writer = vtk.vtkPNGWriter()
        writer.WriteToMemoryOn()
        writer.SetInputConnection(w2i.GetOutputPort())
        writer.Write()

        png_bytes = bytes(writer.GetResult())
        log.debug(
            f"[vtk_renderer] Render complete: "
            f"{self.width}x{self.height} PNG, {len(png_bytes) / 1024:.1f} KB"
        )
        return png_bytes

    def render_to_base64(self) -> str:
        """Render and return base64-encoded PNG string."""
        return base64.b64encode(self.render_to_png()).decode("utf-8")
