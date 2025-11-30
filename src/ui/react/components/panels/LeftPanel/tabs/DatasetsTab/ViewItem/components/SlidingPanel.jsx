/**
 * SlidingPanel Component (v3 Design)
 *
 * Glassmorphism frosted glass panel that slides out on hover.
 * Contains action buttons grouped by category, linked parent info,
 * and link property toggles with toggle-all functionality.
 *
 * Row 0: Tooltip Area
 * Row 1: Action Button Groups + Size Picker
 * Row 2: Linked Parent Info (conditional)
 * Row 3: Link Properties with Toggle All
 */

import { memo, useState, useMemo, useRef, useEffect } from 'react';
import {
    Folder,
    Globe,
    Save,
    Download,
    Share2,
    Plus,
    Link2,
    Unlink,
    GitBranch,
    ToggleLeft,
    ToggleRight,
    Camera,
    Sliders,
    Layout,
    Crosshair,
    Palette,
    Eye,
    Grid3x3,
} from 'lucide-react';
import { ButtonGroup } from './ButtonGroup';
import { LinkPropertyToggle } from './LinkPropertyToggle';
import './SlidingPanel.scss';

// Linkable properties configuration (v3 design)
const LINKABLE_PROPERTIES = [
    { id: 'camera', label: 'Camera', icon: Camera, desc: 'Sync view angle & zoom' },
    { id: 'filters', label: 'Filters', icon: Sliders, desc: 'Sync active filters' },
    { id: 'widgets', label: 'Widgets', icon: Layout, desc: 'Sync widget states' },
    { id: 'cursors', label: 'Cursors', icon: Crosshair, desc: 'Show collaborator cursors' },
    { id: 'colorMaps', label: 'Colors', icon: Palette, desc: 'Sync color mapping' },
    { id: 'annotationDisplay', label: 'Annot.', icon: Eye, desc: 'Sync annotation visibility' },
];

