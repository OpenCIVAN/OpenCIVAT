function buildGrid(points, cellSize) {
  const grid = new Map();
  const key = (ix, iy, iz) => `${ix},${iy},${iz}`;
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i], y = points[i + 1], z = points[i + 2];
    const ix = Math.floor(x / cellSize);
    const iy = Math.floor(y / cellSize);
    const iz = Math.floor(z / cellSize);
    const k = key(ix, iy, iz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i / 3);
  }
  return { grid, key };
}

function neighborsOf(idx, points, cellSize, grid, key) {
  const x = points[idx * 3], y = points[idx * 3 + 1], z = points[idx * 3 + 2];
  const ix = Math.floor(x / cellSize), iy = Math.floor(y / cellSize), iz = Math.floor(z / cellSize);
  const out = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++) {
        const arr = grid.get(key(ix + dx, iy + dy, iz + dz));
        if (arr) for (const j of arr) out.push(j);
      }
  return out;
}

function dist2(i, j, pts) {
  const ax = pts[i*3], ay = pts[i*3+1], az = pts[i*3+2];
  const bx = pts[j*3], by = pts[j*3+1], bz = pts[j*3+2];
  const dx = ax-bx, dy = ay-by, dz = az-bz;
  return dx*dx + dy*dy + dz*dz;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const i = Math.min(a.length-1, Math.max(0, Math.floor((p/100)*a.length)));
  return a[i];
}

// 🔥 FIX #3: adaptive hotspot selection instead of hard 99th percentile
function topHotIndices(arr) {
  const a = Array.from(arr).filter(v => Number.isFinite(v) && v > 0);
  if (!a.length) return [];

  // Large meshes → stricter (top ~1.5%)
  // Smaller meshes → looser (top ~5%)
  const thresholdPercentile = a.length > 50000 ? 98.5 : 95;
  const th = percentile(a, thresholdPercentile);

  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= th) out.push(i);
  }
  return out;
}

self.onmessage = async (e) => {
  const { pointsBuffer, numPoints, bbox, opts } = e.data;
  const points = new Float32Array(pointsBuffer);

  // 🔧 FIX #2: better step logic so we don't throw away too many points
  const maxPoints = opts.maxPoints ?? 30000;

  // rough step estimate
  let step = Math.floor(numPoints / maxPoints);

  // never skip too much: clamp between 1 and 4
  if (step < 1) step = 1;
  if (step > 4) step = 4;

  const processed = Math.ceil(numPoints / step);

  const extent = ((bbox[1]-bbox[0]) + (bbox[3]-bbox[2]) + (bbox[5]-bbox[4])) / 3;
  const cellSize = opts.cellSize ?? Math.max(extent / 100, 1e-6);
  const { grid, key } = buildGrid(points, cellSize);

  const density = new Float32Array(numPoints);
  const curvature = new Float32Array(numPoints);
  const symmetry = new Float32Array(numPoints);
  const axis = (opts.mirrorAxis || 'X').toUpperCase();

  let done = 0;
  for (let i = 0; i < numPoints; i += step) {
    const neigh = neighborsOf(i, points, cellSize, grid, key);

    let d = 0, sum = 0;
    for (const j of neigh) {
      if (j === i) continue;
      const d2 = dist2(i, j, points);
      if (d2 <= cellSize*cellSize*1.5) { d++; sum += Math.sqrt(d2); }
    }
    density[i] = d;

    if (d > 1) {
      const mean = sum / d;
      let varSum = 0;
      for (const j of neigh) {
        if (j === i) continue;
        const dd = Math.sqrt(dist2(i, j, points)) - mean;
        varSum += dd*dd;
      }
      curvature[i] = varSum / d;
    }

    let mx = points[i*3], my = points[i*3+1], mz = points[i*3+2];
    if (axis==='X') mx = -mx; else if (axis==='Y') my = -my; else mz = -mz;
    const mix = Math.floor(mx / cellSize), miy = Math.floor(my / cellSize), miz = Math.floor(mz / cellSize);
    let best = Infinity;
    for (let dx=-1; dx<=1; dx++)
      for (let dy=-1; dy<=1; dy++)
        for (let dz=-1; dz<=1; dz++) {
          const arr = grid.get(`${mix+dx},${miy+dy},${miz+dz}`);
          if (!arr) continue;
          for (const j of arr) {
            const dx2 = mx - points[j*3], dy2 = my - points[j*3+1], dz2 = mz - points[j*3+2];
            const d2 = dx2*dx2 + dy2*dy2 + dz2*dz2;
            if (d2 < best) best = d2;
          }
        }
    symmetry[i] = Math.sqrt(best);

    done++;
    if (done % 2000 === 0) {
      self.postMessage({ type:'progress', value: (done/processed)*100 });
      await new Promise(r=>setTimeout(r));
    }
  }

  const densVals = Array.from(density).filter(v=>v>0);
  const curvVals = Array.from(curvature).filter(v=>v>0);
  const symmVals = Array.from(symmetry).filter(v=>Number.isFinite(v));

  const summary = {
    counts: { numPoints, processed, step },
    bounds: { x:[bbox[0],bbox[1]], y:[bbox[2],bbox[3]], z:[bbox[4],bbox[5]] },
    percentiles: {
      density:   { p50: percentile(densVals, 50), p90: percentile(densVals, 90), p99: percentile(densVals, 99) },
      curvature: { p50: percentile(curvVals, 50), p90: percentile(curvVals, 90), p99: percentile(curvVals, 99) },
      symmetry:  { p50: percentile(symmVals, 50), p90: percentile(symmVals, 90), p99: percentile(symmVals, 99) },
    },
  };

  // use adaptive hotspot picker
  const hotspot = {
    density:   topHotIndices(density),
    curvature: topHotIndices(curvature),
    symmetry:  topHotIndices(symmetry),
  };

  self.postMessage({ type:'done', result: { summary, hotspot, perPoint:{ density, curvature, symmetry } } });
};
