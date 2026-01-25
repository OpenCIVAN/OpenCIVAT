/**
 * @file Footer2.jsx
 * @description Shared canvas toolbar footer with ViewGroup selector and links.
 *
 * Features:
 * - ViewGroup selector with dropdown, search, settings
 * - Responsive links section (expanded/collapsed/minimal)
 * - Focus/Subset controls
 * - Universal actions (snapshot, reset)
 * - Type-specific tools
 * - VR mode button
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { Button, Icon, Tooltip } from '@UI/react/components/atoms';
import { DuplicationDialog } from '@UI/react/components/modals/DuplicationDialog';
import { ViewGroupSelector } from './components/ViewGroupSelector/ViewGroupSelector';
import { LinksSection } from './components/LinksSection/LinksSection';
import {
    useFooterLayout,
    useLinkStats,
    useLinkReminderToast,
    useDuplicationDialog,
    FOOTER_BREAKPOINTS,
} from './Footer2.logic';
import './Footer2.scss';

/**
 * Separator component
 */
const Separator = memo(function Separator() {
    return <div className="footer2__separator" />;
});

/**
 * Focus/Subset Section
 */
const FocusSubsetSection = memo(function FocusSubsetSection({
    isFocused,
    onToggleFocus,
    activeSubset,
    onOpenSubsetDropdown,
}) {
    return (
        <div className="footer2__section footer2__section--focus">
            <Tooltip content={isFocused ? 'Exit Focus Mode' : 'Focus View'} shortcut="F">
                <Button
                    variant={isFocused ? 'primary' : 'ghost'}
                    size="sm"
                    icon="maximize2"
                    onClick={onToggleFocus}
                    aria-pressed={isFocused}
                />
            </Tooltip>
            <Tooltip content="Data Subset">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="database"
                    onClick={onOpenSubsetDropdown}
                >
                    {activeSubset?.name || 'All'}
                </Button>
            </Tooltip>
        </div>
    );
});

FocusSubsetSection.propTypes = {
    isFocused: PropTypes.bool,
    onToggleFocus: PropTypes.func,
    activeSubset: PropTypes.object,
    onOpenSubsetDropdown: PropTypes.func,
};

/**
 * Universal Actions Section
 */
const UniversalActionsSection = memo(function UniversalActionsSection({
    onSnapshot,
    onResetView,
    showLabels,
}) {
    return (
        <div className="footer2__section footer2__section--universal">
            <Tooltip content="Take Snapshot" shortcut="Ctrl+S">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="camera"
                    onClick={onSnapshot}
                >
                    {showLabels && 'Snapshot'}
                </Button>
            </Tooltip>
            <Tooltip content="Reset View" shortcut="Home">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="rotateCcw"
                    onClick={onResetView}
                >
                    {showLabels && 'Reset'}
                </Button>
            </Tooltip>
        </div>
    );
});

UniversalActionsSection.propTypes = {
    onSnapshot: PropTypes.func,
    onResetView: PropTypes.func,
    showLabels: PropTypes.bool,
};

/**
 * VR Button
 */
const VRButton = memo(function VRButton({ isVRAvailable, isInVR, onToggleVR }) {
    if (!isVRAvailable) return null;

    return (
        <Tooltip content={isInVR ? 'Exit VR' : 'Enter VR'}>
            <Button
                variant={isInVR ? 'primary' : 'ghost'}
                size="sm"
                icon="glasses"
                onClick={onToggleVR}
                className="footer2__vr-button"
            >
                VR
            </Button>
        </Tooltip>
    );
});

VRButton.propTypes = {
    isVRAvailable: PropTypes.bool,
    isInVR: PropTypes.bool,
    onToggleVR: PropTypes.func,
};

/**
 * Link Reminder Toast
 */
