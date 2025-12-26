/**
 * HeaderSection Stories
 *
 * Storybook stories demonstrating CollapsibleHeaderSection,
 * DismissibleCard, and helper components in both modes.
 */
import React, { useState } from 'react';
import { ModeProvider, useMode } from '../ModeContext';
import { CollapsibleHeaderSection } from './components/CollapsibleHeaderSection';
import { DismissibleCard } from './components/DismissibleCard';
import { StatusDot, InfoRow, StatBadge } from './components';

export default {
    title: 'Adaptive/HeaderSection',
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'dark',
            values: [{ name: 'dark', value: '#0a0a0f' }],
        },
    },
};

// Mode indicator helper
const ModeDisplay = () => {
    const { mode, tokens } = useMode();
    return (
        <div style={{
            color: '#888',
            fontSize: 12,
            marginTop: 16,
            padding: 8,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 4,
        }}>
            Mode: <strong>{mode}</strong> |
            Button Height: {tokens.buttonHeight}px |
            Padding: {tokens.padding}px
        </div>
    );
};

// Decorators
const DesktopDecorator = (Story) => (
    <ModeProvider defaultMode="desktop">
        <div style={{ width: 300, padding: 16 }}>
            <Story />
            <ModeDisplay />
        </div>
    </ModeProvider>
);

const VRDecorator = (Story) => (
    <ModeProvider defaultMode="vr">
        <div style={{ width: 400, padding: 24 }}>
            <Story />
            <ModeDisplay />
        </div>
    </ModeProvider>
);

// =============================================================================
// COLLAPSIBLE HEADER SECTION
// =============================================================================

export const CollapsibleDesktop = {
    decorators: [DesktopDecorator],
    render: () => (
        <CollapsibleHeaderSection icon="wifi" title="Voice Status" color="green">
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                Connected to Main Room
            </div>
        </CollapsibleHeaderSection>
    ),
};

export const CollapsibleVR = {
    decorators: [VRDecorator],
    render: () => (
        <CollapsibleHeaderSection icon="wifi" title="Voice Status" color="green">
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
                Connected to Main Room
            </div>
        </CollapsibleHeaderSection>
    ),
};

export const CollapsibleCollapsed = {
    decorators: [DesktopDecorator],
    render: () => (
        <CollapsibleHeaderSection icon="mapPin" title="Location" color="purple" defaultExpanded={false}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                This content is hidden by default
            </div>
        </CollapsibleHeaderSection>
    ),
};

export const ColorVariants = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{ width: 300, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CollapsibleHeaderSection icon="wifi" title="Green" color="green">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Green variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="code" title="Purple" color="purple">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Purple variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="alertTriangle" title="Amber" color="amber">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Amber variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="x" title="Red" color="red">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Red variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="info" title="Blue" color="blue">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Blue variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="heart" title="Pink" color="pink">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Pink variant</div>
                </CollapsibleHeaderSection>
                <CollapsibleHeaderSection icon="droplet" title="Teal" color="teal">
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Teal variant</div>
                </CollapsibleHeaderSection>
            </div>
        </ModeProvider>
    ),
};

export const ModeComparison = {
    render: () => (
        <div style={{ display: 'flex', gap: 48 }}>
            <ModeProvider defaultMode="desktop">
                <div style={{ width: 300 }}>
                    <div style={{ color: '#888', marginBottom: 16 }}>Desktop Mode</div>
                    <CollapsibleHeaderSection icon="mapPin" title="Current Location" color="purple">
                        <InfoRow icon="layers" label="Project" value="Brain Study" color="#a78bfa" />
                        <InfoRow icon="doorOpen" label="Room" value="Main Room" color="#a78bfa" />
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                            <StatBadge icon="users">8 online</StatBadge>
                            <StatBadge icon="mic" color="#4ade80">3 in voice</StatBadge>
                        </div>
                    </CollapsibleHeaderSection>
                    <ModeDisplay />
                </div>
            </ModeProvider>

            <ModeProvider defaultMode="vr">
                <div style={{ width: 400 }}>
                    <div style={{ color: '#888', marginBottom: 16 }}>VR Mode</div>
                    <CollapsibleHeaderSection icon="mapPin" title="Current Location" color="purple">
                        <InfoRow icon="layers" label="Project" value="Brain Study" color="#a78bfa" />
                        <InfoRow icon="doorOpen" label="Room" value="Main Room" color="#a78bfa" />
                        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                            <StatBadge icon="users">8 online</StatBadge>
                            <StatBadge icon="mic" color="#4ade80">3 in voice</StatBadge>
                        </div>
                    </CollapsibleHeaderSection>
                    <ModeDisplay />
                </div>
            </ModeProvider>
        </div>
    ),
};

// =============================================================================
// DISMISSIBLE CARD
// =============================================================================

export const DismissibleDesktop = {
    decorators: [DesktopDecorator],
    render: () => {
        const [dismissed, setDismissed] = useState(false);
        if (dismissed) {
            return (
                <div style={{ padding: 12, background: 'rgba(74,222,128,0.06)', borderRadius: 8, color: '#4ade80', fontSize: 12 }}>
                    All caught up!
                </div>
            );
        }
        return (
            <DismissibleCard icon="sparkles" title="Catch Up" color="amber" onDismiss={() => setDismissed(true)}>
                <div style={{ fontSize: 13 }}>
                    <strong>3 annotations</strong> added while you were away.
                </div>
            </DismissibleCard>
        );
    },
};

