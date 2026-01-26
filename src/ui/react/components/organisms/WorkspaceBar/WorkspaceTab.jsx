/**
 * @file WorkspaceTab.jsx
 * @description Individual workspace tab with badges for changes, breakout, and presence.
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@UI/react/components/atoms';

const WorkspaceTab = memo(function WorkspaceTab({
    workspace,
    isActive,
    onSelect,
}) {
    return (
        <button
            className={`workspace-bar__tab ${isActive ? 'workspace-bar__tab--active' : ''}`}
            onClick={() => onSelect(workspace.id)}
        >
            <Icon name="layers" size={12} className="workspace-bar__tab-icon" />
            <span className="workspace-bar__tab-name">{workspace.name}</span>

            {/* Unsaved changes badge */}
            {workspace.hasChanges && (
                <span className="workspace-bar__badge workspace-bar__badge--changes" title="Unsaved changes" />
            )}

            {/* Active breakout badge */}
            {workspace.hasBreakout && (
                <span className="workspace-bar__badge workspace-bar__badge--breakout" title="Has active breakout">
                    <Icon name="gitBranch" size={9} />
                    <span>{workspace.breakoutUsers}</span>
                </span>
            )}

            {/* Users viewing badge */}
            {workspace.usersViewing > 0 && (
                <span className="workspace-bar__badge workspace-bar__badge--presence" title="Users viewing this workspace">
                    <Icon name="users" size={9} />
                    <span>{workspace.usersViewing}</span>
                </span>
            )}
        </button>
    );
});

WorkspaceTab.propTypes = {
    workspace: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        usersViewing: PropTypes.number,
        hasChanges: PropTypes.bool,
        hasBreakout: PropTypes.bool,
        breakoutUsers: PropTypes.number,
    }).isRequired,
    isActive: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
};

export { WorkspaceTab };
export default WorkspaceTab;