const LinkReminderToast = memo(function LinkReminderToast({
    isVisible,
    linkCount,
    onDismiss,
    onDisableLinks,
}) {
    if (!isVisible) return null;

    return (
        <div className="footer2__link-reminder">
            <Icon name="link" size={16} />
            <div className="footer2__link-reminder-content">
                <div className="footer2__link-reminder-title">
                    This ViewGroup has active links
                </div>
                <div className="footer2__link-reminder-subtitle">
                    {linkCount} properties syncing with other views
                </div>
            </div>
            <div className="footer2__link-reminder-actions">
                <Button variant="ghost" size="sm" onClick={onDisableLinks}>
                    Disable Links
                </Button>
                <Button variant="primary" size="sm" onClick={onDismiss}>
                    Got it
                </Button>
            </div>
        </div>
    );
});

LinkReminderToast.propTypes = {
    isVisible: PropTypes.bool,
    linkCount: PropTypes.number,
    onDismiss: PropTypes.func,
    onDisableLinks: PropTypes.func,
};

/**
 * Footer2 - Main component
 */
const Footer2 = memo(function Footer2({
    // ViewGroup data
    viewGroups = [],
    activeViewGroupId,
    onSelectViewGroup,
    onCreateViewGroup,
    onUpdateViewGroup,
    onDeleteViewGroup,
    onDuplicateViewGroup,
    onGoToViewGroup,
    // View data
    activeViewType = 'vtk-volume',
    // Focus/Subset
    isFocused = false,
    onToggleFocus,
    activeSubset = null,
    onOpenSubsetDropdown,
    // Actions
    onSnapshot,
    onResetView,
    onOpenLayoutTab,
    onOpenLinkManager,
    // VR
    isVRAvailable = false,
    isInVR = false,
    onToggleVR,
    // Linking
    linkingService,
    // Sizing
    containerWidth = 900,
}) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(containerWidth);

    // Responsive layout
    const {
        mode,
        showLabels,
        showTypeSpecific,
        showUniversal,
        isMinimal,
        isCompact,
        isFull,
    } = useFooterLayout(width);

    // Link stats
    const { linkStats, totalActiveLinks, hasActiveLinks } = useLinkStats(
        activeViewGroupId,
        linkingService
    );

    // Link reminder
    const {
        showReminder,
        checkAndShowReminder,
        dismissReminder,
        disableLinksAndDismiss,
    } = useLinkReminderToast();

    // Duplication dialog
    const {
        isOpen: isDuplicationOpen,
        viewGroupToDuplicate,
        openDialog: openDuplicationDialog,
        closeDialog: closeDuplicationDialog,
        confirmDuplication,
    } = useDuplicationDialog();

    // Handle duplicate action - opens dialog if ViewGroup has links
    const handleDuplicateViewGroup = useCallback((viewGroup) => {
        const viewGroupStats = {};
        // Compute link stats for this specific ViewGroup
        if (linkingService) {
            const props = ['camera', 'filters', 'colorMaps', 'widgets', 'cursors', 'annotations'];
            props.forEach(prop => {
                const links = linkingService?.getLinksForProperty?.(viewGroup.id, prop) || [];
                viewGroupStats[prop] = { count: links.length };
            });
        }

        const hasLinks = Object.values(viewGroupStats).some(s => s?.count > 0);

        if (hasLinks) {
            // Open dialog to choose link handling
            openDuplicationDialog(viewGroup);
        } else {
            // No links, duplicate directly
            onDuplicateViewGroup?.(viewGroup.id, 'noLinks');
        }
    }, [linkingService, openDuplicationDialog, onDuplicateViewGroup]);

    // Handle duplication confirmation from dialog
    const handleDuplicationConfirm = useCallback((linkOption) => {
        if (viewGroupToDuplicate) {
            onDuplicateViewGroup?.(viewGroupToDuplicate.id, linkOption);
        }
    }, [viewGroupToDuplicate, onDuplicateViewGroup]);

    // Track container width
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setWidth(entry.contentRect.width);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Check for link reminder when ViewGroup changes
    useEffect(() => {
        if (activeViewGroupId && hasActiveLinks) {
            checkAndShowReminder(activeViewGroupId, hasActiveLinks);
        }
    }, [activeViewGroupId, hasActiveLinks, checkAndShowReminder]);

    // Get active ViewGroup
    const activeViewGroup = viewGroups.find(vg => vg.id === activeViewGroupId) || null;

    return (
        <div
            ref={containerRef}
            className={`footer2 footer2--${mode}`}
            style={{ minWidth: FOOTER_BREAKPOINTS.MIN_WIDTH }}
        >
            {/* Left Section */}
            <div className="footer2__left">
                {/* Focus/Subset */}
                {!isMinimal && (
                    <>
                        <FocusSubsetSection
                            isFocused={isFocused}
                            onToggleFocus={onToggleFocus}
                            activeSubset={activeSubset}
                            onOpenSubsetDropdown={onOpenSubsetDropdown}
                        />
                        <Separator />
                    </>
                )}

                {/* Universal Actions */}
                {showUniversal && (
                    <>
                        <UniversalActionsSection
                            onSnapshot={onSnapshot}
                            onResetView={onResetView}
                            showLabels={showLabels}
                        />
                        <Separator />
                    </>
                )}
            </div>

            {/* Center Section */}
            <div className="footer2__center">
                {/* ViewGroup Selector */}
                <ViewGroupSelector
                    viewGroups={viewGroups}
                    activeViewGroup={activeViewGroup}
                    mode={mode}
                    onSelectViewGroup={onSelectViewGroup}
                    onCreateViewGroup={onCreateViewGroup}
                    onUpdateViewGroup={onUpdateViewGroup}
                    onDeleteViewGroup={onDeleteViewGroup}
                    onDuplicateViewGroup={handleDuplicateViewGroup}
                    onGoToViewGroup={onGoToViewGroup}
                    onOpenLayoutTab={onOpenLayoutTab}
                />
            </div>

            {/* Right Section */}
            <div className="footer2__right">
                <Separator />

                {/* Links Section */}
                <LinksSection
                    mode={mode}
                    linkStats={linkStats}
                    totalActiveLinks={totalActiveLinks}
                    activeViewType={activeViewType}
                    onOpenLinkManager={onOpenLinkManager}
                />

                <Separator />

                {/* VR Button */}
                <VRButton
                    isVRAvailable={isVRAvailable}
                    isInVR={isInVR}
                    onToggleVR={onToggleVR}
                />
            </div>

            {/* Link Reminder Toast */}
            <LinkReminderToast
                isVisible={showReminder}
                linkCount={totalActiveLinks}
                onDismiss={dismissReminder}
                onDisableLinks={disableLinksAndDismiss}
            />

            {/* Duplication Dialog */}
            <DuplicationDialog
                isOpen={isDuplicationOpen}
                onClose={closeDuplicationDialog}
                viewGroup={viewGroupToDuplicate}
                linkStats={linkStats}
                onConfirm={handleDuplicationConfirm}
            />
        </div>
    );
});

