FROM python:3.11-slim

# System dependencies for VTK offscreen rendering (Mesa software renderer)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglu1-mesa \
    libgl1-mesa-dri \
    libgomp1 \
    libxrender1 \
    libxt6 \
    libsm6 \
    libegl1 \
    libegl-mesa0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (vtk is large; separate layer for better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY *.py .

EXPOSE 7000

ENV DATASET_DIR=/app/datasets
ENV RENDER_WIDTH=1024
ENV RENDER_HEIGHT=768
ENV MAX_SESSIONS=10
ENV VTK_DEFAULT_RENDER_WINDOW_OFFSCREEN=1
ENV ENABLE_GPU_RENDERING=false

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7000", "--log-level", "info"]
