# Tarun WebGPU Module (CIA_Web)

This folder contains Tarun Teja Paila’s WebGPU-related work for CIA_Web.
It is intentionally kept separate from the WASM work to avoid conflicts and make grading easier.

## What’s inside
- `src/`      : WebGPU integration code (render/compute glue)
- `shaders/`  : WGSL compute shaders
- `docs/`     : design notes + usage instructions
- `results/`  : benchmarking outputs (FPS, load time, memory)
- `screenshots/` : evidence screenshots for TA

## How to run (to be updated)
1) Install dependencies:
   npm install

2) Start dev server:
   npm run dev

## Notes
- WebGPU backend is enabled using vtk.js WebGPU rendering (defaultViewAPI/WebGPU-specific setup).
- Compute kernels use WGSL shaders (distance/KNN/etc).