Footer2.propTypes = {
    // ViewGroup data
    viewGroups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
        layoutId: PropTypes.string,
        views: PropTypes.arrayOf(PropTypes.string),
        linkedTo: PropTypes.string,
    })),
    activeViewGroupId: PropTypes.string,
    onSelectViewGroup: PropTypes.func,
    onCreateViewGroup: PropTypes.func,
    onUpdateViewGroup: PropTypes.func,
    onDeleteViewGroup: PropTypes.func,
    onDuplicateViewGroup: PropTypes.func,
    onGoToViewGroup: PropTypes.func,
    // View data
    activeViewType: PropTypes.string,
    // Focus/Subset
    isFocused: PropTypes.bool,
    onToggleFocus: PropTypes.func,
    activeSubset: PropTypes.object,
    onOpenSubsetDropdown: PropTypes.func,
    // Actions
    onSnapshot: PropTypes.func,
    onResetView: PropTypes.func,
    onOpenLayoutTab: PropTypes.func,
    onOpenLinkManager: PropTypes.func,
    // VR
    isVRAvailable: PropTypes.bool,
    isInVR: PropTypes.bool,
    onToggleVR: PropTypes.func,
    // Linking
    linkingService: PropTypes.object,
    // Sizing
    containerWidth: PropTypes.number,
};

export { Footer2 };
export default Footer2;
