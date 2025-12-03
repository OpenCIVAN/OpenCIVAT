import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

/**
 * Color base mesh + overlay visible markers for highlighted indices.
 */
export function applyFindings(polyData, findings = []) {
  if (!polyData || !Array.isArray(findings) || findings.length === 0) return;

  const n = polyData.getPoints().getNumberOfPoints();
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3 + 0] = 0.25;
    colors[i * 3 + 1] = 0.25;
    colors[i * 3 + 2] = 0.25;
  }

  const overlayActors = [];

  for (const f of findings) {
    const tone =
      f.signal === 'density'   ? [1, 0, 0] :
      f.signal === 'curvature' ? [0, 1, 0] :
      f.signal === 'symmetry'  ? [0, 0.5, 1] :
                                 [1, 1, 0];

    // color affected vertices
    if (Array.isArray(f.indices)) {
      for (const idx of f.indices) {
        if (idx >= 0 && idx < n) {
          colors[idx * 3 + 0] = tone[0];
          colors[idx * 3 + 1] = tone[1];
          colors[idx * 3 + 2] = tone[2];
        }
      }

      // pick ~50 random indices to show as markers
      const sample = f.indices.slice(0, 50);
      const pts = polyData.getPoints().getData();

      for (const idx of sample) {
        const x = pts[idx * 3];
        const y = pts[idx * 3 + 1];
        const z = pts[idx * 3 + 2];

        const sphere = vtkSphereSource.newInstance({
          center: [x, y, z],
          radius: 1.5,
          thetaResolution: 12,
          phiResolution: 12,
        });

        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(sphere.getOutputPort());
        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColor(...tone);
        actor.getProperty().setOpacity(0.9);
        actor.getProperty().setDiffuse(0.8);
        actor.getProperty().setSpecular(0.3);
        overlayActors.push(actor);
      }
    }
  }

  // apply vertex colors to base mesh
  polyData.getPointData().setScalars(
    vtkDataArray.newInstance({
      name: 'LLM_Findings_Colors',
      numberOfComponents: 3,
      values: colors,
    })
  );
  polyData.modified();

  // expose overlay actors globally so index.js can render them
  window.__highlightActors__ = overlayActors;
}
export function renderFindingsUI(findings, summary, focusCallback) {
  // summary update
  document.getElementById("llm-summary").innerText = summary;

  const list = document.getElementById("findings-list");
  list.innerHTML = "";

  findings.forEach((f, i) => {
    const card = document.createElement("div");
    card.className = "finding-card";

    card.innerHTML = `
      <div class="finding-title">
        ${i + 1}. ${f.type} (${f.signal}) — ${(f.confidence * 100).toFixed(0)}%
      </div>
      <div class="finding-region">${f.regionHint}</div>
      <div class="finding-context">${f.context}</div>
    `;

    card.addEventListener("click", () => {
      focusCallback(f.indices);
      card.classList.add("selected-finding");
      setTimeout(() => card.classList.remove("selected-finding"), 600);
    });

    list.appendChild(card);
  });
}
