import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import MilestoneForm from '../components/MilestoneForm';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';

const MilestoneBoard = () => {
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);
    const [milestones, setMilestones] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');

    // Filters
    const [filterProject, setFilterProject] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all'); // all, unbilled, billed
    const [filterOwner, setFilterOwner] = useState('all');
    const [hideCompleted, setHideCompleted] = useState(false);

    // Edit State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);

    const [sortField, setSortField] = useState('due_date'); // Default sort
    const [sortOrder, setSortOrder] = useState('asc'); // Default asc for dates

    const fetchData = async () => {
        try {
            const [mParams, pParams, uParams] = await Promise.all([
                api.get('/milestones/'),
                api.get('/projects/'),
                api.get('/users/')
            ]);
            setMilestones(mParams);
            setProjects(pParams);
            setUsers(uParams);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to get Project Name
    const getProjectName = (pid) => {
        const p = projects.find(prj => prj.id === pid);
        return p ? p.name : `Project #${pid}`;
    };

    const handleEdit = (m) => {
        setEditingMilestone(m);
        setIsFormOpen(true);
    };

    const handleClone = async (id) => {
        if (!confirm("Are you sure you want to clone this milestone?")) return;
        try {
            await api.post(`/milestones/${id}/clone`);
            fetchData();
        } catch (err) {
            console.error("Failed to clone milestone", err);
            alert("Failed to clone milestone");
        }
    };

    const handleSave = () => {
        fetchData();
        setIsFormOpen(false);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredMilestones = milestones.filter(m => {
        // Filter by Project
        if (filterProject !== 'all' && m.project_id !== parseInt(filterProject)) return false;

        // Filter by Status
        const isBilled = !!m.invoice_id;
        if (filterStatus === 'unbilled' && isBilled) return false;
        if (filterStatus === 'billed' && !isBilled) return false;

        // Filter by Owner (Milestone Owner)
        if (filterOwner !== 'all' && m.owner_id !== parseInt(filterOwner)) return false;

        // Filter Hide Completed
        if (hideCompleted && (m.progress === 100 || m.is_completed)) return false;

        return true;
    }).sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Derived values
        if (sortField === 'project') {
            aValue = getProjectName(a.project_id);
            bValue = getProjectName(b.project_id);
        } else if (sortField === 'owner') {
            aValue = a.owner?.username || '';
            bValue = b.owner?.username || '';
        } else if (sortField === 'status') {
            aValue = !!a.invoice_id ? 'Billed' : 'Unbilled';
            bValue = !!b.invoice_id ? 'Billed' : 'Unbilled';
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const [bulkMilestones, setBulkMilestones] = useState([]);
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    useEffect(() => {
        if (viewMode === 'bulk') {
            setBulkMilestones(filteredMilestones.map(m => ({
                ...m,
                due_date: m.due_date ? m.due_date.split('T')[0] : '',
                isDirty: false
            })));
        }
    }, [viewMode, milestones, filterProject, filterStatus, filterOwner, hideCompleted, sortField, sortOrder]);

    const handleBulkChange = (id, field, value) => {
        setBulkMilestones(prev => prev.map(m => {
            if (m.id === id) {
                return { ...m, [field]: value, isDirty: true };
            }
            return m;
        }));
    };

    const handleSaveBulk = async () => {
        const dirtyMs = bulkMilestones.filter(m => m.isDirty);
        if (dirtyMs.length === 0) {
            setViewMode('list');
            return;
        }

        setIsSavingBulk(true);
        try {
            await Promise.all(dirtyMs.map(m => {
                const payload = {
                    name: m.name,
                    description: m.description,
                    cost: parseFloat(m.cost) || 0,
                    owner_id: parseInt(m.owner_id) || null,
                    progress: parseInt(m.progress) || 0,
                    due_date: m.due_date || null,
                    is_completed: m.is_completed || false,
                    milestone_type: m.milestone_type || "Other"
                };
                return api.put(`/milestones/${m.id}`, payload);
            }));

            fetchData();
            setViewMode('list');
        } catch (err) {
            console.error(err);
            alert("Failed to save bulk milestones.");
        } finally {
            setIsSavingBulk(false);
        }
    };

    const handleProgressUpdate = async (id, newProgress) => {
        // Optimistic update
        setMilestones(prev => prev.map(m => m.id === id ? { ...m, progress: parseInt(newProgress) } : m));

        try {
            await api.put(`/milestones/${id}`, { progress: parseInt(newProgress) });
        } catch (err) {
            console.error("Failed to update progress", err);
            // Revert on failure? For now, alert or ignore.
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <>
            <div className="dashboard-container">
                <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2>Milestones</h2>

                        {viewMode === 'grid' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                                <select
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    <option value="due_date" style={{ color: 'black' }}>Due Date</option>
                                    <option value="milestone_number" style={{ color: 'black' }}>Number #</option>
                                    <option value="name" style={{ color: 'black' }}>Name</option>
                                    <option value="project" style={{ color: 'black' }}>Project</option>
                                    {isFinancial && <option value="cost" style={{ color: 'black' }}>Cost</option>}
                                    {isFinancial && <option value="billed" style={{ color: 'black' }}>Invoiced</option>}
                                    <option value="progress" style={{ color: 'black' }}>Progress</option>
                                    <option value="status" style={{ color: 'black' }}>Status</option>
                                    <option value="owner" style={{ color: 'black' }}>Owner</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                                >
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>
                        )}

                        {/* View Toggle */}
                        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3H3V10H10V3Z" /><path d="M21 3H14V10H21V3Z" /><path d="M21 14H14V21H21V14Z" /><path d="M10 14H3V21H10V14Z" /></svg>
                            </button>
                            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6H21" /><path d="M8 12H21" /><path d="M8 18H21" /><path d="M3 6H3.01" /><path d="M3 12H3.01" /><path d="M3 18H3.01" /></svg>
                            </button>
                            {isFinancial && (
                                <button onClick={() => setViewMode('bulk')} style={{ background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent', color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px' }} title="Bulk Edit Mode">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => {
                                const columns = [
                                    { header: '#', accessor: 'milestone_number' },
                                    { header: 'Name', accessor: 'name' },
                                    { header: 'For Project', accessor: (m) => projects.find(p => p.id === m.project_id)?.name || m.project_id },
                                    { header: 'Owner', accessor: (m) => m.owner?.username || '' },
                                    { header: 'Cost', accessor: (m) => `$${(m.cost || 0).toLocaleString()}` },
                                    { header: 'Progress', accessor: (m) => `${m.progress}%` },
                                    { header: 'Due', accessor: (m) => m.due_date ? new Date(m.due_date).toLocaleDateString() : '' },
                                    {
                                        header: 'Status', accessor: (m) => {
                                            const isFullyBilled = (m.cost > 0 && (m.remaining_amount <= 0.01));
                                            const isPartiallyBilled = ((m.total_billed || 0) > 0 && !isFullyBilled);
                                            if (isFullyBilled) return 'Billed';
                                            if (isPartiallyBilled) return 'Partial';
                                            if (m.is_completed) return 'Done';
                                            return 'In Progress';
                                        }
                                    }
                                ];
                                import('../utils/exportUtils').then(({ exportToCSV }) => {
                                    exportToCSV(filteredMilestones, columns, 'milestones.csv');
                                });
                            }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                            <button onClick={() => {
                                const columns = [
                                    { header: '#', accessor: 'milestone_number' },
                                    { header: 'Name', accessor: 'name' },
                                    { header: 'For Project', accessor: (m) => projects.find(p => p.id === m.project_id)?.name || m.project_id },
                                    { header: 'Owner', accessor: (m) => m.owner?.username || '' },
                                    { header: 'Cost', accessor: (m) => `$${(m.cost || 0).toLocaleString()}` },
                                    { header: 'Progress', accessor: (m) => `${m.progress}%` },
                                    { header: 'Due', accessor: (m) => m.due_date ? new Date(m.due_date).toLocaleDateString() : '' },
                                    {
                                        header: 'Status', accessor: (m) => {
                                            const isFullyBilled = (m.cost > 0 && (m.remaining_amount <= 0.01));
                                            const isPartiallyBilled = ((m.total_billed || 0) > 0 && !isFullyBilled);
                                            if (isFullyBilled) return 'Billed';
                                            if (isPartiallyBilled) return 'Partial';
                                            if (m.is_completed) return 'Done';
                                            return 'In Progress';
                                        }
                                    }
                                ];
                                import('../utils/exportUtils').then(({ exportToPDF }) => {
                                    exportToPDF(filteredMilestones, columns, 'Milestone List', 'milestones.pdf');
                                });
                            }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </button>
                        </div>

                        <select
                            value={filterOwner}
                            onChange={(e) => setFilterOwner(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                        >
                            <option value="all">All Owners</option>
                            {users.filter(u => u.is_employee).map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>

                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                        >
                            <option value="all">Billing: All</option>
                            <option value="unbilled">Billing: Unbilled</option>
                            <option value="billed">Billing: Billed</option>
                        </select>

                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', marginLeft: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                                style={{ marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                            />
                            Hide Completed
                        </label>
                    </div>
                </div>

                {viewMode === 'bulk' ? (
                    <BulkEditTable 
                        bulkMilestones={bulkMilestones} 
                        users={users} 
                        projects={projects}
                        handleBulkChange={handleBulkChange}
                        isSavingBulk={isSavingBulk}
                        onSave={handleSaveBulk}
                        onCancel={() => setViewMode('list')}
                    />
                ) : viewMode === 'grid' ? (
                    <div className="grid-container">
                        {filteredMilestones.map((m) => {
                            const isFullyBilled = (m.cost > 0 && (m.remaining_amount <= 0.01));
                            const isPartiallyBilled = ((m.total_billed || 0) > 0 && !isFullyBilled);
                            const isBilled = isFullyBilled;

                            return (
                                <div className="card" key={m.id} style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, color: 'var(--primary)' }}>MS-{m.milestone_number}: {m.name}</h4>
                                        {isFullyBilled ? (
                                            <span className="status-badge" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>Billed</span>
                                        ) : isPartiallyBilled ? (
                                            <span className="status-badge" style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)' }}>Partial</span>
                                        ) : m.is_completed ? (
                                            <span className="status-badge" style={{ color: 'var(--info)', background: 'rgba(59, 130, 246, 0.1)' }}>Done</span>
                                        ) : (
                                            <span className="status-badge" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>In Progress</span>
                                        )}
                                    </div>
                                    <div style={{ marginRight: '2rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{m.name}</h3>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            ID: {m.display_id || `M-${m.id}`} | Project: {projects.find(p => p.id === m.project_id)?.name}
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getProjectName(m.project_id)}</p>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Owner: <span style={{ color: 'var(--text-main)' }}>{m.owner ? m.owner.username : 'Unassigned'}</span>
                                        {m.milestone_type && <span style={{ marginLeft: '0.5rem' }}>Type: <strong style={{ color: 'var(--text-main)' }}>{m.milestone_type}</strong></span>}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                            ID: {m.display_id || `M-${m.id}`}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        {isFinancial && <span style={{ fontWeight: 'bold' }}>${(m.cost || 0).toLocaleString()}</span>}
                                        <span>{m.progress}%</span>
                                    </div>
                                    {isFinancial && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            <span>Billed: ${(m.total_billed || 0).toLocaleString()}</span>
                                            <span>{m.progress_percentage ? m.progress_percentage.toFixed(0) : 0}%</span>
                                        </div>
                                    )}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={m.progress || 0}
                                            onChange={(e) => setMilestones(prev => prev.map(im => im.id === m.id ? { ...im, progress: e.target.value } : im))}
                                            onMouseUp={(e) => handleProgressUpdate(m.id, e.target.value)}
                                            onTouchEnd={(e) => handleProgressUpdate(m.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                accentColor: (() => {
                                                    const p = m.progress || 0;
                                                    if (p > 75) return '#22c55e'; // Green
                                                    if (p > 50) return '#eab308'; // Yellow
                                                    if (p > 25) return '#f97316'; // Orange
                                                    return '#ef4444'; // Red
                                                })()
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                        {m.due_date ? (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                color: (() => {
                                                    const due = new Date(m.due_date);
                                                    const now = new Date();
                                                    const diffTime = due - now;
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    if (diffDays > 7) return '#22c55e'; // Green
                                                    if (diffDays <= 3 && diffDays > 0) return '#eab308'; // Yellow
                                                    if (diffDays <= 0) return '#ef4444'; // Red
                                                    return 'var(--text-muted)';
                                                })()
                                            }}>
                                                Due: {new Date(m.due_date).toLocaleDateString()}
                                            </div>
                                        ) : <div></div>}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                            {m.audits && m.audits.length > 0 && m.audits.filter(a => a.action === 'Billed').map(a => (
                                                a.invoice_id ? (
                                                    <Link key={a.id} to={`/portal/invoices/${a.invoice_id}`} style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem' }}>
                                                        #{a.invoice_number}
                                                    </Link>
                                                ) : (
                                                    <span key={a.id} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                        #{a.invoice_number} (Del)
                                                    </span>
                                                )
                                            ))}
                                            {(!isFullyBilled && !isPartiallyBilled) && (
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button onClick={() => handleClone(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Clone Milestone">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleEdit(m)} title="Edit Milestone" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredMilestones.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No milestones found matching filters.</p>}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('milestone_number')} style={{ cursor: 'pointer' }}>Milestone {sortField === 'milestone_number' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('project')} style={{ cursor: 'pointer' }}>Project {sortField === 'project' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Type</th>
                                    <th onClick={() => handleSort('owner')} style={{ cursor: 'pointer' }}>Owner {sortField === 'owner' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    {isFinancial && <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>Cost {sortField === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}</th>}
                                    {isFinancial && <th onClick={() => handleSort('billed')} style={{ cursor: 'pointer' }}>Invoiced {sortField === 'billed' && (sortOrder === 'asc' ? '↑' : '↓')}</th>}
                                    <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>Progress {sortField === 'progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMilestones.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No milestones found.</td></tr>
                                ) : (
                                    filteredMilestones.map((m) => {
                                        const isFullyBilled = (m.cost > 0 && (m.remaining_amount <= 0.01));
                                        const isPartiallyBilled = ((m.total_billed || 0) > 0 && !isFullyBilled);
                                        const isBilled = isFullyBilled; // For backward compat with existing var logic if needed, but better to use specific statuses

                                        return (
                                            <tr key={m.id}>
                                                <td className="font-medium">#{m.milestone_number} {m.name}</td>
                                                <td>{getProjectName(m.project_id)}</td>
                                                <td>{m.milestone_type || '-'}</td>
                                                <td>{m.owner ? m.owner.username : '-'}</td>
                                                {isFinancial && <td className="font-medium">${(m.cost || 0).toLocaleString()}</td>}
                                                {isFinancial && (
                                                    <td>
                                                        ${(m.total_billed || 0).toLocaleString()} <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>({m.progress_percentage ? m.progress_percentage.toFixed(0) : 0}%)</span>
                                                    </td>
                                                )}
                                                <td style={{ width: '150px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={m.progress || 0}
                                                            onChange={(e) => setMilestones(prev => prev.map(im => im.id === m.id ? { ...im, progress: e.target.value } : im))}
                                                            onMouseUp={(e) => handleProgressUpdate(m.id, e.target.value)}
                                                            onTouchEnd={(e) => handleProgressUpdate(m.id, e.target.value)}
                                                            style={{
                                                                width: '100px',
                                                                accentColor: (() => {
                                                                    const p = m.progress || 0;
                                                                    if (p > 75) return '#22c55e'; // Green
                                                                    if (p > 50) return '#eab308'; // Yellow
                                                                    if (p > 25) return '#f97316'; // Orange
                                                                    return '#ef4444'; // Red
                                                                })()
                                                            }}
                                                        />
                                                        <span>{m.progress}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {m.due_date ? (
                                                        <span style={{
                                                            fontWeight: '500',
                                                            color: (() => {
                                                                const due = new Date(m.due_date);
                                                                const now = new Date();
                                                                const diffTime = due - now;
                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                                if (diffDays > 7) return '#22c55e'; // Green
                                                                if (diffDays <= 3 && diffDays > 0) return '#eab308'; // Yellow
                                                                if (diffDays <= 0) return '#ef4444'; // Red
                                                                return 'var(--text-main)';
                                                            })()
                                                        }}>
                                                            {new Date(m.due_date).toLocaleDateString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {isFullyBilled ? (
                                                        <span className="status-badge" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>Billed</span>
                                                    ) : isPartiallyBilled ? (
                                                        <span className="status-badge" style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)' }}>Partial</span>
                                                    ) : m.is_completed ? (
                                                        <span className="status-badge" style={{ color: 'var(--info)', background: 'rgba(59, 130, 246, 0.1)' }}>Done</span>
                                                    ) : (
                                                        <span className="status-badge" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>In Progress</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        {isFinancial && m.audits && m.audits.length > 0 && m.audits.filter(a => a.action === 'Billed').map(a => (
                                                            a.invoice_id ? (
                                                                <Link key={a.id} to={`/portal/invoices/${a.invoice_id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                                                    {a.invoice_number} (${a.amount?.toLocaleString()})
                                                                </Link>
                                                            ) : (
                                                                <span key={a.id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {a.invoice_number} (${a.amount?.toLocaleString()}) (Deleted)
                                                                </span>
                                                            )
                                                        ))}
                                                        {(!isFullyBilled && !isPartiallyBilled) && (
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                <button onClick={() => handleClone(m.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Clone Milestone">
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                                </button>
                                                                <button onClick={() => handleEdit(m)} title="Edit Milestone" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )
                }

                {/* Edit Modal */}
                <MilestoneForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    project={projects.find(p => p.id === editingMilestone?.project_id) || { id: editingMilestone?.project_id }}
                    milestone={editingMilestone}
                    onSave={handleSave}
                />
            </div >
        </>
    );
};

const BulkEditTable = ({ bulkMilestones, users, projects, handleBulkChange, isSavingBulk, onSave, onCancel }) => {
    const dirtyCount = bulkMilestones.filter(m => m.isDirty).length;
    
    return (
        <div className="card" style={{ overflowX: 'auto', paddingBottom: '3rem' }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Bulk Edit Mode: {bulkMilestones.length} Milestones</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: dirtyCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {dirtyCount} unsaved changes
                    </span>
                    <button onClick={onCancel} className="btn-secondary" disabled={isSavingBulk}>Cancel</button>
                    <button onClick={onSave} className="btn-primary" disabled={isSavingBulk || dirtyCount === 0}>
                        {isSavingBulk ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
            <table className="data-table" style={{ minWidth: '1200px' }}>
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>Number</th>
                        <th style={{ width: '25%' }}>Name</th>
                        <th style={{ width: '12%' }}>Type</th>
                        <th style={{ width: '14%' }}>Owner</th>
                        <th style={{ width: '10%' }}>Cost ($)</th>
                        <th style={{ width: '12%' }}>Due Date</th>
                        <th style={{ width: '12%' }}>Progress (%)</th>
                        <th style={{ width: '10%' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {bulkMilestones.map(m => (
                        <tr key={m.id} style={{ background: m.isDirty ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                MS-{m.milestone_number}
                                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{projects.find(p => p.id === m.project_id)?.name}</div>
                            </td>
                            <td>
                                <input 
                                    type="text" 
                                    value={m.name || ''} 
                                    onChange={(e) => handleBulkChange(m.id, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <select 
                                    value={m.milestone_type || 'Other'} 
                                    onChange={(e) => handleBulkChange(m.id, 'milestone_type', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    {["Design", "Hardware", "Remote", "Onsite", "PM", "Contingency", "FIXED", "Other"].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <select 
                                    value={m.owner_id || ''} 
                                    onChange={(e) => handleBulkChange(m.id, 'owner_id', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    <option value="">Unassigned</option>
                                    {users.filter(u => u.is_employee).map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={m.cost === null ? '' : m.cost} 
                                    onChange={(e) => handleBulkChange(m.id, 'cost', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="date" 
                                    value={m.due_date || ''} 
                                    onChange={(e) => handleBulkChange(m.id, 'due_date', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={m.progress === null ? '' : m.progress} 
                                    onChange={(e) => handleBulkChange(m.id, 'progress', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <select 
                                    value={m.is_completed ? 'Done' : 'Open'} 
                                    onChange={(e) => handleBulkChange(m.id, 'is_completed', e.target.value === 'Done')}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    <option value="Open">Open</option>
                                    <option value="Done">Completed</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                    {bulkMilestones.length === 0 && (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No milestones found matching current filters.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default MilestoneBoard;
