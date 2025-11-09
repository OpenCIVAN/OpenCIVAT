// src/index.js — minimal, working build with hotspot preview + LLM fallback

// ----- VTK imports -----
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// ----- Collab (optional; safe if server not running) -----
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ----- Our modules -----
import { computeStatsJSON } from './ml/computeStats.js';
import { askLLM_WebLLM } from './llm/askWebLLM.js';
import { applyFindings } from './ui/applyFindings.js';

// ----- UI panel -----
import controlPanel from './controller.html';

// ---------- Simple logger ----------
let logDiv;
function log(msg) {
  console.log(msg);
  if (!logDiv) return;
  const p = document.createElement('div');
  p.style.fontFamily = 'monospace';
  p.style.fontSize = '11px';
  p.style.color = '#ddd';
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ---------- VTK setup ----------
const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({ background: [0, 0, 0] });
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

const mapper = vtkMapper.newInstance();
// make point colors actually appear
mapper.setScalarVisibility(true);
mapper.setColorModeToDirectScalars();
mapper.setScalarModeToUsePointFieldData();

const actor = vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);

const reader = vtkXMLPolyDataReader.newInstance();

// ---------- Collab (safe no-op if server absent) ----------
const ydoc = new Y.Doc();
try {
  new WebsocketProvider('ws://localhost:1234', 'vtk-room', ydoc);
} catch { /* ignore */ }

// ---------- UI wiring ----------
fullScreenRenderer.addController(controlPanel);

const repSel   = document.querySelector('.representations');
const fileIn   = document.getElementById('fileInput');
const btnStats = document.getElementById('btn-compute-stats');
const statsBox = document.getElementById('stats-json');
const btnLLM   = document.getElementById('btn-ask-llm');
const llmBox   = document.getElementById('llm-json');

// logger panel
logDiv = document.createElement('div');
Object.assign(logDiv.style, {
  position: 'fixed', right: '10px', top: '10px',
  width: '380px', maxHeight: '420px', overflowY: 'auto',
  background: 'rgba(0,0,0,0.75)', padding: '8px',
  border: '1px solid #333', borderRadius: '8px', zIndex: 1000,
});
document.body.appendChild(logDiv);
log('Ready. Load a .vtp to start.');

// FPS badge
const fps = document.createElement('div');
Object.assign(fps.style, {
  position: 'fixed', left: '10px', top: '6px',
  color: '#0f0', fontFamily: 'monospace', fontSize: '13px',
  zIndex: 1000, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '6px'
});
document.body.appendChild(fps);
let fc = 0, t0 = performance.now();
function tick() {
  fc++;
  const t1 = performance.now();
  if (t1 - t0 > 1000) { fps.textContent = `FPS: ${fc}`; fc = 0; t0 = t1; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- Helpers ----------
function updatePoly(buffer) {
  reader.parseAsArrayBuffer(buffer);
  const poly = reader.getOutputData(0);
  mapper.setInputData(poly);
  renderer.resetCamera(); renderWindow.render();

  const n = poly.getPoints().getNumberOfPoints();
  const b = poly.getBounds();
  log(`Loaded VTP: ${n.toLocaleString()} points`);
  log(`Bounds X[${b[0].toFixed(2)}, ${b[1].toFixed(2)}] Y[${b[2].toFixed(2)}, ${b[3].toFixed(2)}] Z[${b[4].toFixed(2)}, ${b[5].toFixed(2)}]`);
}

function setSolidColor(polyData, rgb=[0.1,0.6,0.9]) {
  const n = polyData.getPoints().getNumberOfPoints();
  const colors = new Float32Array(n*3);
  for (let i=0;i<n;i++){ colors[i*3]=rgb[0]; colors[i*3+1]=rgb[1]; colors[i*3+2]=rgb[2]; }
  polyData.getPointData().setScalars(
    vtkDataArray.newInstance({ name:'BaseColor', numberOfComponents:3, values: colors })
  );
  polyData.modified();
  renderWindow.render();
}

function previewHotspots(polyData, hotspot) {
  const n = polyData.getPoints().getNumberOfPoints();
  const colors = new Float32Array(n * 3);

  // base dark gray
  for (let i = 0; i < n; i++) {
    colors[i*3+0] = 0.18;
    colors[i*3+1] = 0.18;
    colors[i*3+2] = 0.18;
  }

  // density => RED
  (hotspot?.density || []).forEach((idx) => {
    if (idx>=0 && idx<n) { colors[idx*3+0] = 1; colors[idx*3+1] = 0.15; colors[idx*3+2] = 0.15; }
  });
  // curvature => GREEN
  (hotspot?.curvature || []).forEach((idx) => {
    if (idx>=0 && idx<n) { colors[idx*3+0] = 0.2; colors[idx*3+1] = 1; colors[idx*3+2] = 0.2; }
  });
  // symmetry => BLUE
  (hotspot?.symmetry || []).forEach((idx) => {
    if (idx>=0 && idx<n) { colors[idx*3+0] = 0.2; colors[idx*3+1] = 0.2; colors[idx*3+2] = 1; }
  });

  polyData.getPointData().setScalars(
    vtkDataArray.newInstance({ name: 'PreviewHotspots', numberOfComponents: 3, values: colors })
  );
  polyData.modified();
}

// ---------- Events ----------
repSel?.addEventListener('change', (e) => {
  const v = Number(e.target.value);
  actor.getProperty().setRepresentation(v);
  renderWindow.render();
});

fileIn?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    updatePoly(fr.result);
    const poly = reader.getOutputData(0);
    setSolidColor(poly); // initial blue so you see something immediately
  };
  fr.readAsArrayBuffer(f);
});

