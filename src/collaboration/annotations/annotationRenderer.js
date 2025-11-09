// ----------------------------------------------------------------------------
// Annotation 3D Rendering (VTK.js version)
// ----------------------------------------------------------------------------

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkCubeSource from "@kitware/vtk.js/Filters/Sources/CubeSource";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";

import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { getSceneObjects } from "@Core/scene/sceneManager.js";

class AnnotationRenderer {
  constructor() {
    this.renderer = null;
    this.renderWindow = null;
    this.annotationActors = new Map(); // Maps annotationId -> actor
    this.actorToAnnotationId = new Map(); // Maps actor -> annotationId
    this.markerRadius = 0.05; // Default radius, adjustable
  }

  // Set the marker radius for all future annotations
  setMarkerRadius(radius) {
    this.markerRadius = radius;
    console.log("📍 Annotation marker radius set to:", radius);
  }

  // Get current marker radius
  getMarkerRadius() {
    return this.markerRadius;
  }

  initialize() {
    const { renderer, renderWindow } = getSceneObjects();

    if (!renderer || !renderWindow) {
      console.warn("Cannot initialize annotation renderer: scene not ready");
      return;
    }

    this.renderer = renderer;
    this.renderWindow = renderWindow;

    // Make sure annotation system is initialized first
    if (!annotationSystem.annotations) {
      annotationSystem.initialize();
    }

    // CRITICAL: Listen for annotation changes (add/delete)
    annotationSystem.onAnnotationChange((action, annotation) => {
      console.log(`📍 Annotation change: ${action}`, annotation);

      if (action === "added") {
        // Check if this annotation belongs to current dataset
        import("@Core/visualizationManager.js").then((module) => {
          const currentViz = module.visualizationManager.getCurrentDataset();
          const currentDatasetId = currentViz ? currentViz.datasetId : null;

          // Only render if it matches current dataset or no dataset filter
          if (!currentDatasetId || annotation.datasetId === currentDatasetId) {
            this.createAnnotationMarker(annotation);
          }
        });
      } else if (action === "deleted") {
        console.log(`📍 Attempting to remove marker: ${annotation.id}`);
        this.removeAnnotationMarker(annotation.id);
      }
    });

    // Load existing annotations (filtered by current dataset)
    import("@Core/visualizationManager.js").then((module) => {
      const currentViz = module.visualizationManager.getCurrentDataset();
      const currentDatasetId = currentViz ? currentViz.datasetId : null;

      const annotations = annotationSystem.getAllAnnotations();
      const relevantAnnotations = currentDatasetId
        ? annotations.filter((a) => a.datasetId === currentDatasetId)
        : annotations;

      console.log(
        `📍 Loading ${relevantAnnotations.length} annotations for dataset ${currentDatasetId}`
      );
      relevantAnnotations.forEach((annotation) => {
        this.createAnnotationMarker(annotation);
      });
    });

    console.log("📍 Annotation renderer initialized");
  }

  createAnnotationMarker(annotation) {
    console.log("📍 Creating annotation marker:", annotation.id);
    console.log("   Position:", annotation.position);
    console.log("   Text:", annotation.text);
    console.log("   User:", annotation.userName);
    console.log("   Type:", annotation.type);

    if (!this.renderer) {
      console.error("   ❌ No renderer available");
      return;
    }

    // Remove if already exists
    if (this.annotationActors.has(annotation.id)) {
      console.log("   Removing existing marker");
      this.removeAnnotationMarker(annotation.id);
    }

    try {
      // Create different shapes based on type
      let source;

      switch (annotation.type) {
        case "warning":
          // Cone for warnings
          source = vtkConeSource.newInstance({
            height: this.markerRadius * 2,
            radius: this.markerRadius,
            resolution: 8,
            center: [
              annotation.position.x,
              annotation.position.y,
              annotation.position.z,
            ],
            direction: [0, 1, 0],
          });
          break;

        case "info":
          // Cube for info
          source = vtkCubeSource.newInstance({
            xLength: this.markerRadius * 1.5,
            yLength: this.markerRadius * 1.5,
            zLength: this.markerRadius * 1.5,
            center: [
              annotation.position.x,
              annotation.position.y,
              annotation.position.z,
            ],
          });
          break;

        case "measurement":
          // Cylinder for measurements
          source = vtkCylinderSource.newInstance({
            height: this.markerRadius * 2,
            radius: this.markerRadius * 0.5,
            resolution: 16,
            center: [
              annotation.position.x,
              annotation.position.y,
              annotation.position.z,
            ],
          });
          break;

        default: // "note"
          // Sphere for notes (default)
          source = vtkSphereSource.newInstance({
            radius: this.markerRadius,
            thetaResolution: 16,
            phiResolution: 16,
            center: [
              annotation.position.x,
              annotation.position.y,
              annotation.position.z,
            ],
          });
      }

      console.log("   ✅ Source created:", annotation.type);

      // Create mapper
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(source.getOutputPort());
      console.log("   ✅ Mapper created");

      // Create actor
      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      console.log("   ✅ Actor created");

      // Use USER color (not type color)
      const color = this.hexToRgb(annotation.userColor || "#FF6B6B");
      actor.getProperty().setColor(color.r / 255, color.g / 255, color.b / 255);
      actor.getProperty().setOpacity(0.9); // Slightly more opaque
      console.log("   ✅ Color set (user color):", annotation.userColor);

      // Store the mapping
      this.annotationActors.set(annotation.id, actor);
      this.actorToAnnotationId.set(actor, annotation.id);

      // Add to renderer
      this.renderer.addActor(actor);
      console.log("   ✅ Actor added to renderer");

      // Trigger render
      this.renderWindow.render();
      console.log("   ✅ Render triggered");
      console.log("   Total annotation markers:", this.annotationActors.size);

      if (!annotation.visible) {
        actor.setVisibility(false);
        console.log("   ⚠️ Annotation hidden (visible=false)");
      }
    } catch (error) {
      console.error("   ❌ Error creating annotation marker:", error);
      console.error("   Stack:", error.stack);
    }
  }

