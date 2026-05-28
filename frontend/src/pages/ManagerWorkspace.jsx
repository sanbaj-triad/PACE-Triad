import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getNestedTeam } from '../utils/hierarchy';

const ManagerWorkspace = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [viewMode, setViewMode] = useState('direct'); // 'active_users', 'direct', 'nested', 'company'
    const [rawData, setRawData] = useState({ users: [], projects: [], milestones: [] });
    const [activeUsers, setActiveUsers] = useState([]);
    
    const [team, setTeam] = useState([]);
    const [projects, setProjects] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [ptoRequests, setPtoRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWorkspaceData = async () => {
            if (!user?.id) return;
            try {
                // Fetch all data in parallel
                const [usersData, projectsData, milestonesData, activeUsersData] = await Promise.all([
                    api.get('/users/'),
                    api.get('/projects/'),
                    api.get('/milestones/'),
                    api.get('/analytics/active-users')
                ]);

                setRawData({ users: usersData || [], projects: projectsData || [], milestones: milestonesData || [] });
                setActiveUsers(activeUsersData || []);

                const ptoStatuses = ['Pending'];
                if (user?.has_financial_access) ptoStatuses.push('Manager Approved');
                const ptoData = await Promise.all(
                    ptoStatuses.map(s => api.get(`/pto/requests?status=${encodeURIComponent(s)}`))
                );
                setPtoRequests(ptoData.flat());

            } catch (err) {
                console.error("Failed to load workspace data", err);
                setError("Failed to load your workspace data.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspaceData();
    }, [user?.id]);

    useEffect(() => {
        if (rawData.users.length === 0) return;

        // Compute dynamic roster based on the new hierarchical structure
        let evaluatedTeam = [];
        if (viewMode === 'direct') {
            evaluatedTeam = rawData.users.filter(u => u.manager_id === user.id);
        } else if (viewMode === 'nested') {
            evaluatedTeam = getNestedTeam(rawData.users, user.id);
        } else if (viewMode === 'company' && user.has_financial_access) {
            evaluatedTeam = rawData.users.filter(u => u.is_employee); // Financial Access can view global directory (Employees Only)
        }
        setTeam(evaluatedTeam);

        // Keep standard assignments for projects/milestones. 
        // Focus of hierarchical propagation currently targets user interaction / nested assignments.
        if (Array.isArray(rawData.projects)) {
            setProjects(rawData.projects.filter(p => 
                p.pm_id === user.id || p.customer_pm_id === user.id
            ).filter(p => p.status !== 'completed' && p.status !== 'archived'));
        }

        if (Array.isArray(rawData.milestones) && Array.isArray(rawData.projects)) {
            const myActive = rawData.milestones.filter(m => m.owner_id === user.id && !m.is_completed);
            const annotated = myActive.map(m => {
                const parentProj = rawData.projects.find(p => p.id === m.project_id);
                return {
                    ...m,
                    project_name: parentProj ? parentProj.name : 'Unknown',
                    project_unique_id: parentProj ? parentProj.project_unique_id : '?'
                };
            });
            setMilestones(annotated);
        }

    }, [viewMode, rawData, user]);

    const handlePTOAction = async (requestId, newStatus) => {
        const labels = { 'Manager Approved': 'Approve', 'Finance Approved': 'Finance Approve', 'Rejected': 'Reject' };
        if (!window.confirm(`${labels[newStatus] || newStatus} this PTO request?`)) return;
        try {
            await api.put(`/pto/requests/${requestId}/status`, { status: newStatus });
            const ptoStatuses = ['Pending'];
            if (user?.has_financial_access) ptoStatuses.push('Manager Approved');
            const ptoData = await Promise.all(
                ptoStatuses.map(s => api.get(`/pto/requests?status=${encodeURIComponent(s)}`))
            );
            setPtoRequests(ptoData.flat());
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Workspace...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'var(--error)' }}>{error}</div>;

    const directReportIds = new Set(rawData.users.filter(u => u.manager_id === user.id).map(u => u.id));
    const visiblePtoRequests = ptoRequests.filter(r =>
        r.status === 'Pending' ? directReportIds.has(r.user_id) : true
    );

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Manager Workspace</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of your direct reports and assignments.</p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => setViewMode('active_users')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: viewMode === 'active_users' ? '#10b981' : 'transparent', color: viewMode === 'active_users' ? 'white' : 'var(--text-muted)', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: viewMode === 'active_users' ? 'bold' : 'normal' }}
                    >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: viewMode === 'active_users' ? 'white' : '#10b981', display: 'inline-block' }}></span>
                        Active Users
                    </button>
                    <button 
                        onClick={() => setViewMode('direct')}
                        style={{ background: viewMode === 'direct' ? 'var(--primary)' : 'transparent', color: viewMode === 'direct' ? 'white' : 'var(--text-muted)', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: viewMode === 'direct' ? 'bold' : 'normal' }}
                    >
                        Direct Reports
                    </button>
                    <button 
                        onClick={() => setViewMode('nested')}
                        style={{ background: viewMode === 'nested' ? 'var(--primary)' : 'transparent', color: viewMode === 'nested' ? 'white' : 'var(--text-muted)', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: viewMode === 'nested' ? 'bold' : 'normal' }}
                    >
                        Entire Team
                    </button>
                    {user?.has_financial_access && (
                        <button 
                            onClick={() => setViewMode('company')}
                            style={{ background: viewMode === 'company' ? 'var(--primary)' : 'transparent', color: viewMode === 'company' ? 'white' : 'var(--text-muted)', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: viewMode === 'company' ? 'bold' : 'normal' }}
                            title="Global Scope Override (Financial Access)"
                        >
                            Full Company
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'active_users' ? (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 10px #10b981' }}></span>
                        Currently Clocked In
                    </h3>
                    {activeUsers.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', background: 'var(--bg-main)', borderRadius: '6px', textAlign: 'center' }}>
                            No users in your scope are actively clocked in right now.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>User</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Task</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Time In</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeUsers.map((u, i) => (
                                        <tr key={i} style={{ borderBottom: i === activeUsers.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{u.first_name || u.username} {u.last_name || ''}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                {u.latitude && u.longitude ? (
                                                    <a 
                                                        href={`https://maps.google.com/?q=${u.latitude},${u.longitude}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        style={{ color: '#0ea5e9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '500' }}
                                                        title={`Latitude: ${u.latitude}, Longitude: ${u.longitude}`}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                        {u.location || 'GPS Tracked'}
                                                    </a>
                                                ) : (
                                                    u.location || 'Office'
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>#{u.task_id} - {u.task_description}</td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{u.start_time || 'Unknown'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                /* My Team Section */
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>My Team Roster</h3>
                {team.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>You have no direct reports assigned.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Title</th>
                                    <th>Role</th>
                                    <th>Region</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.map(member => (
                                    <tr key={member.id}>
                                        <td className="font-medium">{member.first_name} {member.last_name} ({member.username})</td>
                                        <td>{member.title || '-'}</td>
                                        <td><span className="status-badge" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>{member.role}</span></td>
                                        <td>{member.region || '-'}</td>
                                        <td>
                                            <button 
                                                onClick={() => navigate(`/portal/tasks/new?assigned_to_id=${member.id}`)}
                                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                + Assign Task
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}

            {/* Pending PTO Requests */}
            {visiblePtoRequests.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Pending PTO Requests
                        <span style={{ marginLeft: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {visiblePtoRequests.length}
                        </span>
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Dates</th>
                                    <th>Hours</th>
                                    <th>Notes</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePtoRequests.map(r => {
                                    const emp = rawData.users.find(u => u.id === r.user_id);
                                    const empName = emp
                                        ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username
                                        : `User #${r.user_id}`;
                                    const isPending = r.status === 'Pending';
                                    return (
                                        <tr key={r.id}>
                                            <td className="font-medium">{empName}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                                            </td>
                                            <td>{r.hours_requested}h</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{r.notes || '—'}</td>
                                            <td>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    background: isPending ? 'rgba(56,189,248,0.1)' : 'rgba(251,191,36,0.1)',
                                                    color: isPending ? '#38bdf8' : '#fbbf24',
                                                    borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                                                }}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isPending ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handlePTOAction(r.id, 'Manager Approved')}
                                                            className="btn-primary"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#22c55e', borderColor: '#22c55e' }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handlePTOAction(r.id, 'Rejected')}
                                                            className="btn-secondary"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : user?.has_financial_access ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handlePTOAction(r.id, 'Finance Approved')}
                                                            className="btn-primary"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
                                                        >
                                                            Finance Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handlePTOAction(r.id, 'Rejected')}
                                                            className="btn-secondary"
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Awaiting Finance</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* My Projects */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Active Projects (PM / Owner)</h3>
                {projects.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active projects assigned to you.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Project ID</th>
                                    <th>Project Name</th>
                                    <th>Customer</th>
                                    <th>Internal PM</th>
                                    <th>Type</th>
                                    <th>Due Date</th>
                                    <th style={{ minWidth: '250px' }}>Details</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map(project => (
                                    <tr key={project.id} style={{ verticalAlign: 'top' }}>
                                        <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>{project.project_unique_id}</td>
                                        <td className="font-medium">{project.name}</td>
                                        <td>{project.customer?.name || '-'}</td>
                                        <td>{project.pm_user?.username || '-'}</td>
                                        <td>{project.project_type || '-'}</td>
                                        <td style={{ color: !project.due_date ? 'var(--text-muted)' : 'inherit', whiteSpace: 'nowrap' }}>
                                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            {project.description ? (
                                                <details style={{ cursor: 'pointer' }}>
                                                    <summary style={{ color: 'var(--primary)', fontWeight: '500', outline: 'none' }}>View Description</summary>
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '4px' }}>
                                                        {project.description}
                                                    </div>
                                                </details>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No description</span>
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => navigate(`/portal/tasks/new?project_id=${project.id}`)}
                                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                            >
                                                + Create Task
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* My Milestones */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Active Milestones (Owner)</h3>
                {milestones.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active milestones assigned to you.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Milestone ID</th>
                                    <th>Milestone Name</th>
                                    <th>Parent Project</th>
                                    <th>Type</th>
                                    <th>Due Date</th>
                                    <th style={{ minWidth: '250px' }}>Details</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {milestones.map(milestone => (
                                    <tr key={milestone.id} style={{ verticalAlign: 'top' }}>
                                        <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>#{milestone.id}</td>
                                        <td className="font-medium">{milestone.name}</td>
                                        <td>
                                           <div style={{ fontWeight: '500' }}>{milestone.project_unique_id}</div>
                                           <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{milestone.project_name}</div>
                                        </td>
                                        <td>{milestone.milestone_type || '-'}</td>
                                        <td style={{ color: !milestone.due_date ? 'var(--text-muted)' : 'inherit', whiteSpace: 'nowrap' }}>
                                            {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td>
                                            {milestone.description ? (
                                                <details style={{ cursor: 'pointer' }}>
                                                    <summary style={{ color: 'var(--primary)', fontWeight: '500', outline: 'none' }}>View Description</summary>
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '4px' }}>
                                                        {milestone.description}
                                                    </div>
                                                </details>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No description</span>
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => navigate(`/portal/tasks/new?project_id=${milestone.project_id}&milestone_id=${milestone.id}`)}
                                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                            >
                                                + Create Task
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default ManagerWorkspace;