// Icon button component for action groups
const IconBtn = memo(function IconBtn({
    icon: Icon,
    hoverIcon: HoverIcon,
    isActive = false,
    activeColor,
    onClick,
    onHover,
    disabled = false,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const DisplayIcon = isHovered && HoverIcon ? HoverIcon : Icon;

    return (
        <button
            className={`sliding-panel__icon-btn ${isActive ? 'sliding-panel__icon-btn--active' : ''}`}
            data-active-color={isActive ? activeColor : undefined}
            onClick={onClick}
            onMouseEnter={() => {
                setIsHovered(true);
                onHover?.();
            }}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
            disabled={disabled}
        >
            <DisplayIcon size={12} />
        </button>
    );
});

// Size presets for compact picker
const SIZE_PRESETS = [
    { rows: 1, cols: 1 },
    { rows: 1, cols: 2 },
    { rows: 2, cols: 1 },
    { rows: 2, cols: 2 },
];

export const SlidingPanel = memo(function SlidingPanel({
    isVisible = false,
    view,
    linkProperties = {},
    linkedParent = null,
    linkTarget = null,
    linkedCount = 0,
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShareView,
    onSpawn,
    onConfigureLinks,
    onToggleAllLinks,
    onSizeChange,
    onLinkPropertyChange,
}) {
    const [tooltipText, setTooltipText] = useState(null);
    const [tooltipDesc, setTooltipDesc] = useState(null);
    const [linkTooltip, setLinkTooltip] = useState(null);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [showCustomSize, setShowCustomSize] = useState(false);
    const [customRows, setCustomRows] = useState(view?.size?.rows || 1);
    const [customCols, setCustomCols] = useState(view?.size?.cols || 1);
    const sizePickerRef = useRef(null);

    // Close size picker on click outside
    useEffect(() => {
        if (!showSizePicker) return;
        const handleClickOutside = (e) => {
            if (sizePickerRef.current && !sizePickerRef.current.contains(e.target)) {
                setShowSizePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSizePicker]);

    // Helper to set both tooltip text and description
    const setTooltip = (label, desc) => {
        setTooltipText(label);
        setTooltipDesc(desc);
    };

    // Handle custom size apply
    const handleCustomSizeApply = () => {
        const rows = Math.max(1, Math.min(5, customRows));
        const cols = Math.max(1, Math.min(5, customCols));
        onSizeChange?.({ rows, cols });
        setShowSizePicker(false);
        setShowCustomSize(false);
    };

    // Check if linking is enabled (has a link target)
    const linkingEnabled = linkTarget !== null;

    // Check link states
    const hasAnyLinks = useMemo(() => {
        return Object.values(linkProperties).some(link => link?.status === 'active');
    }, [linkProperties]);

    const allLinked = useMemo(() => {
        return LINKABLE_PROPERTIES.every(prop => linkProperties[prop.id]?.status === 'active');
    }, [linkProperties]);

    // Handle link property hover for tooltip
    const handleLinkHover = (property, link) => {
        if (property) {
            const status = link?.status === 'active' ? 'Linked' : link?.status === 'broken' ? 'Broken' : 'Unlinked';
            setLinkTooltip(`${property.label}: ${status} — ${property.desc}`);
        } else {
            setLinkTooltip(null);
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className="sliding-panel"
            style={{ '--view-color': view?.color || '#60a5fa' }}
        >
            {/* Row 0: Tooltip Area */}
            <div className="sliding-panel__tooltip">
                {linkTooltip ? (
                    <span className="sliding-panel__tooltip-label">{linkTooltip}</span>
                ) : tooltipText ? (
                    <>
                        <span className="sliding-panel__tooltip-label">{tooltipText}</span>
                        {tooltipDesc && <span className="sliding-panel__tooltip-desc">— {tooltipDesc}</span>}
                    </>
                ) : (
                    <span className="sliding-panel__tooltip-hint">Hover over actions for details</span>
                )}
            </div>

            {/* Row 1: Action Buttons */}
            <div className="sliding-panel__actions">
                {/* Save Views Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Folder}
                        isActive={view?.starredWorkspace}
                        activeColor="purple"
                        onClick={onStarWorkspace}
                        onHover={() => setTooltip('Workspace', 'Save to project workspace')}
                    />
                    <IconBtn
                        icon={Globe}
                        isActive={view?.starredPersonal}
                        activeColor="gold"
                        onClick={onStarPersonal}
                        onHover={() => setTooltip('Personal', 'Save to your global views')}
                    />
                </ButtonGroup>

                {/* State Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Save}
                        isActive={view?.hasSavedState}
                        activeColor="amber"
                        onClick={onSaveState}
                        onHover={() => setTooltip('Save State', 'Save filters, camera, widgets')}
                    />
                    <IconBtn
                        icon={Download}
                        onClick={onLoadState}
                        onHover={() => setTooltip('Load State', 'Apply saved preset')}
                    />
                </ButtonGroup>

                {/* Share Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Share2}
                        isActive={view?.isShared}
                        activeColor="pink"
                        onClick={onShareView}
                        onHover={() => setTooltip('Share', 'Share with collaborators')}
                    />
                </ButtonGroup>

                {/* Spawn/Link Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Plus}
                        onClick={onSpawn}
                        onHover={() => setTooltip('Spawn', 'Create linked copy')}
                    />
                    <IconBtn
                        icon={Link2}
                        hoverIcon={hasAnyLinks ? Unlink : Link2}
                        isActive={hasAnyLinks}
                        activeColor="teal"
                        onClick={onConfigureLinks}
                        onHover={() => setTooltip('Configure Links', hasAnyLinks ? `${linkedCount} linked` : 'Set link target')}
                    />
                </ButtonGroup>

                {/* Spacer to push size picker to right */}
                <div className="sliding-panel__spacer" />

                {/* Compact Size Picker */}
                <div className="sliding-panel__size-picker" ref={sizePickerRef}>
                    <button
                        className={`sliding-panel__size-btn ${showSizePicker ? 'sliding-panel__size-btn--active' : ''}`}
                        onClick={() => setShowSizePicker(!showSizePicker)}
                        onMouseEnter={() => setTooltip('Size', `${view?.size?.rows || 1}×${view?.size?.cols || 1}`)}
                    >
                        <Grid3x3 size={12} />
                        <span className="sliding-panel__size-label">
                            {view?.size?.rows || 1}×{view?.size?.cols || 1}
                        </span>
                    </button>
                    {showSizePicker && (
                        <div className="sliding-panel__size-dropdown">
                            <div className="sliding-panel__size-presets">
                                {SIZE_PRESETS.map((size) => {
                                    const isSelected = view?.size?.rows === size.rows && view?.size?.cols === size.cols;
                                    return (
                                        <button
                                            key={`${size.rows}x${size.cols}`}
                                            className={`sliding-panel__size-option ${isSelected ? 'sliding-panel__size-option--selected' : ''}`}
                                            onClick={() => {
                                                onSizeChange?.(size);
                                                setShowSizePicker(false);
                                            }}
                                        >
                                            {size.rows}×{size.cols}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                className={`sliding-panel__size-custom-toggle ${showCustomSize ? 'sliding-panel__size-custom-toggle--active' : ''}`}
                                onClick={() => setShowCustomSize(!showCustomSize)}
                            >
                                Custom
                            </button>
                            {showCustomSize && (
                                <div className="sliding-panel__size-custom">
                                    <div className="sliding-panel__size-custom-inputs">
                                        <input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={customRows}
                                            onChange={(e) => setCustomRows(parseInt(e.target.value) || 1)}
                                            className="sliding-panel__size-input"
                                        />
                                        <span className="sliding-panel__size-x">×</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={customCols}
                                            onChange={(e) => setCustomCols(parseInt(e.target.value) || 1)}
                                            className="sliding-panel__size-input"
                                        />
                                    </div>
                                    <button
                                        className="sliding-panel__size-apply"
                                        onClick={handleCustomSizeApply}
                                    >
                                        Apply
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Linked Parent Info (conditional) */}
            {linkedParent && (
                <div className="sliding-panel__linked-parent">
                    <GitBranch size={10} />
                    <span className="sliding-panel__linked-parent-label">Linked to:</span>
                    <span className="sliding-panel__linked-parent-name">{linkedParent.name}</span>
                </div>
            )}

            {/* Row 3: Link Properties */}
            <div className={`sliding-panel__link-row ${!linkingEnabled ? 'sliding-panel__link-row--disabled' : ''}`}>
                <span className="sliding-panel__link-label">Link:</span>

                {/* Toggle All */}
                <button
                    className={`sliding-panel__toggle-all ${allLinked ? 'sliding-panel__toggle-all--active' : ''}`}
                    onClick={() => onToggleAllLinks?.(!allLinked)}
                    disabled={!linkingEnabled}
                    onMouseEnter={() => setLinkTooltip(allLinked ? 'Unlink all properties' : 'Link all properties')}
                    onMouseLeave={() => setLinkTooltip(null)}
                >
                    {allLinked ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                </button>

                <div className="sliding-panel__link-divider" />

                {LINKABLE_PROPERTIES.map((prop) => (
                    <LinkPropertyToggle
                        key={prop.id}
                        property={prop}
                        link={linkProperties[prop.id]}
                        onToggle={(propId) => onLinkPropertyChange?.(propId, linkProperties[propId]?.status !== 'active')}
                        onHover={handleLinkHover}
                        disabled={!linkingEnabled}
                    />
                ))}
            </div>
        </div>
    );
});

export default SlidingPanel;