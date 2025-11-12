// src/ui/react/components/panels/AnnotationsPanel.jsx
// Enhanced with tooltips and better UX

import React, { useState } from "react";
import { MessageSquarePlus, Info, MapPin, MessageSquare, HelpCircle } from "lucide-react";

import { annotationModeState } from "@Collaboration/annotations/annotationState.js";
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";

import "./AnnotationsPanel.css";

export function AnnotationsPanel() {
  const datasets = useDatasets();
  const { datasetId } = useCurrentDataset();
  const [showHelp, setShowHelp] = useState(false);

  const currentDataset = datasets.find(d => d.id === datasetId);
  const annotations = currentDataset?.annotations || [];

  const handleCreateAnnotation = () => {
    annotationModeState.enable();
    console.log("📝 Annotation mode enabled - click on the model to place an annotation");
  };

  return (
    <div className="annotations-panel">
      {/* Header with inline help */}
      <div className="panel-header">
        <h3>Annotations</h3>
        <button
          className="help-button"
          onClick={() => setShowHelp(!showHelp)}
          title="Show help"
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Contextual help - only shows when toggled */}
      {showHelp && (
        <div className="help-box">
          <p>
            <strong>How to annotate:</strong>
          </p>
          <ol>
            <li>Click "Create Annotation" below</li>
            <li>Click anywhere on the 3D model</li>
            <li>Enter your annotation text</li>
            <li>Your team will see it in real-time</li>
          </ol>
        </div>
      )}

      {/* Create button with icon */}
      <button
        className="create-annotation-button"
        onClick={handleCreateAnnotation}
        disabled={!datasetId}
        title={datasetId ? "Click to start annotating" : "Load a dataset first"}
      >
        <MessageSquarePlus size={20} />
        <span>Create Annotation</span>
      </button>

      {/* Dataset context */}
      {datasetId ? (
        <div className="dataset-context">
          <MapPin size={16} />
          <span>{currentDataset?.name || "Current dataset"}</span>
        </div>
      ) : (
        <div className="empty-state">
          <Info size={24} />
          <p>Load a dataset to start annotating</p>
        </div>
      )}

      {/* Annotations list */}
      <div className="annotations-list">
        {annotations.length === 0 ? (
          <div className="empty-annotations">
            <MessageSquare size={32} />
            <p>No annotations yet</p>
            <p className="hint">Be the first to add one!</p>
          </div>
        ) : (
          annotations.map((annotation) => (
            <div key={annotation.id} className="annotation-item">
              <div className="annotation-header">
                <span className="annotation-author">{annotation.createdBy}</span>
                <span className="annotation-time">
                  {new Date(annotation.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="annotation-text">{annotation.text}</div>
              {annotation.type && (
                <span className="annotation-type-badge">{annotation.type}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}