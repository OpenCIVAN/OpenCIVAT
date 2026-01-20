/**
 * @file SettingsTab.jsx
 * @description Settings tab for the right panel.
 * Displays user preferences, project info, admin settings, and danger zone.
 *
 * @example
 * <SettingsTab workspaceId="ws-1" projectId="project-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    ResizableSection,
    ResizableSectionsContainer,
    useSectionStates,
} from '@UI/react/components/organisms/ResizableSections';
import { useSettingsTab } from './hooks/useSettingsTab';
import { YourPreferences } from './sections/YourPreferences';
import { VRSettings } from './sections/VRSettings';
import { ProjectInfo } from './sections/ProjectInfo';
import { AdminSettings } from './sections/AdminSettings';
import { DangerZone } from './sections/DangerZone';
import './SettingsTab.scss';

/**
 * @typedef {Object} SettingsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {string} [projectId] - Current project ID
 */

/**
 * Settings tab panel content component.
 * Headless wrapper for SettingsTab that manages its own state.
 *
 * @param {SettingsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered panel content
 */
export function SettingsPanelContent({ workspaceId, projectId }) {
    const settingsState = useSettingsTab(projectId);
    return <SettingsTab {...settingsState} workspaceId={workspaceId} />;
}

/**
 * @typedef {Object} SettingsTabInternalProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Object} project - Project data
 * @property {string} userRole - Current user's role
 * @property {Object} roleConfig - Role configuration
 * @property {boolean} isAdmin - Whether user is admin or owner
 * @property {boolean} isOwner - Whether user is owner
 * @property {Object} preferences - User preferences
 * @property {Function} updatePreferences - Preference update handler
 * @property {boolean} loading - Loading state
 */

/**
 * Settings tab component.
 * Displays settings sections based on user role.
 *
 * @param {SettingsTabInternalProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function SettingsTab({
    workspaceId,
    project,
    userRole,
    roleConfig,
    isAdmin,
    isOwner,
    preferences,
    updatePreferences,
    loading,
}) {
    // Section states for resizable sections
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates({
        preferences: { expanded: true, flexGrow: 2 },
        vr: { expanded: true, flexGrow: 1 },
        project: { expanded: true, flexGrow: 1 },
        admin: { expanded: true, flexGrow: 1 },
        danger: { expanded: false, flexGrow: 1 },
    });

    if (loading) {
        return (
            <div className="settings-tab settings-tab--loading">
                <div className="panel-header panel-header--indigo">
                    <Icon name="settings" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Settings</span>
                </div>
                <div className="settings-tab__loader">
                    <Icon name="loader" size={24} className="spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="settings-tab">
            {/* Panel Header */}
            <div className="panel-header panel-header--indigo">
                <Icon name="settings" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Settings</span>
                <div className="panel-header__spacer" />
                <span className="panel-header__count">{userRole}</span>
            </div>

            <ResizableSectionsContainer
                className="settings-tab__sections"
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                <ResizableSection
                    id="preferences"
                    icon="user"
                    label="Your Preferences"
                    color="blue"
                >
                    <YourPreferences
                        preferences={preferences}
                        onChange={updatePreferences}
                    />
                </ResizableSection>

                <ResizableSection
                    id="vr"
                    icon="glasses"
                    label="VR Settings"
                    color="purple"
                >
                    <VRSettings />
                </ResizableSection>

                <ResizableSection
                    id="project"
                    icon="building"
                    label="Project Info"
                    color="teal"
                >
                    <ProjectInfo project={project} />
                </ResizableSection>

                {isAdmin && (
                    <ResizableSection
                        id="admin"
                        icon="settings"
                        label="Admin Settings"
                        color="amber"
                    >
                        <AdminSettings
                            project={project}
                            roleConfig={roleConfig}
                        />
                    </ResizableSection>
                )}

                {isOwner && (
                    <ResizableSection
                        id="danger"
                        icon="alertTriangle"
                        label="Danger Zone"
                        color="red"
                    >
                        <DangerZone project={project} />
                    </ResizableSection>
                )}
            </ResizableSectionsContainer>
        </div>
    );
}

export default SettingsTab;