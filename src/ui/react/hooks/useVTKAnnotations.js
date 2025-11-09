// src/ui/react/hooks/useVTKAnnotations.js
// Custom hook for annotation system
// Bridges React UI with collaborative annotation system

import { useState, useEffect, useCallback } from "react";

import { annotationRenderer } from "@Collaboration/annotations/annotationRenderer.js";
import { annotationModeState } from "@Collaboration/annotations/annotationState.js";
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";

/**
 * Hook to manage annotations and annotation mode
 * Returns: {
 *   annotations,
 *   createAnnotation,
 *   deleteAnnotation,
 *   updateAnnotation,
 *   selectAnnotation,
 *   selectedAnnotation,
 *   isAnnotationMode,
 *   toggleAnnotationMode
 * }
 */
export function useVTKAnnotations() {
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(
    annotationModeState.isActive()
  );

  // Listen for annotation changes
  useEffect(() => {
    console.log("🔗 useVTKAnnotations hook initialized");

    // Make sure annotation system is initialized
    if (!annotationSystem.annotations) {
      annotationSystem.initialize();
    }

    // Update annotations list
    const updateAnnotations = () => {
      const allAnnotations = annotationSystem.getAllAnnotations();
      setAnnotations(allAnnotations);
      console.log(`📍 Annotations updated: ${allAnnotations.length} total`);
    };

    // Listen for changes
    annotationSystem.onAnnotationChange((action, annotation) => {
      console.log(`📍 Annotation ${action}:`, annotation.id);
      updateAnnotations();
    });

    // Initial load
    updateAnnotations();

    // Periodic sync (in case of missed events)
    const interval = setInterval(updateAnnotations, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for annotation mode changes
  useEffect(() => {
    const handleModeChange = () => {
      setIsAnnotationMode(annotationModeState.isActive());
    };

    annotationModeState.onChange(handleModeChange);

    return () => {
      annotationModeState.offChange(handleModeChange);
    };
  }, []);

  // Create a new annotation
  const createAnnotation = useCallback((position, text, type = "note") => {
    try {
      const annotation = annotationSystem.createAnnotation(
        position,
        text,
        type
      );
      console.log("✅ Annotation created:", annotation.id);
      return annotation;
    } catch (error) {
      console.error("❌ Failed to create annotation:", error);
      return null;
    }
  }, []);

  // Delete an annotation
  const deleteAnnotation = useCallback(
    (annotationId) => {
      try {
        annotationSystem.deleteAnnotation(annotationId);
        console.log("✅ Annotation deleted:", annotationId);

        if (selectedAnnotation === annotationId) {
          setSelectedAnnotation(null);
        }
      } catch (error) {
        console.error("❌ Failed to delete annotation:", error);
      }
    },
    [selectedAnnotation]
  );

  // Update an annotation
  const updateAnnotation = useCallback((annotationId, updates) => {
    try {
      annotationSystem.updateAnnotation(annotationId, updates);
      console.log("✅ Annotation updated:", annotationId);
    } catch (error) {
      console.error("❌ Failed to update annotation:", error);
    }
  }, []);

  // Select an annotation
  const selectAnnotation = useCallback((annotationId) => {
    setSelectedAnnotation(annotationId);
    annotationSystem.selectAnnotation(annotationId);

    // Highlight in 3D
    if (annotationRenderer.renderer) {
      annotationRenderer.highlightAnnotation(annotationId);
    }

    console.log("✅ Annotation selected:", annotationId);
  }, []);

  // Toggle annotation mode
  const toggleAnnotationMode = useCallback((type = "note") => {
    annotationModeState.toggle(type);
  }, []);

  return {
    annotations,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    selectAnnotation,
    selectedAnnotation,
    isAnnotationMode,
    toggleAnnotationMode,
  };
}