export const DismissibleVR = {
    decorators: [VRDecorator],
    render: () => (
        <DismissibleCard icon="sparkles" title="Catch Up" color="amber" onDismiss={() => { }}>
            <div style={{ fontSize: 16 }}>
                <strong>3 annotations</strong> added while you were away.
            </div>
        </DismissibleCard>
    ),
};

export const DismissibleColorVariants = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{ width: 300, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <DismissibleCard icon="check" title="Success" color="green" onDismiss={() => { }}>
                    <div>Operation completed successfully.</div>
                </DismissibleCard>
                <DismissibleCard icon="alertTriangle" title="Warning" color="amber" onDismiss={() => { }}>
                    <div>Please review the changes.</div>
                </DismissibleCard>
                <DismissibleCard icon="x" title="Error" color="red" onDismiss={() => { }}>
                    <div>Something went wrong.</div>
                </DismissibleCard>
                <DismissibleCard icon="info" title="Info" color="blue" onDismiss={() => { }}>
                    <div>Additional information available.</div>
                </DismissibleCard>
            </div>
        </ModeProvider>
    ),
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

export const StatusDots = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                <StatusDot color="#4ade80" />
                <StatusDot color="#4ade80" pulse />
                <StatusDot color="#f87171" />
                <StatusDot color="#fbbf24" pulse />
                <StatusDot color="#60a5fa" />
            </div>
        </ModeProvider>
    ),
};

export const InfoRows = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{ width: 280, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <InfoRow icon="layers" label="Project" value="Brain Study" color="#a78bfa" />
                <InfoRow icon="doorOpen" label="Room" value="Main Room" color="#a78bfa" />
                <InfoRow icon="users" label="Online" value="8 users" color="#4ade80" />
                <InfoRow label="Status" value="Connected" subtle />
            </div>
        </ModeProvider>
    ),
};

export const StatBadges = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{ padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <StatBadge icon="users">8 online</StatBadge>
                <StatBadge icon="mic" color="#4ade80">3 in voice</StatBadge>
                <StatBadge icon="messageSquare" color="#60a5fa">12 messages</StatBadge>
                <StatBadge icon="eye" color="#fbbf24">5 viewing</StatBadge>
            </div>
        </ModeProvider>
    ),
};

// =============================================================================
// FULL PANEL EXAMPLES
// =============================================================================

export const FullPanelDesktop = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{
                width: 300,
                height: 400,
                background: 'rgba(18, 18, 24, 0.95)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Voice</span>
                </div>
                <div style={{ padding: 8 }}>
                    <CollapsibleHeaderSection icon="wifi" title="Voice Status" color="green">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StatusDot color="#4ade80" pulse />
                            <span style={{ fontSize: 14, color: '#fff' }}>Main Room</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                            <StatBadge icon="users">3 in voice</StatBadge>
                        </div>
                    </CollapsibleHeaderSection>
                </div>
            </div>
        </ModeProvider>
    ),
};

export const FullPanelVR = {
    render: () => (
        <ModeProvider defaultMode="vr">
            <div style={{
                width: 420,
                height: 500,
                background: 'rgba(18, 18, 24, 0.95)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                    <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Voice</span>
                </div>
                <div style={{ padding: 12 }}>
                    <CollapsibleHeaderSection icon="wifi" title="Voice Status" color="green">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <StatusDot color="#4ade80" pulse />
                            <span style={{ fontSize: 18, color: '#fff' }}>Main Room</span>
                        </div>
                        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                            <StatBadge icon="users">3 in voice</StatBadge>
                        </div>
                    </CollapsibleHeaderSection>
                </div>
            </div>
        </ModeProvider>
    ),
};

export const ComplexPanelExample = {
    render: () => (
        <ModeProvider defaultMode="desktop">
            <div style={{
                width: 320,
                background: 'rgba(18, 18, 24, 0.95)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}>
                <DismissibleCard icon="sparkles" title="Catch Up" color="amber" onDismiss={() => { }}>
                    <div style={{ fontSize: 13 }}>
                        <strong>3 annotations</strong> added while you were away.
                    </div>
                </DismissibleCard>

                <CollapsibleHeaderSection icon="wifi" title="Voice Status" color="green">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <StatusDot color="#4ade80" pulse />
                        <span style={{ fontSize: 14, color: '#fff' }}>Main Room</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <StatBadge icon="users">3 in voice</StatBadge>
                        <StatBadge icon="mic" color="#4ade80">Unmuted</StatBadge>
                    </div>
                </CollapsibleHeaderSection>

                <CollapsibleHeaderSection icon="mapPin" title="Location" color="purple">
                    <InfoRow icon="layers" label="Project" value="Brain Study" color="#a78bfa" />
                    <InfoRow icon="doorOpen" label="Room" value="Main Room" color="#a78bfa" />
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        <StatBadge icon="users">8 online</StatBadge>
                    </div>
                </CollapsibleHeaderSection>
            </div>
        </ModeProvider>
    ),
};