  clearAnnotationsForDataset(datasetId) {
    console.log("📍 Clearing annotations for dataset:", datasetId);
    const toRemove = [];

    this.annotationActors.forEach((actor, annotationId) => {
      const annotation = annotationSystem.getAnnotation(annotationId);
      if (annotation && annotation.datasetId === datasetId) {
        toRemove.push(annotationId);
      }
    });

    toRemove.forEach((id) => this.removeAnnotationMarker(id));
    console.log(`   ✅ Cleared ${toRemove.length} markers`);
  }

  removeAnnotationMarker(annotationId) {
    console.log("📍 Removing annotation marker:", annotationId);
    const actor = this.annotationActors.get(annotationId);

    if (actor) {
      // Remove from renderer
      this.renderer.removeActor(actor);

      // Clean up the mapper and source
      const mapper = actor.getMapper();
      if (mapper) {
        const inputConnection = mapper.getInputConnection(0);
        if (inputConnection) {
          const source = inputConnection.filter;
          if (source && source.delete) {
            source.delete();
          }
        }
        mapper.delete();
      }

      // Delete the actor
      actor.delete();

      // Remove from both maps
      this.actorToAnnotationId.delete(actor);
      this.annotationActors.delete(annotationId);

      // Trigger render
      this.renderWindow.render();
      console.log(
        "   ✅ Marker removed, remaining:",
        this.annotationActors.size
      );
    } else {
      console.warn("   ⚠️ Marker not found:", annotationId);
    }
  }

  updateAnnotationVisibility(annotationId, visible) {
    const actor = this.annotationActors.get(annotationId);
    if (actor) {
      actor.setVisibility(visible);
      this.renderWindow.render();
      console.log(`📍 Annotation ${annotationId} visibility set to ${visible}`);
    }
  }

  getAnnotationIdFromActor(actor) {
    return this.actorToAnnotationId.get(actor);
  }

  highlightAnnotation(annotationId) {
    console.log("📍 Highlighting annotation:", annotationId);

    // Reset all markers to normal size
    this.annotationActors.forEach((actor, id) => {
      actor.setScale(1, 1, 1);
    });

    // Highlight selected
    const actor = this.annotationActors.get(annotationId);
    if (actor) {
      actor.setScale(1.5, 1.5, 1.5);
      console.log("   ✅ Annotation highlighted");

      // Optional: You could also change color temporarily
      // const property = actor.getProperty();
      // property.setColor(1, 1, 0); // Yellow highlight
    } else {
      console.warn("   ⚠️ Annotation not found:", annotationId);
    }

    this.renderWindow.render();
  }

  clearAllMarkers() {
    console.log("📍 Clearing all annotation markers");
    const count = this.annotationActors.size;

    this.annotationActors.forEach((actor, id) => {
      this.removeAnnotationMarker(id);
    });

    console.log(`   ✅ Cleared ${count} markers`);
  }

  // Get all annotation marker positions (for debugging)
  getAllMarkerPositions() {
    const positions = [];
    this.annotationActors.forEach((actor, id) => {
      const mapper = actor.getMapper();
      if (mapper) {
        const source = mapper.getInputConnection(0);
        if (source && source.filter) {
          const center = source.filter.getCenter();
          positions.push({ id, center });
        }
      }
    });
    return positions;
  }

  // Utility: Convert hex color to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 107, b: 107 }; // Default red
  }

  // Debug method to show renderer info
  debugInfo() {
    console.log("📍 === Annotation Renderer Debug Info ===");
    console.log("Renderer:", !!this.renderer);
    console.log("RenderWindow:", !!this.renderWindow);
    console.log("Marker radius:", this.markerRadius);
    console.log("Total markers:", this.annotationActors.size);
    console.log("Marker positions:", this.getAllMarkerPositions());

    if (this.renderer) {
      const actors = this.renderer.getActors();
      console.log("Total actors in scene:", actors.length);
    }
  }
}

export const annotationRenderer = new AnnotationRenderer();