let lastStats = null;

btnStats?.addEventListener('click', async () => {
  try {
    const poly = reader.getOutputData(0);
    if (!poly) { alert('Load a .vtp first'); return; }
    log('Compute Stats: started (Web Worker)…');

    const result = await computeStatsJSON(poly, { maxPoints: 30000, mirrorAxis: 'X' }, (p) => {
      log(`Progress: ${p.toFixed(1)}%`);
    });

    lastStats = {
      counts: result.summary.counts,
      bounds: result.summary.bounds,
      percentiles: result.summary.percentiles,
      hotspots: result.hotspot
    };

    statsBox.value = JSON.stringify(lastStats, null, 2);

    // Show immediate, strong preview
    previewHotspots(poly, lastStats.hotspots);
    renderWindow.render();
    log('Compute Stats: done. Preview colored (red=density, green=curvature, blue=symmetry).');
  } catch (err) {
    log(`Compute Stats ERROR: ${err?.message || err}`);
    statsBox.value = '{}';
  }
});

btnLLM?.addEventListener('click', async () => {
  try {
    if (!lastStats) {
      try { lastStats = JSON.parse(statsBox.value || '{}'); } catch {}
    }
    if (!lastStats?.counts) { alert('Run Compute Stats first'); return; }

    log('LLM: loading model (first time may take 30–90s)…');
    let findings = await askLLM_WebLLM(lastStats);

    // Fallback if the model returns nothing
    if (!findings || !Array.isArray(findings.findings) || findings.findings.length === 0) {
      const hs = lastStats?.hotspots || {};
      const take = (arr) => (Array.isArray(arr) ? arr.slice(0, 2000) : []); // cap to keep it fast
      findings = {
        findings: [
          { type: 'anomaly', signal: 'density',   regionHint: 'top1% density',   confidence: 0.6, indices: take(hs.density) },
          { type: 'anomaly', signal: 'curvature', regionHint: 'top1% curvature', confidence: 0.6, indices: take(hs.curvature) },
          { type: 'anomaly', signal: 'symmetry',  regionHint: 'top1% asymmetry', confidence: 0.6, indices: take(hs.symmetry) },
        ]
      };
      log('LLM returned empty; applied fallback highlights from hotspots.');
    }

    llmBox.value = JSON.stringify(findings, null, 2);

const poly = reader.getOutputData(0);
applyFindings(poly, findings.findings || []);
renderWindow.render();
log('LLM: highlights applied.');

// If overlay markers were created, show them
if (window.__highlightActors__) {
  for (const a of window.__highlightActors__) {
    renderer.addActor(a);
  }
  renderer.resetCameraClippingRange();
  renderWindow.render();
  log(`Added ${window.__highlightActors__.length} visual markers.`);
}
  } catch (err) {
    log(`LLM ERROR: ${err?.message || err}`);
    llmBox.value = '{"findings": []}';
  }
});

log('UI wired. Choose a .vtp → Compute Stats → Analyze with LLM.');
