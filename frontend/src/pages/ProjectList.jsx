import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import useSessionState from '../hooks/useSessionState';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';

const ProjectList = () => {
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [editBuffer, setEditBuffer] = useState({});
    const [savingBulk, setSavingBulk] = useState(false);
    const { user } = useAuth();
    const isFinancial = user && hasFinancialAccess(user);
    const [viewMode, setViewMode] = useSessionState('project_list_viewMode', 'grid');
    const [hideCompleted, setHideCompleted] = useSessionState('project_list_hideCompleted', false);
    const [filterCustomer, setFilterCustomer] = useSessionState('project_list_filterCustomer', 'all');
    const [filterStatus, setFilterStatus] = useSessionState('project_list_filterStatus', 'all');
    const [filterInternalPM, setFilterInternalPM] = useSessionState('project_list_filterInternalPM', 'all');
    const [filterLocation, setFilterLocation] = useSessionState('project_list_filterLocation', 'all');
    const [sortField, setSortField] = useSessionState('project_list_sortField', 'updated_at');
    const [sortOrder, setSortOrder] = useSessionState('project_list_sortOrder', 'desc');

    const fetchProjects = async () => {
        try {
            const data = await api.get('/projects/');
            setProjects(data);
        } catch (err) {
            console.error("Failed to load projects", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [usersData, customersData, locationsData] = await Promise.all([
                    api.get('/users/'),
                    api.get('/customers/'),
                    api.get('/locations/')
                ]);
                setUsers(usersData);
                setCustomers(customersData);
                setLocations(locationsData);
            } catch (err) {
                console.error("Failed to load reference data", err);
            }
        };
        fetchInitial();
        fetchProjects();
    }, []);

    const toggleBulkEdit = () => {
        setIsBulkEditing(!isBulkEditing);
        if (isBulkEditing) setEditBuffer({});
    };

    const handleBulkChange = (id, field, value) => {
        setEditBuffer(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    const handleBulkSave = async () => {
        setSavingBulk(true);
        try {
            const updates = Object.keys(editBuffer).map(id => ({
                id: parseInt(id),
                ...editBuffer[id]
            }));
            if (updates.length > 0) {
                await Promise.all(updates.map(u => {
                    const { id, ...data } = u;
                    return api.put(`/projects/${id}`, data);
                }));
                await fetchProjects();
            }
            setIsBulkEditing(false);
            setEditBuffer({});
        } catch (err) {
            console.error("Failed to save bulk edits", err);
            alert("Failed to save bulk edits.");
        } finally {
            setSavingBulk(false);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Derived unique values for filters
    const uniqueCustomers = [...new Set(projects.map(p => p.customer?.name || p.customer_id || '').filter(Boolean))].sort();
    const uniquePMs = [...new Set(projects.map(p => p.pm_user?.username || '').filter(Boolean))].sort();
    const uniqueLocations = [...new Set(projects.map(p => p.location?.name || '').filter(Boolean))].sort();

    const filteredProjects = projects.filter(p => {
        if (hideCompleted && p.status === 'completed') return false;
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;

        const pCustomer = p.customer?.name || p.customer_id || '';
        if (filterCustomer !== 'all' && pCustomer !== filterCustomer) return false;

        const pPM = p.pm_user?.username || '';
        if (filterInternalPM !== 'all' && pPM !== filterInternalPM) return false;

        const pLocation = p.location?.name || '';
        if (filterLocation !== 'all' && pLocation !== filterLocation) return false;

        return true;
    });

    const sortedProjects = [...filteredProjects].filter(p => !hideCompleted || p.status !== 'completed').sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle nested fields or special cases
        if (sortField === 'customer') {
            aValue = a.customer?.name || a.customer_id || '';
            bValue = b.customer?.name || b.customer_id || '';
        } else if (sortField === 'location') {
            aValue = a.location?.name || '';
            bValue = b.location?.name || '';
        } else if (sortField === 'remaining') {
            aValue = a.remaining_value || 0;
            bValue = b.remaining_value || 0;
        } else if (sortField === 'progress') {
            aValue = a.milestones?.length > 0 ? a.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / a.milestones.length : 0;
            bValue = b.milestones?.length > 0 ? b.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / b.milestones.length : 0;
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h2 style={{ margin: 0 }}>Projects</h2>
                    </div>
                    {viewMode === 'grid' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                            <select
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <option value="updated_at" style={{ color: 'black' }}>Recently Updated</option>
                                <option value="name" style={{ color: 'black' }}>Name</option>
                                <option value="project_unique_id" style={{ color: 'black' }}>Project ID</option>
                                <option value="customer" style={{ color: 'black' }}>Customer</option>
                                <option value="location" style={{ color: 'black' }}>Location</option>
                                <option value="status" style={{ color: 'black' }}>Status</option>
                                <option value="due_date" style={{ color: 'black' }}>Due Date</option>
                                {isFinancial && (
                                    <>
                                        <option value="budget" style={{ color: 'black' }}>Budget</option>
                                <option value="remaining" style={{ color: 'black' }}>Remaining</option>
                                <option value="financial_progress" style={{ color: 'black' }}>Billed %</option>
                                    </>
                                )}
                                <option value="progress" style={{ color: 'black' }}>Milestone Progress</option>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    background: viewMode === 'grid' && !isBulkEditing ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'grid' && !isBulkEditing ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    background: viewMode === 'list' && !isBulkEditing ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'list' && !isBulkEditing ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                onClick={toggleBulkEdit}
                                style={{
                                    background: isBulkEditing ? 'var(--primary)' : 'transparent',
                                    color: isBulkEditing ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px'
                                }}
                                title="Bulk Edit Mode"
                                disabled={savingBulk}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            </button>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            {sortedProjects.length} Records Displayed
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>



                    {/* Filters Group - Right Aligned */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '110px' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Status</option>
                            <option value="active" style={{ color: 'black' }}>Active</option>
                            <option value="completed" style={{ color: 'black' }}>Completed</option>
                            <option value="on_hold" style={{ color: 'black' }}>On Hold</option>
                            <option value="cancelled" style={{ color: 'black' }}>Cancelled</option>
                        </select>

                        <select
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '140px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Customers</option>
                            {uniqueCustomers.map(c => (
                                <option key={c} value={c} style={{ color: 'black' }}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '140px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Locations</option>
                            {uniqueLocations.map(l => (
                                <option key={l} value={l} style={{ color: 'black' }}>{l}</option>
                            ))}
                        </select>

                        <select
                            value={filterInternalPM}
                            onChange={(e) => setFilterInternalPM(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '140px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All PMs</option>
                            {uniquePMs.map(pm => (
                                <option key={pm} value={pm} style={{ color: 'black' }}>{pm}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Project ID', accessor: 'project_unique_id' },
                                { header: 'Name', accessor: 'name' },
                                { header: 'Customer', accessor: (p) => p.customer?.name || p.customer_id || '' },
                                { header: 'Location', accessor: (p) => p.location?.name || '' },
                                { header: 'Internal PM', accessor: (p) => p.pm_user?.username || '' },
                                { header: 'Type', accessor: 'project_type' },
                                { header: 'PO #', accessor: 'customer_po' },
                                { header: 'Status', accessor: 'status' },
                                ...(isFinancial ? [
                                    { header: 'Budget', accessor: (p) => `$${p.budget?.toLocaleString() || 0}` },
                                    { header: 'Remaining', accessor: (p) => `$${p.remaining_value?.toLocaleString() || 0}` },
                                    { header: 'Billed %', accessor: (p) => `${p.financial_progress?.toFixed(0) || 0}%` }
                                ] : []),
                                { header: 'Progress', accessor: (p) => p.milestones?.length > 0 ? `${(p.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / p.milestones.length).toFixed(0)}%` : '0%' },
                                { header: 'Due Date', accessor: (p) => p.due_date ? new Date(p.due_date).toLocaleDateString() : '' }
                            ];
                            import('../utils/exportUtils').then(({ exportToCSV }) => {
                                exportToCSV(sortedProjects, columns, 'projects.csv');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Project ID', accessor: 'project_unique_id' },
                                { header: 'Name', accessor: 'name' },
                                { header: 'Customer', accessor: (p) => p.customer?.name || p.customer_id || '' },
                                { header: 'Location', accessor: (p) => p.location?.name || '' },
                                { header: 'Internal PM', accessor: (p) => p.pm_user?.username || '' },
                                { header: 'Type', accessor: 'project_type' },
                                { header: 'PO #', accessor: 'customer_po' },
                                { header: 'Status', accessor: 'status' },
                                ...(isFinancial ? [
                                    { header: 'Budget', accessor: (p) => `$${p.budget?.toLocaleString() || 0}` },
                                    { header: 'Remaining', accessor: (p) => `$${p.remaining_value?.toLocaleString() || 0}` },
                                    { header: 'Billed %', accessor: (p) => `${p.financial_progress?.toFixed(0) || 0}%` }
                                ] : []),
                                { header: 'Progress', accessor: (p) => p.milestones?.length > 0 ? `${(p.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / p.milestones.length).toFixed(0)}%` : '0%' },
                                { header: 'Due Date', accessor: (p) => p.due_date ? new Date(p.due_date).toLocaleDateString() : '' }
                            ];
                            import('../utils/exportUtils').then(({ exportToPDF }) => {
                                exportToPDF(sortedProjects, columns, 'Project List', 'projects.pdf');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                            type="checkbox"
                            checked={hideCompleted}
                            onChange={(e) => setHideCompleted(e.target.checked)}
                            style={{ marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                        />
                        Hide Completed
                    </label>

                    {isBulkEditing && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={toggleBulkEdit} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} disabled={savingBulk}>Cancel</button>
                            <button onClick={handleBulkSave} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#10b981', borderColor: '#10b981' }} disabled={savingBulk || Object.keys(editBuffer).length === 0}>
                                {savingBulk ? 'Saving...' : 'Save All Changes'}
                            </button>
                        </div>
                    )}

                    <Link to="/portal/projects/new">
                        <button className="btn-primary" disabled={isBulkEditing || savingBulk}>+ New Project</button>
                    </Link>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedProjects.map((project) => {
                        const progress = project.milestones?.length > 0
                            ? project.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / project.milestones.length
                            : 0;

                        return (
                            <Link to={`/portal/projects/${project.id}`} key={project.id} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h3 style={{ margin: 0 }}>{project.name}</h3>
                                            {project.do_not_invoice && (
                                                <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: 'white', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>Do Not Invoice</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {isFinancial && project.remaining_value > 0 && !project.do_not_invoice && (
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href=`/portal/invoices/new?project_id=${project.id}`; }}
                                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.15rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    title="Quick Create Invoice"
                                                >
                                                    + Invoice
                                                </button>
                                            )}
                                            <span className="status-badge status-active">{project.status}</span>
                                        </div>
                                    </div>
                                    <p style={{ height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.description}</p>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{project.project_unique_id}</p>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {project.customer && <span>Cl: <strong style={{ color: 'var(--text-main)' }}>{project.customer.name}</strong></span>}
                                            {project.location && <span>Loc: {project.location.name}</span>}
                                            {project.project_type && <span>Type: {project.project_type}</span>}
                                            {project.customer_po && <span>PO: {project.customer_po}</span>}
                                            {project.lead_id && <span>Lead: <span style={{color: 'var(--primary)'}}>L-{project.lead_id}</span></span>}
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px', color: 'var(--text-muted)' }}>
                                                <span>Progress</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${progress}%`,
                                                    height: '100%',
                                                    background: (() => {
                                                        if (progress > 75) return '#22c55e'; // Green
                                                        if (progress > 50) return '#eab308'; // Yellow
                                                        if (progress > 25) return '#f97316'; // Orange
                                                        return '#ef4444'; // Red
                                                    })(),
                                                    borderRadius: '3px'
                                                }}></div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                                            {(project.milestones || [])
                                                .sort((a, b) => a.milestone_number - b.milestone_number)
                                                .map(m => {
                                                    let bg = '#ef4444'; // Red (0-25)
                                                    let color = 'white';
                                                    if (m.progress > 75) {
                                                        bg = '#22c55e'; // Green (76-100)
                                                    } else if (m.progress > 50) {
                                                        bg = '#eab308'; // Yellow (51-75)
                                                        color = 'black';
                                                    } else if (m.progress > 25) {
                                                        bg = '#f97316'; // Orange (26-50)
                                                    }

                                                    return (
                                                        <span key={m.id} style={{
                                                            background: bg,
                                                            color: color,
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            display: 'inline-block'
                                                        }} title={`${m.name}: ${m.progress}%`}>
                                                            #{m.milestone_number}
                                                        </span>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    <div className="card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {isFinancial && (
                                            <>
                                                <span className="font-medium" style={{ fontSize: '1rem' }} title="Budget">
                                                    Bu: ${project.budget?.toLocaleString() || '0'}
                                                </span>
                                                <span className="font-medium" style={{ fontSize: '1rem', color: '#22c55e' }} title="Remaining Value (Unbilled)">
                                                    Rem: ${project.remaining_value?.toLocaleString() || '0'}
                                                </span>
                                                <span className="font-medium" style={{ fontSize: '1rem', color: project.financial_progress > 100 ? 'var(--error)' : 'var(--primary)' }} title="Billed % (Not VS Budget)">
                                                    Bi: {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                                </span>
                                            </>
                                        )}
                                        <span style={{
                                            color: (() => {
                                                if (!project.due_date) return 'var(--text-secondary)';
                                                const due = new Date(project.due_date);
                                                const now = new Date();
                                                const diffTime = due - now;
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                if (diffDays > 7) return '#22c55e'; // Green
                                                if (diffDays <= 3 && diffDays > 0) return '#eab308'; // Yellow
                                                if (diffDays <= 0) return '#ef4444'; // Red
                                                return 'var(--text-secondary)';
                                            })(),
                                            fontSize: '0.8em',
                                            alignSelf: 'flex-end',
                                            fontWeight: '500'
                                        }}>
                                            Due: {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '1rem' }}>
                    <table className="data-table" style={{ minWidth: 'max-content' }}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('project_unique_id')} style={{ cursor: 'pointer' }}>Number {sortField === 'project_unique_id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer_po')} style={{ cursor: 'pointer' }}>PO # {sortField === 'customer_po' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>Location {sortField === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('pm')} style={{ cursor: 'pointer' }}>Internal PM {sortField === 'pm' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('project_type')} style={{ cursor: 'pointer' }}>Type {sortField === 'project_type' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('lead_id')} style={{ cursor: 'pointer' }}>Lead {sortField === 'lead_id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                {isFinancial && (
                                    <>
                                        <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>Budget {sortField === 'budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('remaining')} style={{ cursor: 'pointer' }}>Remaining {sortField === 'remaining' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('financial_progress')} style={{ cursor: 'pointer' }}>Billed % {sortField === 'financial_progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    </>
                                )}
                                <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>Progress {sortField === 'progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('start_date')} style={{ cursor: 'pointer' }}>Start Date {sortField === 'start_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProjects.map((project) => {
                                const progress = project.milestones?.length > 0
                                    ? project.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / project.milestones.length
                                    : 0;

                                return (
                                    <tr key={project.id} style={{ cursor: isBulkEditing ? 'default' : 'pointer', background: editBuffer[project.id] ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }} onClick={() => { if(!isBulkEditing) window.location.href = `/portal/projects/${project.id}` }}>
                                        <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>{project.project_unique_id}</td>
                                        <td className="font-medium">
                                            {isBulkEditing ? (
                                                <input type="text" value={editBuffer[project.id]?.name !== undefined ? editBuffer[project.id].name : project.name} onChange={e => handleBulkChange(project.id, 'name', e.target.value)} style={{ width: '150px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {project.name}
                                                    {project.do_not_invoice && (
                                                        <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: 'white', padding: '0.15rem 0.3rem', borderRadius: '4px', fontWeight: 'bold' }}>Do Not Invoice</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <input type="text" value={editBuffer[project.id]?.customer_po !== undefined ? editBuffer[project.id].customer_po : (project.customer_po || '')} onChange={e => handleBulkChange(project.id, 'customer_po', e.target.value)} style={{ width: '80px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (project.customer_po || '-')}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <select value={editBuffer[project.id]?.customer_id !== undefined ? (editBuffer[project.id].customer_id || '') : (project.customer_id || '')} onChange={e => handleBulkChange(project.id, 'customer_id', parseInt(e.target.value) || null)} style={{ width: '120px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="">- Customer -</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            ) : (customers.find(c => c.id === project.customer_id)?.name || project.customer_id || '-')}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <select value={editBuffer[project.id]?.location_id !== undefined ? (editBuffer[project.id].location_id || '') : (project.location_id || '')} onChange={e => handleBulkChange(project.id, 'location_id', parseInt(e.target.value) || null)} style={{ width: '120px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="">- Location -</option>
                                                    {locations.filter(l => l.customer_id === (editBuffer[project.id]?.customer_id || project.customer_id)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            ) : (locations.find(l => l.id === project.location_id)?.name || '-')}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <select value={editBuffer[project.id]?.pm_id !== undefined ? (editBuffer[project.id].pm_id || '') : (project.pm_id || '')} onChange={e => handleBulkChange(project.id, 'pm_id', parseInt(e.target.value) || null)} style={{ width: '110px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="">- Internal PM -</option>
                                                    {users.filter(u => u.is_employee).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                                </select>
                                            ) : (users.find(u => u.id === project.pm_id)?.username || '-')}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <select value={editBuffer[project.id]?.project_type !== undefined ? editBuffer[project.id].project_type : (project.project_type || 'Other')} onChange={e => handleBulkChange(project.id, 'project_type', e.target.value)} style={{ width: '100px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="None">None</option><option value="Preset Controller">Preset Controller</option><option value="Additive System">Additive System</option><option value="Blending System">Blending System</option><option value="PLC System">PLC System</option><option value="Automation System">Automation System</option><option value="Visualization System">Visualization System</option><option value="Design">Design</option><option value="Hardware">Hardware</option><option value="Programming">Programming</option><option value="Project Management">Project Management</option><option value="Field Services">Field Services</option><option value="Small Project">Small Project</option><option value="Engineering">Engineering</option><option value="Consulting">Consulting</option><option value="Support">Support</option><option value="Other">Other</option>
                                                </select>
                                            ) : (project.project_type || '-')}
                                        </td>
                                        <td>
                                            {project.lead_id ? (
                                                <span 
                                                    style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/portal/leads/edit/${project.lead_id}`;
                                                    }}
                                                >
                                                    L-{project.lead_id}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <select value={editBuffer[project.id]?.status !== undefined ? editBuffer[project.id].status : (project.status || 'active')} onChange={e => handleBulkChange(project.id, 'status', e.target.value)} style={{ width: '90px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="active">Active</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                            ) : (<span className="status-badge status-active">{project.status}</span>)}
                                        </td>
                                        {isFinancial && (
                                            <>
                                                <td>
                                                    {isBulkEditing ? (
                                                        <input type="number" step="1" value={editBuffer[project.id]?.budget !== undefined ? editBuffer[project.id].budget : (project.budget || 0)} onChange={e => handleBulkChange(project.id, 'budget', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                                    ) : (`$${project.budget?.toLocaleString() || '0'}`)}
                                                </td>
                                                <td>${project.remaining_value?.toLocaleString() || '0'}</td>
                                                <td className="font-medium" style={{ color: project.financial_progress > 100 ? 'var(--error)' : 'inherit' }}>
                                                    {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                                </td>
                                            </>
                                        )}
                                        <td style={{ minWidth: '100px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${progress}%`, height: '100%', background: (() => {
                                                            if (progress > 75) return '#22c55e'; // Green
                                                            if (progress > 50) return '#eab308'; // Yellow
                                                            if (progress > 25) return '#f97316'; // Orange
                                                            return '#ef4444'; // Red
                                                        })(), borderRadius: '3px'
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem' }}>{progress.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <input type="date" value={editBuffer[project.id]?.start_date !== undefined ? editBuffer[project.id].start_date?.split('T')[0] : (project.start_date?.split('T')[0] || '')} onChange={e => handleBulkChange(project.id, 'start_date', e.target.value || null)} style={{ width: '110px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (project.start_date ? new Date(project.start_date).toLocaleDateString() : '-')}
                                        </td>
                                        <td>
                                            {isBulkEditing ? (
                                                <input type="date" value={editBuffer[project.id]?.due_date !== undefined ? editBuffer[project.id].due_date?.split('T')[0] : (project.due_date?.split('T')[0] || '')} onChange={e => handleBulkChange(project.id, 'due_date', e.target.value || null)} style={{ width: '110px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                {project.remaining_value > 0 && !project.do_not_invoice && (
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href=`/portal/invoices/new?project_id=${project.id}`; }}
                                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                                                        title="Quick Create Invoice"
                                                    >
                                                        + Invoice
                                                    </button>
                                                )}
                                                <Link to={`/portal/projects/${project.id}`} title="View/Edit Project" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProjectList;
