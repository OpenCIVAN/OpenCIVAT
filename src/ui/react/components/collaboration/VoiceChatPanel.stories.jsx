// src/ui/react/components/collaboration/VoiceChatPanel.stories.jsx
import React, { useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";

export default {
    title: "Collaboration/VoiceChatPanel",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ width: "300px", background: "#0a0a0f", padding: "16px" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK COMPONENT (without external dependencies)
// =============================================================================

const MockVoiceChatPanel = ({
    roomName = "default-analytics-room",
    initialConnected = false,
    initialMuted = true,
}) => {
    const [isConnected, setIsConnected] = useState(initialConnected);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(initialMuted);

    const handleToggleVoice = async () => {
        if (!isConnected) {
            setIsConnecting(true);
            // Simulate connection delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setIsConnected(true);
            setIsConnecting(false);
        } else {
            setIsConnected(false);
        }
    };

    const handleToggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <div
            style={{
                padding: "10px",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
                border: "1px solid #333",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #444",
                }}
            >
                <h4
                    style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        color: "#e0e0e0",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <Mic size={14} /> Voice Chat
                </h4>
            </div>

            {/* Room Name */}
            <div
                style={{
                    marginBottom: "10px",
                    fontSize: "11px",
                    color: "#666",
                    textAlign: "center",
                }}
            >
                Room: {roomName}
            </div>

            {/* Connection Status */}
            <div
                style={{
                    marginBottom: "10px",
                    padding: "8px",
                    backgroundColor: isConnected ? "rgba(76, 175, 80, 0.15)" : "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "3px",
                    fontSize: "12px",
                    textAlign: "center",
                    color: isConnected ? "#81C784" : "#999",
                }}
            >
                {isConnecting ? (
                    <span>🔄 Connecting...</span>
                ) : isConnected ? (
                    isMuted ? (
                        <span>🔇 Connected (Muted)</span>
                    ) : (
                        <span>🎤 Connected (Unmuted)</span>
                    )
                ) : (
                    <span>⭕ Not connected</span>
                )}
            </div>

            {/* Connect/Disconnect Button */}
            <button
                onClick={handleToggleVoice}
                disabled={isConnecting}
                style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "8px",
                    backgroundColor: isConnected ? "#f44336" : "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: isConnecting ? "not-allowed" : "pointer",
                    opacity: isConnecting ? 0.6 : 1,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                }}
            >
                {isConnecting ? (
                    "Connecting..."
                ) : isConnected ? (
                    <>
                        <PhoneOff size={16} /> Leave Voice Chat
                    </>
                ) : (
                    <>
                        <Phone size={16} /> Join Voice Chat
                    </>
                )}
            </button>

            {/* Mute/Unmute Button */}
            {isConnected && (
                <button
                    onClick={handleToggleMute}
                    style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: isMuted ? "#ff9800" : "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                    }}
                >
                    {isMuted ? (
                        <>
                            <MicOff size={16} /> Unmute (Press M)
                        </>
                    ) : (
                        <>
                            <Mic size={16} /> Mute (Press M)
                        </>
                    )}
                </button>
            )}

            {/* Help text */}
            <div
                style={{
                    marginTop: "10px",
                    fontSize: "11px",
                    color: "#666",
                    textAlign: "center",
                }}
            >
                {isConnected ? "Press M to toggle mute" : "Click to join voice chat"}
            </div>
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Disconnected = {
    render: () => <MockVoiceChatPanel initialConnected={false} />,
};

export const ConnectedMuted = {
    render: () => <MockVoiceChatPanel initialConnected={true} initialMuted={true} />,
};

export const ConnectedUnmuted = {
    render: () => <MockVoiceChatPanel initialConnected={true} initialMuted={false} />,
};

export const CustomRoomName = {
    render: () => <MockVoiceChatPanel roomName="data-science-team" />,
};

export const Interactive = {
    render: () => (
        <div>
            <MockVoiceChatPanel roomName="interactive-demo" />
            <div
                style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "#1a1a1a",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#808080",
                }}
            >
                <strong style={{ color: "#e0e0e0" }}>Interactive Demo</strong>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: "16px" }}>
                    <li>Click "Join Voice Chat" to connect</li>
                    <li>Toggle mute with the button or M key</li>
                    <li>Click "Leave Voice Chat" to disconnect</li>
                </ul>
            </div>
        </div>
    ),
};

// =============================================================================
// PARTICIPANT LIST PREVIEW
// =============================================================================

export const WithParticipants = {
    render: () => (
        <div
            style={{
                padding: "10px",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
                border: "1px solid #333",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #444",
                }}
            >
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>
                    🎤 Voice Chat
                </h4>
                <span style={{ fontSize: "11px", color: "#4CAF50" }}>● Connected</span>
            </div>

            {/* Participants */}
            <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#808080", marginBottom: "8px" }}>
                    In this call (3)
                </div>
                {[
                    { name: "Alice (You)", speaking: true, muted: false },
                    { name: "Bob", speaking: false, muted: true },
                    { name: "Carol", speaking: false, muted: false },
                ].map((participant, index) => (
                    <div
                        key={index}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 8px",
                            background: participant.speaking ? "rgba(76, 175, 80, 0.1)" : "transparent",
                            borderRadius: "4px",
                            marginBottom: "4px",
                            border: participant.speaking ? "1px solid rgba(76, 175, 80, 0.3)" : "1px solid transparent",
                        }}
                    >
                        <div
                            style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: ["#4CAF50", "#2196F3", "#FF9800"][index],
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "10px",
                                fontWeight: "600",
                            }}
                        >
                            {participant.name[0]}
                        </div>
                        <span style={{ flex: 1, fontSize: "12px", color: "#e0e0e0" }}>
                            {participant.name}
                        </span>
                        {participant.muted ? (
                            <MicOff size={14} color="#808080" />
                        ) : participant.speaking ? (
                            <Volume2 size={14} color="#4CAF50" />
                        ) : (
                            <Mic size={14} color="#808080" />
                        )}
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    style={{
                        flex: 1,
                        padding: "8px",
                        background: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                    }}
                >
                    <Mic size={14} /> Mute
                </button>
                <button
                    style={{
                        flex: 1,
                        padding: "8px",
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                    }}
                >
                    <PhoneOff size={14} /> Leave
                </button>
            </div>
        </div>
    ),
};