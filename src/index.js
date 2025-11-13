// src/index.js — Final Clean Version with Compact Stats + Fallback

// ----- VTK imports -----
import '@kitware/vtk.js/favicon';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// ----- Collab (optional) -----
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// ----- Our modules -----
import { computeStatsJSON } from './ml/computeStats.js';
import { askLLM_WebLLM } from './llm/askWebLLM.js';
import { applyFindings } from './ui/applyFindings.js';

// ----- UI panel -----
import controlPanel from './controller.html';

// ---------- Logger ----------
let logDiv;
function log(msg) {
  console.log(msg);
  if (!logDiv) return;
  const d = document.createElement('div');
  d.style.color = '#ddd';
  d.style.fontFamily = 'monospace';
  d.style.fontSize = '11px';
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.appendChild(d);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// ---------- VTK setup ----------
const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({ background: [0,0,0] });
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

const mapper = vtkMapper.newInstance();
mapper.setScalarVisibility(true);
mapper.setColorModeToDirectScalars();
mapper.setScalarModeToUsePointFieldData();

const actor = vtkActor.newInstance();
actor.setMapper(mapper);
renderer.addActor(actor);
renderer.resetCamera();
renderer.resetCameraClippingRange();
renderWindow.render();
const reader = vtkXMLPolyDataReader.newInstance();
let currentMeshType = "unknown";



// ---------- UI wiring ----------
fullScreenRenderer.addController(controlPanel);

const repSel   = document.querySelector('.representations');
const fileIn   = document.getElementById('fileInput');
const btnStats = document.getElementById('btn-compute-stats');
const statsBox = document.getElementById('stats-json');
const btnLLM   = document.getElementById('btn-ask-llm');
const llmBox   = document.getElementById('llm-json');
const llmSummaryDiv = document.getElementById('llm-summary');

// Logger UI
logDiv = document.createElement('div');
Object.assign(logDiv.style, {
  position: 'fixed', right: '10px', top: '10px',
  width: '380px', maxHeight: '420px', overflowY: 'auto',
  background: 'rgba(0,0,0,0.75)', padding: '8px',
  border: '1px solid #333', borderRadius: '8px', zIndex: 1000,
});
document.body.appendChild(logDiv);

log("Ready. Load a .vtp to start.");

// FPS badge
const fps = document.createElement('div');
Object.assign(fps.style, {
  position: 'fixed', left: '10px', top: '6px',
  color: '#0f0', fontFamily: 'monospace', fontSize: '13px',
  background: 'rgba(0,0,0,0.6)', padding: '2px 6px',
  borderRadius: '6px', zIndex: 1000
});
document.body.appendChild(fps);
let fc = 0, t0 = performance.now();
function tick() {
  fc++;
  const t = performance.now();
  if (t - t0 > 1000) { fps.textContent = `FPS: ${fc}`; fc = 0; t0 = t; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- Helpers ----------
function updatePoly(buffer) {
  reader.parseAsArrayBuffer(buffer);
  const poly = reader.getOutputData(0);

  // --------------------------------------------
  // FIX 1: remove ALL actors (old mesh + highlights)
  // --------------------------------------------
  renderer.removeAllViewProps();
  if (window.__highlightActors__) {
    window.__highlightActors__.length = 0;
  }

  // --------------------------------------------
  // FIX 2: reset base actor & mapper cleanly
  // --------------------------------------------
  mapper.setInputData(poly);
  actor.setMapper(mapper);
  actor.getProperty().setRepresentation(2); // surface
  actor.getProperty().setColor(1, 1, 1);    // bright white

  renderer.addActor(actor);

  // --------------------------------------------
  // FIX 3: reset camera based on new model bounds
  // --------------------------------------------
  renderer.resetCamera();
  renderer.resetCameraClippingRange();

  // --------------------------------------------
  // FIX 4: improve lighting so dark models don't vanish
  // --------------------------------------------
  actor.getProperty().setAmbient(0.3);
  actor.getProperty().setDiffuse(0.6);
  actor.getProperty().setSpecular(0.1);

  renderWindow.render();

  // --------------------------------------------
  // DEBUG LOG
  // --------------------------------------------
  const n = poly.getPoints().getNumberOfPoints();
  const b = poly.getBounds();
  log(`Loaded VTP: ${n.toLocaleString()} points, bounds = ${b.map(x=>x.toFixed(2)).join(', ')}`);
}


function setSolidColor(poly, rgb=[0.1, 0.6, 0.9]) {
  const n = poly.getPoints().getNumberOfPoints();
  const arr = new Float32Array(n * 3);
  for (let i=0;i<n;i++) {
    arr[i*3] = rgb[0];
    arr[i*3+1] = rgb[1];
    arr[i*3+2] = rgb[2];
  }
  poly.getPointData().setScalars(
    vtkDataArray.newInstance({ name:'BaseColor', numberOfComponents:3, values: arr })
  );
  poly.modified();
  renderWindow.render();
}

function previewHotspots(poly, hotspot) {
  const n = poly.getPoints().getNumberOfPoints();
  const colors = new Float32Array(n * 3);

  // base gray
  for (let i=0;i<n;i++) {
    colors[i*3]   = 0.18;
    colors[i*3+1] = 0.18;
    colors[i*3+2] = 0.18;
  }

  // Highlight colors
  (hotspot?.density || []).forEach(i => { if (i<n) { colors[i*3]=1; colors[i*3+1]=0.15; colors[i*3+2]=0.15; }});
  (hotspot?.curvature || []).forEach(i => { if (i<n) { colors[i*3]=0.2; colors[i*3+1]=1; colors[i*3+2]=0.2; }});
  (hotspot?.symmetry || []).forEach(i => { if (i<n) { colors[i*3]=0.2; colors[i*3+1]=0.2; colors[i*3+2]=1; }});

  poly.getPointData().setScalars(
    vtkDataArray.newInstance({ name:'PreviewHotspots', numberOfComponents:3, values: colors })
  );
  poly.modified();
}

// ---------- Events ----------
repSel?.addEventListener('change', (e) => {
  actor.getProperty().setRepresentation(Number(e.target.value));
  renderWindow.render();
});

fileIn?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const name = f.name.toLowerCase();

  if (name.includes("bone") || name.includes("rib")) {
    currentMeshType = "ribcage";
  } 
  else if (name.includes("skull")) {
    currentMeshType = "skull";
  } 
  else if (name.includes("lungvessel") || name.includes("vessel")) {
    currentMeshType = "lung_vessels";
  } 
  else if (name.includes("lung")) {
    currentMeshType = "lungs";
  }
  else if (name.includes("ventricle")) {
    currentMeshType = "ventricles";
  } 
  else {
    currentMeshType = "unknown";
  }


  const fr = new FileReader();
  fr.onload = () => {
    updatePoly(fr.result);
    setSolidColor(reader.getOutputData(0));
  };
  fr.readAsArrayBuffer(f);
});

let lastStats = null;

// ---- Compute Stats
btnStats?.addEventListener('click', async () => {
  try {
    const poly = reader.getOutputData(0);
    if (!poly) return alert("Load a .vtp first.");

    log("Compute Stats: started…");

    const result = await computeStatsJSON(poly,
      { maxPoints: 150000, mirrorAxis: "X" },
      p => log(`Progress: ${p.toFixed(1)}%`)
    );

    lastStats = {
      counts: result.summary.counts,
      bounds: result.summary.bounds,
      percentiles: result.summary.percentiles,
      hotspots: result.hotspot
    };

    statsBox.value = JSON.stringify(lastStats, null, 2);

    previewHotspots(poly, lastStats.hotspots);
    renderWindow.render();

    log("Compute Stats complete.");
  } catch (err) {
    log(`Compute Stats ERROR: ${err.message}`);
    statsBox.value = "{}";
  }
});

// ---- Analyze with LLM
btnLLM?.addEventListener('click', async () => {
  try {
    if (!lastStats) {
      try { lastStats = JSON.parse(statsBox.value); }
      catch {}
    }
    if (!lastStats) return alert("Run Compute Stats first.");

    // Build compact stats (20 max)
    const shrink = arr => (Array.isArray(arr) ? arr.slice(0, 20) : []);

    const shrink10 = arr => (Array.isArray(arr) ? arr.slice(0, 10) : []);

    const b = lastStats.bounds;

    const compactStats = {
      meshType: currentMeshType,

      // Only the SIZE of bbox, not full arrays
      bboxSize: {
        x: Math.abs(b.x[1] - b.x[0]),
        y: Math.abs(b.y[1] - b.y[0]),
        z: Math.abs(b.z[1] - b.z[0]),
      },

      // Very small hotspot lists
      hotspots: {
        density:   shrink10(lastStats.hotspots.density),
        curvature: shrink10(lastStats.hotspots.curvature),
        symmetry:  shrink10(lastStats.hotspots.symmetry)
      }
    };

    log("LLM: loading model…");
    // ------------------------------------------
    // NON-ANATOMY DETECTOR
    // ------------------------------------------
    const dx = Math.abs(b.x[1] - b.x[0]);
    const dy = Math.abs(b.y[1] - b.y[0]);
    const dz = Math.abs(b.z[1] - b.z[0]);
    const ratioMax = Math.max(dx/dy, dy/dz, dx/dz);
    const ratioMin = Math.min(dx/dy, dy/dz, dx/dz);

    // If the shape is a sphere or simple blob → skip LLM
    const isSphere =
      ratioMax < 1.1 && ratioMin > 0.9 &&
      compactStats.hotspots.density.length < 10 &&
      compactStats.hotspots.curvature.length < 10 &&
      compactStats.hotspots.symmetry.length < 10;


    if (isSphere) {
      findings = [];
      summary = "The mesh is non-anatomical and shows no abnormalities.";
      llmBox.value = JSON.stringify({ findings, summary }, null, 2);
      llmSummaryDiv.textContent = summary;
      applyFindings(reader.getOutputData(0), []);
      renderWindow.render();
      return;
    }

    // ------------------------------------------
    // NORMAL LLM PROCESS BELOW
    // ------------------------------------------
    const llmOut = await askLLM_WebLLM(compactStats);

    // fallback if empty
    let findings = llmOut?.findings || [];
    let summary  = llmOut?.summary || "";

    if (findings.length === 0) {
      log("LLM returned empty — applying fallback.");
      const hs = lastStats.hotspots;

      findings = [
        {
          type: "anomaly",
          signal: "density",
          regionHint: "top 1% density",
          confidence: 0.6,
          indices: shrink(hs.density)
        },
        {
          type: "anomaly",
          signal: "curvature",
          regionHint: "top 1% curvature",
          confidence: 0.6,
          indices: shrink(hs.curvature)
        },
        {
          type: "anomaly",
          signal: "symmetry",
          regionHint: "top 1% asymmetry",
          confidence: 0.6,
          indices: shrink(hs.symmetry)
        }
      ];

      summary = "Automatic fallback summary based on hotspots.";
    }

    llmBox.value = JSON.stringify({ findings, summary }, null, 2);
    llmSummaryDiv.textContent = summary || "No summary.";

    const poly = reader.getOutputData(0);
    applyFindings(poly, findings);

    renderWindow.render();
    log("LLM: highlights applied.");
    renderer.removeAllViewProps();
    renderer.addActor(actor);

    if (window.__highlightActors__) {
      window.__highlightActors__.forEach(a => renderer.addActor(a));
      renderer.resetCameraClippingRange();
      renderWindow.render();
    }

  } catch (err) {
    log(`LLM ERROR: ${err.message}`);
    llmBox.value = '{"findings":[],"summary":""}';
    llmSummaryDiv.textContent = "LLM error.";
  }
});

log("UI ready. Load → Compute Stats → Analyze with LLM.");
