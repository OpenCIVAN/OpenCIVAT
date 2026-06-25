# Windows + NVIDIA GPU Setup for CIA Web

This guide sets up CIA Web's GPU-accelerated rendering server on a Windows machine with an NVIDIA GPU using WSL2 and Docker Desktop.

**Platform roles:**
- Windows/NVIDIA machine — runs the Docker rendering stack
- Apple Vision Pro (or any browser) — thin client, connects over HTTPS
- Chrome on Windows — local dev/testing

macOS users: the base `docker-compose.yml` runs fine on macOS using CPU/Mesa rendering. This guide and the GPU override are for Windows/NVIDIA only.

For general run instructions (no GPU), see **[docs/getting-started.md](getting-started.md)**.

---

## Prerequisites check

Before starting, confirm your hardware:
- NVIDIA GPU (GTX 1060 or better; RTX series recommended for VR workloads)
- Windows 10 (21H2+) or Windows 11
- At least 16 GB RAM recommended

---

## Step 1 — Install or update NVIDIA driver (with WSL2 support)

Download the latest Game Ready or Studio driver from https://www.nvidia.com/drivers

The WSL2 GPU support is built into the Windows-side driver since version 471.11. You do **not** install a separate CUDA driver inside WSL2 — the Windows driver exposes the GPU to WSL2.

After install, open PowerShell and verify:
```powershell
nvidia-smi
```
You should see your GPU name, driver version, and CUDA version.

---

## Step 2 — Install WSL2

Open PowerShell as Administrator:
```powershell
wsl --install
```

This installs WSL2 and Ubuntu by default. Reboot when prompted.

If WSL is already installed, update the kernel:
```powershell
wsl --update
wsl --set-default-version 2
```

---

## Step 3 — Install Ubuntu in WSL2

After reboot, open Ubuntu from the Start menu (or run `wsl`). Complete the initial user setup.

Verify WSL2 mode:
```powershell
wsl -l -v
```
The Ubuntu distro should show VERSION 2.

---

## Step 4 — Install Docker Desktop

Download Docker Desktop for Windows from https://www.docker.com/products/docker-desktop

During install:
- Select **Use WSL 2 instead of Hyper-V** (recommended)
- Do not enable Hyper-V backend if you want WSL2 mode

After install, open Docker Desktop → Settings → General → confirm "Use the WSL 2 based engine" is checked.

---

## Step 5 — Enable WSL2 integration for Ubuntu

In Docker Desktop → Settings → Resources → WSL Integration:
- Enable integration for your Ubuntu distro

Apply and restart Docker Desktop.

---

## Step 6 — Test GPU access inside Docker

Open a WSL2 Ubuntu terminal and run:
```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

You should see the same GPU table as on Windows. If this works, Docker can access your NVIDIA GPU.

**If this fails, see Troubleshooting below.**

---

## Step 7 — Clone and configure CIA Web

In WSL2 Ubuntu terminal:
```bash
git clone <repo-url> CIA_Web
cd CIA_Web
cp .env.example .env
```

Edit `.env` and set:
```
ENABLE_GPU_RENDERING=true
RENDER_MODE=server
```

---

## Step 8 — Run with GPU rendering

```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up
```

Or to build first:
```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up --build
```

Verify GPU status endpoint:
```bash
curl http://localhost:3001/api/gpu/status
```

Expected response when GPU is available:
```json
{
  "gpuAvailable": true,
  "nvidiaSmiAvailable": true,
  "cudaVisible": false,
  "renderingBackend": "gpu",
  "vtkVersion": "9.3.x",
  "dockerRuntimeInfo": "NVIDIA GeForce RTX 4080, 560.00"
}
```

---

## Step 9 — Start the frontend

Outside Docker (on the Windows host or in WSL2):
```bash
npm install
npm start        # HTTPS (needs certs/key.pem + certs/cert.pem)
# or
npm run start:http   # HTTP, simpler for initial testing
```

Open `https://localhost:8081` in Chrome for local testing.

---

## Step 10 — Expose to Apple Vision Pro

Vision Pro requires HTTPS and cannot use `localhost` (it resolves to the headset itself).

**Option A — Same local network with HTTPS certificate:**
Generate a self-signed cert for your machine's LAN IP (e.g. `192.168.1.X`), add it to Vision Pro's trusted certs, then open `https://192.168.1.X:8081`.

**Option B — ngrok (easiest for testing):**
```bash
ngrok http https://localhost:8081
```
Open the ngrok HTTPS URL on Vision Pro.

**Option C — Cloudflare Tunnel:**
```bash
cloudflared tunnel --url https://localhost:8081
```

See `docs/apple-vision-pro.md` for the full Vision Pro workflow.

---

## Troubleshooting

### Docker cannot see GPU

Symptom: `docker run --rm --gpus all ...` fails with "could not select device driver".

Fix:
1. Confirm NVIDIA driver is installed on Windows: run `nvidia-smi` in PowerShell.
2. Update WSL2 kernel: `wsl --update` in PowerShell (as Administrator).
3. In Docker Desktop: Settings → Docker Engine, add:
   ```json
   {
     "runtimes": {
       "nvidia": {
         "path": "nvidia-container-runtime",
         "runtimeArgs": []
       }
     }
   }
   ```
4. Restart Docker Desktop.

### WSL kernel outdated

```powershell
wsl --update
wsl --shutdown
```
Then reopen your Ubuntu terminal.

### NVIDIA driver outdated

The GPU-in-WSL2 feature requires driver version 471.11 or later. Update from https://www.nvidia.com/drivers.

### Docker Desktop WSL integration disabled

Docker Desktop → Settings → Resources → WSL Integration → enable your Ubuntu distro → Apply & Restart.

### `nvidia-smi` works on Windows but not inside Docker

This usually means the `nvidia-container-toolkit` is not wired into Docker's runtime. In newer Docker Desktop for Windows with WSL2 backend, NVIDIA support is automatic once the Windows driver is installed. If it still fails:
1. Open WSL2 Ubuntu terminal.
2. Check: `which nvidia-smi` — if not found inside WSL2, that's expected; the GPU runtime is handled by Docker, not by a WSL2 nvidia-smi binary.
3. Test directly: `docker run --rm --gpus all ubuntu nvidia-smi`.
4. If that errors, restart Docker Desktop and retry.

### render-server starts but reports CPU mode

Check that you're using the GPU override:
```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up render-server
```
And that `.env` has `ENABLE_GPU_RENDERING=true`. Verify with `curl http://localhost:3001/api/gpu/status`.
