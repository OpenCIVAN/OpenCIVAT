export async function computeStatsJSON(polyData, opts = {}, onProgress) {
  const points = polyData.getPoints();
  const numPoints = points.getNumberOfPoints();
  const data = points.getData();
  const bbox = polyData.getBounds();

  const worker = new Worker(new URL('../workers/computeStats.worker.js', import.meta.url), { type: 'module' });
  const copy = new Float32Array(data);

  const p = new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data?.type === 'progress') {
        onProgress && onProgress(e.data.value);
      } else if (e.data?.type === 'done') {
        resolve(e.data.result);
        worker.terminate();
      }
    };
    worker.onerror = (err) => { reject(err); worker.terminate(); };
  });

  worker.postMessage({
    pointsBuffer: copy.buffer,
    numPoints, bbox,
    opts: {
      maxPoints: opts.maxPoints ?? 30000,
      cellSize: opts.cellSize ?? undefined,
      mirrorAxis: opts.mirrorAxis ?? 'X',
    },
  }, [copy.buffer]);

  return p;
}
