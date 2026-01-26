/**
 * @file WorkspaceBar.jsx
 * @description Workspace-level bar below the RoomHeader (Canvas Tabs Bar).
 *
 * Layout: WORKSPACE (tabs + [+]) | MODE | POPOUTS (if any) | BREAKOUTS (if any)
 * Height: 58px total (18px section labels + 40px content)
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';
import { WorkspaceTab } from './WorkspaceTab';
import { ModeToggle } from './ModeToggle';
import { PopoutManager } from './PopoutManager';
import { BreakoutManager } from './BreakoutManager';
import { useManagerDropdowns } from './WorkspaceBar.logic';
import './WorkspaceBar.scss';

const WorkspaceBar = memo(function WorkspaceBar({
    workspaces = [],
    activeWorkspaceId,
    onSelectWorkspace,
    onCreateWorkspace,
    popouts = [],
    breakouts = [],
    canvasMode = 'tile',
    onModeChange,
    onJoinBreakout,
    onCreateBreakout,
    onFocusPopout,
    onClosePopout,
    onTileAllPopouts,
    onCloseAllPopouts,
    // Layout props (injected by ThreeEdgeLayout cloneElement)
    style,
    ...layoutProps
}) {
    const hasPopouts = popouts.length > 0;
    const hasBreakouts = breakouts.length > 0;

    const {
        showPopoutDropdown,
        showBreakoutDropdown,
        togglePopout,
        toggleBreakout,
        closeAll,
    } = useManagerDropdowns();

    return (
        <div className="workspace-bar" style={style}>
            {/* Section Labels Row */}
            <div className="workspace-bar__labels">
                <span className="workspace-bar__label workspace-bar__label--workspace">Workspace</span>
                <span className="workspace-bar__label-spacer" />
                <span className="workspace-bar__label-divider" />
                <span className="workspace-bar__label workspace-bar__label--mode">Mode</span>
                {hasPopouts && (
                    <>
                        <span className="workspace-bar__label-divider" />
                        <span className="workspace-bar__label workspace-bar__label--popouts">Popouts</span>
                    </>
                )}
                {hasBreakouts && (
                    <>
                        <span className="workspace-bar__label-divider" />
                        <span className="workspace-bar__label workspace-bar__label--breakouts">Breakouts</span>
                    </>
                )}
            </div>

            {/* Content Row */}
            <div className="workspace-bar__content">
                {/* Workspace Tabs */}
                <div className="workspace-bar__tabs">
                    {workspaces.map(ws => (
                        <WorkspaceTab
                            key={ws.id}
                            workspace={ws}
                            isActive={ws.id === activeWorkspaceId}
                            onSelect={onSelectWorkspace}
                        />
                    ))}

                    {/* New Workspace Button */}
                    <button
                        className="workspace-bar__new-btn"
                        onClick={onCreateWorkspace}
                        title="New Workspace"
                    >
                        <Icon name="plus" size={14} />
                    </button>
                </div>

                <div className="workspace-bar__spacer" />
                <div className="workspace-bar__divider" />

                {/* Mode Toggle */}
                <ModeToggle
                    canvasMode={canvasMode}
                    onModeChange={onModeChange}
                />

                {/* Popout Manager (conditional) */}
                {hasPopouts && (
                    <>
                        <div className="workspace-bar__divider" />
                        <PopoutManager
                            popouts={popouts}
                            showDropdown={showPopoutDropdown}
                            onToggleDropdown={togglePopout}
                            onCloseDropdown={closeAll}
                            onFocusPopout={onFocusPopout}
                            onClosePopout={onClosePopout}
                            onTileAll={onTileAllPopouts}
                            onCloseAll={onCloseAllPopouts}
                        />
                    </>
                )}

                {/* Breakout Manager (conditional) */}
                {hasBreakouts && (
                    <>
                        <div className="workspace-bar__divider" />
                        <BreakoutManager
                            breakouts={breakouts}
                            showDropdown={showBreakoutDropdown}
                            onToggleDropdown={toggleBreakout}
                            onCloseDropdown={closeAll}
                            onJoinBreakout={onJoinBreakout}
                            onCreateBreakout={onCreateBreakout}
                        />
                    </>
                )}
            </div>
        </div>
    );
});

WorkspaceBar.propTypes = {
    workspaces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersViewing: PropTypes.number,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    })),
    activeWorkspaceId: PropTypes.string,
    onSelectWorkspace: PropTypes.func,
    onCreateWorkspace: PropTypes.func,
    popouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string,
    })),
    breakouts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersInVoice: PropTypes.number,
    })),
    canvasMode: PropTypes.oneOf(['tile', 'tabs']),
    onModeChange: PropTypes.func,
    onJoinBreakout: PropTypes.func,
    onCreateBreakout: PropTypes.func,
    onFocusPopout: PropTypes.func,
    onClosePopout: PropTypes.func,
    onTileAllPopouts: PropTypes.func,
    onCloseAllPopouts: PropTypes.func,
    style: PropTypes.object,
};

export { WorkspaceBar };
export default WorkspaceBar;
