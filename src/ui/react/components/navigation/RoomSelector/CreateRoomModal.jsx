// src/ui/react/components/navigation/RoomSelector/CreateRoomModal.jsx
// Simple modal for creating breakout rooms
// TODO: Style this modal properly later

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * CreateRoomModal - Basic modal for creating a breakout room
 * TODO: Style this modal to match the design system
 */
export function CreateRoomModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Room name is required');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await onCreate(name.trim(), description.trim(), isPublic);
        } catch (err) {
            setError(err.message || 'Failed to create room');
            setLoading(false);
        }
    }, [name, description, isPublic, onCreate]);

    return (
        <div className="create-room-modal__backdrop" onClick={onClose}>
            <div
                className="create-room-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="create-room-modal__header">
                    <h3>Create Breakout Room</h3>
                    <button
                        className="create-room-modal__close"
                        onClick={onClose}
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="create-room-modal__field">
                        <label htmlFor="room-name">Room Name</label>
                        <input
                            id="room-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Analysis Team"
                            autoFocus
                        />
                    </div>

                    <div className="create-room-modal__field">
                        <label htmlFor="room-description">Description (optional)</label>
                        <input
                            id="room-description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description..."
                        />
                    </div>

                    <div className="create-room-modal__field create-room-modal__field--checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            Public room (anyone can join)
                        </label>
                    </div>

                    {error && (
                        <div className="create-room-modal__error">
                            {error}
                        </div>
                    )}

                    <div className="create-room-modal__actions">
                        <button
                            type="button"
                            className="create-room-modal__btn create-room-modal__btn--secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-room-modal__btn create-room-modal__btn--primary"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateRoomModal;