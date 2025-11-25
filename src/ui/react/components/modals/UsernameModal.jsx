// src/ui/react/components/modals/UsernameModal.jsx
// Username prompt modal with glassmorphism theme

import React, { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import "./UsernameModal.scss";

export function UsernameModal({ onSubmit }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a name");
      return;
    }

    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (trimmed.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className="username-modal__overlay">
      <div className="username-modal">
        {/* Logo */}
        <div className="username-modal__header">
          <div className="username-modal__logo">
            <User size={32} />
          </div>
          <h1 className="username-modal__title">CIA Web</h1>
          <p className="username-modal__subtitle">
            Collaborative Immersive Analytics
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="username-modal__form">
          <div className="username-modal__field">
            <label
              htmlFor="username-input"
              className="username-modal__label"
            >
              Enter your display name
            </label>
            <input
              ref={inputRef}
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Sarah Chen"
              maxLength={20}
              className={`username-modal__input ${error ? "username-modal__input--error" : ""}`}
            />
            {error && (
              <div className="username-modal__error">
                {error}
              </div>
            )}
          </div>

          <button type="submit" className="username-modal__submit">
            Enter Web App
          </button>
        </form>

        {/* Hint */}
        <div className="username-modal__hint">
          Your teammates will see this name
        </div>
      </div>
    </div>
  );
}

export default UsernameModal;