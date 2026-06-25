// GET /api/gpu/status — diagnostic endpoint for GPU/render backend status
// No auth required; safe to call from any client.

const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

router.get("/status", async (req, res) => {
  const enableGpu = process.env.ENABLE_GPU_RENDERING === "true";

  const result = {
    gpuAvailable: false,
    nvidiaSmiAvailable: false,
    cudaVisible: false,
    renderingBackend: enableGpu ? "gpu" : "cpu",
    vtkVersion: null,
    dockerRuntimeInfo: null,
  };

  // Check nvidia-smi availability (works inside Docker when --gpus all is set)
  try {
    const { stdout } = await execAsync(
      "nvidia-smi --query-gpu=name,driver_version --format=csv,noheader",
      { timeout: 5000 }
    );
    const gpuInfo = stdout.trim();
    if (gpuInfo) {
      result.nvidiaSmiAvailable = true;
      result.gpuAvailable = true;
      result.dockerRuntimeInfo = gpuInfo;
    }
  } catch {
    result.nvidiaSmiAvailable = false;
  }

  // CUDA_VISIBLE_DEVICES being set (and not explicitly disabled) indicates CUDA access
  const cudaDevices = process.env.CUDA_VISIBLE_DEVICES;
  result.cudaVisible =
    cudaDevices !== undefined &&
    cudaDevices !== "" &&
    cudaDevices !== "NoDevFiles" &&
    cudaDevices !== "-1";

  // Probe render server for VTK version
  const renderServerUrl =
    process.env.RENDER_SERVER_URL || "http://localhost:7001";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${renderServerUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const health = await response.json();
      result.vtkVersion = health.vtk_version || health.vtkVersion || null;
    }
  } catch {
    // render server offline or not yet started — non-fatal
  }

  res.json(result);
});

module.exports = router;
