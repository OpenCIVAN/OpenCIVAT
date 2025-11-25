import React, { useState, useEffect, useRef } from "react";
import { toast } from "@UI/react/store/toastStore.js";

export function AnnotationModal({ isOpen, onClose, onSubmit, position }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("note");
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!text.trim()) {
      toast.info("Please enter annotation text");
      return;
    }

    if (dontShowAgain) {
      localStorage.setItem("annotation_skip_instructions", "true");
    }

    onSubmit(text, type);
    setText("");
    setType("note");
    setDontShowAgain(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: "#2a2a2a",
        border: "2px solid #4CAF50",
        borderRadius: "8px",
        padding: "24px",
        maxWidth: "500px",
        width: "90%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <h3 style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: "#4CAF50"
          }}>
            📍 Create Annotation
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0 8px"
            }}
          >
            ×
          </button>
        </div>

        {/* Position Info */}
        {position && (
          <div style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "16px",
            fontFamily: "monospace"
          }}>
            Position: ({position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)})
          </div>
        )}

        {/* Type Selection */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            fontSize: "12px",
            color: "#aaa",
            marginBottom: "8px",
            fontWeight: "600"
          }}>
            TYPE
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { value: "note", label: "📝 Note", color: "#4CAF50", shape: "Sphere" },
              { value: "warning", label: "⚠️ Warning", color: "#FFA726", shape: "Cone" },
              { value: "info", label: "ℹ️ Info", color: "#2196F3", shape: "Cube" },
              { value: "measurement", label: "📏 Measurement", color: "#9C27B0", shape: "Cylinder" }
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                style={{
                  flex: "1 1 calc(50% - 4px)",
                  padding: "12px",
                  backgroundColor: type === t.value ? t.color + "22" : "#1a1a1a",
                  border: `2px solid ${type === t.value ? t.color : "#333"}`,
                  borderRadius: "6px",
                  color: "#e0e0e0",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <div>{t.label}</div>
                <div style={{ fontSize: "10px", color: "#666" }}>{t.shape}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            fontSize: "12px",
            color: "#aaa",
            marginBottom: "8px",
            fontWeight: "600"
          }}>
            ANNOTATION TEXT
          </div>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter annotation text... (Shift+Enter for new line)"
            style={{
              width: "100%",
              minHeight: "100px",
              padding: "12px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "#e0e0e0",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Don"t show again checkbox */}
        <div style={{
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <input
            type="checkbox"
            id="dontShowAgain"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <label
            htmlFor="dontShowAgain"
            style={{
              fontSize: "12px",
              color: "#999",
              cursor: "pointer"
            }}
          >
            Don"t show instructions next time
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#2a4a2a",
              border: "2px solid #4CAF50",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3a5a3a";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2a4a2a";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ✓ Create Annotation
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#1a1a1a",
              border: "2px solid #666",
              borderRadius: "6px",
              color: "#999",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2a2a2a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a1a";
            }}
          >
            Cancel
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div style={{
          marginTop: "16px",
          fontSize: "11px",
          color: "#666",
          textAlign: "center"
        }}>
          Press <kbd style={{ padding: "2px 6px", backgroundColor: "#333", borderRadius: "3px" }}>Enter</kbd> to create
          or <kbd style={{ padding: "2px 6px", backgroundColor: "#333", borderRadius: "3px" }}>Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
}