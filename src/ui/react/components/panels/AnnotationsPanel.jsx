// src/ui/react/components/panels/AnnotationsPanel.jsx
// Enhanced with tooltips and better UX

import React, { useState } from "react";
import { MessageSquarePlus, Info, MapPin, MessageSquare, HelpCircle } from "lucide-react";

import { annotationModeState } from "@Collaboration/annotations/annotationState.js";
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import { useCurrentDataset } from "@UI/react/hooks/useCurrentDataset.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";

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

      <style jsx>{`
        .annotations-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 16px;
          gap: 16px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .help-button {
          padding: 6px;
          background: transparent;
          border: 1px solid #3a3a3a;
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .help-button:hover {
          background: #2a2a2a;
          color: #4CAF50;
          border-color: #4CAF50;
        }

        .help-box {
          padding: 12px;
          background: #1a2a1a;
          border: 1px solid #2a4a2a;
          border-radius: 6px;
          font-size: 13px;
          color: #c0c0c0;
        }

        .help-box strong {
          color: #4CAF50;
        }

        .help-box ol {
          margin: 8px 0 0 20px;
          padding: 0;
        }

        .help-box li {
          margin: 4px 0;
        }

        .create-annotation-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #4CAF50;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-annotation-button:hover:not(:disabled) {
          background: #45a049;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }

        .create-annotation-button:disabled {
          background: #3a3a3a;
          color: #666;
          cursor: not-allowed;
        }

        .dataset-context {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #2a2a2a;
          border-radius: 4px;
          font-size: 13px;
          color: #888;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 16px;
          color: #666;
          text-align: center;
        }

        .annotations-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-annotations {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          text-align: center;
        }

        .empty-annotations p {
          margin: 8px 0 0 0;
        }

        .empty-annotations .hint {
          font-size: 12px;
          color: #555;
        }

        .annotation-item {
          padding: 12px;
          background: #2a2a2a;
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          transition: border-color 0.2s;
        }

        .annotation-item:hover {
          border-color: #4a4a4a;
        }

        .annotation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .annotation-author {
          font-weight: 600;
          color: #4CAF50;
          font-size: 13px;
        }

        .annotation-time {
          font-size: 11px;
          color: #666;
        }

        .annotation-text {
          color: #e0e0e0;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .annotation-type-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #3a3a3a;
          border-radius: 3px;
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}