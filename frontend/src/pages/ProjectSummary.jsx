import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { log, showToast } from '../utils/logger';

export default function ProjectSummary() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'closed'
    const [expandedProjects, setExpandedProjects] = useState({});

    useEffect(() => {
        fetchSummaryData();
    }, []);

    const fetchSummaryData = async () => {
        setLoading(true);
        try {
            const data = await api.get('/projects/summary');
            setProjects(data || []);
        } catch (error) {
            log.error('ProjectSummary', 'Failed to fetch project summary data', error);
            showToast('Failed to load project summary.');
        }
        setLoading(false);
    };

    const toggleExpand = (projectId) => {
        setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    };

    const isProjectActive = (status) => {
        const lower = (status || '').toLowerCase();
        return !['completed', 'closed', 'cancelled'].includes(lower);
    };

    const activeList = projects.filter(p => isProjectActive(p.status));
    const closedList = projects.filter(p => !isProjectActive(p.status));

    const displayedProjects = activeTab === 'active' ? activeList : closedList;

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Corporate Project Summary...</div>;
    }

    return (
        <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>Project Overview Directory</h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('active')}
                    style={{
                        background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: activeTab === 'active' ? 'bold' : 'normal',
                        color: activeTab === 'active' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 1rem',
                        borderBottom: activeTab === 'active' ? '2px solid var(--primary)' : 'none'
                    }}
                >
                    Active Projects ({activeList.length})
                </button>
                <button 
                    onClick={() => setActiveTab('closed')}
                    style={{
                        background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: activeTab === 'closed' ? 'bold' : 'normal',
                        color: activeTab === 'closed' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 1rem',
                        borderBottom: activeTab === 'closed' ? '2px solid var(--primary)' : 'none'
                    }}
                >
                    Closed / Completed ({closedList.length})
                </button>
            </div>

            {/* Project List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {displayedProjects.length === 0 && (
                     <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                         No projects found in this category.
                     </div>
                )}
                {displayedProjects.map(project => {
                    const isExpanded = expandedProjects[project.id] !== false; // Default expanded
                    const pmName = project.pm_user ? `${project.pm_user.first_name || ''} ${project.pm_user.last_name || ''}`.trim() || project.pm_user.username : 'Unassigned';
                    
                    return (
                        <div key={project.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-panel)', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            {/* Header */}
                            <div 
                                onClick={() => toggleExpand(project.id)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--bg-dark)', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                            >
                                <div>
                                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', padding: '0.2rem 0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '4px' }}>
                                            {project.project_unique_id || `P-${project.id}`}
                                        </span>
                                        {project.name}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        <span><strong>PM:</strong> {pmName}</span>
                                        <span><strong>Due:</strong> {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'TBD'}</span>
                                        <span><strong>Status:</strong> {project.status}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>
                                    {isExpanded ? '🔽' : '▶️'}
                                </div>
                            </div>
                            
                            {/* Body */}
                            {isExpanded && (
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Project Description</h4>
                                        <p style={{ margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                            {project.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {project.milestones && project.milestones.length > 0 ? (
                                        <div>
                                            <h4 style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Milestones & Tasks</h4>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {project.milestones.map(milestone => (
                                                    <div key={milestone.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-main)' }}>
                                                        {/* Milestone Header */}
                                                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.05)', borderBottom: milestone.tasks?.length > 0 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{milestone.name}</strong>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                <span style={{ marginRight: '1rem' }}>Due: {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'TBD'}</span>
                                                                <span style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-dark)', borderRadius: '4px' }}>{milestone.is_completed ? 'Completed' : 'Active'}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Tasks under Milestone */}
                                                        {milestone.tasks && milestone.tasks.length > 0 ? (
                                                            <div style={{ padding: '0.5rem 1rem' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                                    <thead>
                                                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                                                            <th style={{ padding: '0.5rem', width: '40%' }}>Task</th>
                                                                            <th style={{ padding: '0.5rem', width: '20%' }}>Assigned To</th>
                                                                            <th style={{ padding: '0.5rem', width: '20%' }}>Due Date</th>
                                                                            <th style={{ padding: '0.5rem', width: '20%' }}>Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {milestone.tasks.map(task => (
                                                                                <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                    <td style={{ padding: '0.5rem', color: 'var(--text-main)' }}>{task.description || "Untitled Task"}</td>
                                                                                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{task.assigned_to ? task.assigned_to.username : 'Unassigned'}</td>
                                                                                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'TBD'}</td>
                                                                                    <td style={{ padding: '0.5rem' }}>
                                                                                        <span style={{ padding: '0.1rem 0.4rem', fontSize: '0.8rem', background: 'var(--bg-dark)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                                                                            {task.status}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tasks in this milestone.</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            No milestones have been defined for this project yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
