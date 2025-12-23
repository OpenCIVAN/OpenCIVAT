/**
 * @file ProjectSelector.jsx
 * @description Dropdown for selecting/creating projects.
 */

import React, { useState, useMemo } from 'react';
import { Folder, ChevronDown, Plus, Search, Clock } from 'lucide-react';
import { Dropdown } from '@UI/react/components/common/Dropdown';

/**
 * Project selector dropdown component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.currentProject] - Currently selected project
 * @param {Array} [props.projects] - List of available projects
 * @param {Function} [props.onSelect] - Callback when project is selected
 * @param {Function} [props.onCreate] - Callback to create new project
 */
export function ProjectSelector({
    currentProject,
    projects = [],
    onSelect,
    onCreate,
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const recentProjects = useMemo(() => {
        return projects
            .filter((p) => p.lastAccessed)
            .sort(
                (a, b) =>
                    new Date(b.lastAccessed) - new Date(a.lastAccessed)
            )
            .slice(0, 5);
    }, [projects]);

    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        const term = searchTerm.toLowerCase();
        return projects.filter((p) =>
            p.name.toLowerCase().includes(term)
        );
    }, [projects, searchTerm]);

    const handleSelect = (project) => {
        onSelect?.(project);
    };

    const handleCreate = () => {
        onCreate?.();
    };

    return (
        <Dropdown
            trigger={
                <button className="project-selector__trigger" type="button">
                    <Folder size={16} />
                    <span className="project-selector__name">
                        {currentProject?.name || 'Select Project'}
                    </span>
                    <ChevronDown size={14} />
                </button>
            }
            placement="bottom-start"
        >
            <div className="project-selector__dropdown">
                {/* Search */}
                <div className="project-selector__search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Recent Projects */}
                {!searchTerm && recentProjects.length > 0 && (
                    <div className="project-selector__section">
                        <div className="project-selector__section-header">
                            <Clock size={12} />
                            Recent
                        </div>
                        {recentProjects.map((project) => (
                            <button
                                key={project.id}
                                className={`project-selector__item ${project.id === currentProject?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => handleSelect(project)}
                                type="button"
                            >
                                {project.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* All Projects */}
                <div className="project-selector__section">
                    <div className="project-selector__section-header">
                        All Projects
                    </div>
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <button
                                key={project.id}
                                className={`project-selector__item ${project.id === currentProject?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => handleSelect(project)}
                                type="button"
                            >
                                {project.name}
                            </button>
                        ))
                    ) : (
                        <div className="project-selector__empty">
                            {searchTerm
                                ? 'No projects found'
                                : 'No projects yet'}
                        </div>
                    )}
                </div>

                {/* Create New */}
                <div className="project-selector__footer">
                    <button
                        className="project-selector__create"
                        onClick={handleCreate}
                        type="button"
                    >
                        <Plus size={14} />
                        New Project
                    </button>
                </div>
            </div>
        </Dropdown>
    );
}

export default ProjectSelector;