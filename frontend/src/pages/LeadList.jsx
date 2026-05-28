import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { log, showToast } from '../utils/logger';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import useSessionState from '../hooks/useSessionState';
import SmartCloneWizard from '../components/SmartCloneWizard';
import LeadToMilestoneModal from '../components/LeadToMilestoneModal';

const LeadList = () => {
    const [leads, setLeads] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useSessionState('lead_list_viewMode', 'list');
    const [sortField, setSortField] = useSessionState('lead_list_sortField', 'created_at');
    const [sortOrder, setSortOrder] = useSessionState('lead_list_sortOrder', 'desc');
    const [filterCustomer, setFilterCustomer] = useSessionState('lead_list_filterCustomer', 'all');
    const [filterCreator, setFilterCreator] = useSessionState('lead_list_filterCreator', 'all');
    const [filterStatus, setFilterStatus] = useSessionState('lead_list_filterStatus', 'all');
    
    // New Multi-Select Hide State
    const [hideStatuses, setHideStatuses] = useSessionState('lead_list_hideStatuses', ['converted']);
    const [showHideDropdown, setShowHideDropdown] = useState(false);
    
    // The available statuses for the Lead module
    const allStatuses = ['new', 'contacted', 'qualified', 'proposal', 'proposal_sent', 'lost', 'converted'];
    
    // AI Clone Wizard State
    const [showSmartClone, setShowSmartClone] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState(null);

    // Lead to Milestone Modal State
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [selectedLeadForMilestone, setSelectedLeadForMilestone] = useState(null);
    
    // Bulk Edit State
    const [editBuffer, setEditBuffer] = useState({});
    
    const navigate = useNavigate();

    const handleBulkChange = (id, field, value) => {
        setEditBuffer(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    const saveBulkEdits = async () => {
        const payload = Object.keys(editBuffer).map(id => ({
            id: parseInt(id),
            ...editBuffer[id]
        }));
        if (payload.length === 0) {
            setViewMode('list');
            return;
        }
        try {
            await api.put('/leads/bulk', payload);
            const data = await api.get('/leads/');
            setLeads(data);
            setViewMode('list');
            setEditBuffer({});
        } catch (err) {
            console.error("Bulk save failed", err);
            alert("Failed to save bulk edits. Check connection or schema constraints.");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leadsData, customersData, locationsData] = await Promise.all([
                    api.get('/leads/'),
                    api.get('/customers/'),
                    api.get('/locations/')
                ]);
                setLeads(leadsData);
                setCustomers(customersData);
                setLocations(locationsData);
            } catch (err) {
                log.error('LeadList', 'Failed to fetch initial page data (leads, customers, locations)', err);
                showToast('Failed to load leads and reference data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Derive unique customers for filter
    const uniqueCustomers = [...new Set(leads.map(lead =>
        lead.customer ? lead.customer.name : 'Unknown Customer'
    ).filter(Boolean))].sort();

    // Derive unique creators for filter
    const uniqueCreators = [...new Set(leads.map(lead =>
        lead.poc ? lead.poc.username : 'Unassigned'
    ).filter(Boolean))].sort();

    const filteredLeads = leads.filter(lead => {
        // Hide Status Array Filter
        if (hideStatuses.includes(lead.status) || hideStatuses.includes(lead.status?.toLowerCase())) return false;

        // Status Filter
        if (filterStatus !== 'all' && (lead.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

        // Customer Filter
        const leadCustomer = lead.customer ? lead.customer.name : 'Unknown Customer';
        if (filterCustomer !== 'all' && leadCustomer !== filterCustomer) return false;

        // Creator Filter
        const leadCreator = lead.poc ? lead.poc.username : 'Unassigned';
        if (filterCreator !== 'all' && leadCreator !== filterCreator) return false;

        return true;
    });

    const sortedLeads = [...filteredLeads].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle nested or calculated fields
        if (sortField === 'customer') {
            aValue = a.customer ? a.customer.name : '';
            bValue = b.customer ? b.customer.name : '';
        } else if (sortField === 'location') {
            aValue = a.location ? a.location.name : '-- All Sites --';
            bValue = b.location ? b.location.name : '-- All Sites --';
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? String(bValue).toLowerCase() : '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const handleConvert = (lead) => {
        navigate(`/portal/projects/new?leadId=${lead.id}&name=${encodeURIComponent(lead.name)}`);
    };

    const handleExportCSV = () => {
        exportToCSV(sortedLeads, [
            { header: 'ID', accessor: 'id' },
            { header: 'Name', accessor: 'name' },
            { header: 'Email', accessor: 'email' },
            { header: 'Customer', accessor: (l) => l.customer ? l.customer.name : '' },
            { header: 'Location', accessor: (l) => l.location ? l.location.name : '-- All Sites --' },
            { header: 'Description', accessor: 'description' },
            { header: 'Value', accessor: 'estimated_value' },
            { header: 'Status', accessor: 'status' },
            { header: 'Due Date', accessor: (l) => l.due_date ? new Date(l.due_date).toLocaleDateString() : '' },
            { header: 'Created At', accessor: (l) => new Date(l.created_at).toLocaleDateString() },
            { header: 'Customer', accessor: (l) => l.customer ? l.customer.name : '' },
            { header: 'Lead Creator', accessor: (l) => l.poc ? l.poc.username : '' },
            { header: 'Customer Contact', accessor: (l) => l.customer_contact_user ? l.customer_contact_user.username : '' }
        ], 'leads_export.csv');
    };

    const handleExportPDF = () => {
        exportToPDF(sortedLeads, [
            { header: 'ID', accessor: 'id' },
            { header: 'Name', accessor: 'name' },
            { header: 'Customer', accessor: (l) => l.customer ? l.customer.name : '-' },
            { header: 'Location', accessor: (l) => l.location ? l.location.name : '-- All Sites --' },
            { header: 'Email', accessor: 'email' },
            { header: 'Value', accessor: (l) => l.estimated_value ? `$${l.estimated_value.toLocaleString()}` : '-' },
            { header: 'Status', accessor: 'status' },
            { header: 'Customer', accessor: (l) => l.customer ? l.customer.name : '-' },
            { header: 'Lead Creator', accessor: (l) => l.poc ? l.poc.username : '-' },
            { header: 'Customer Contact', accessor: (l) => l.customer_contact_user ? l.customer_contact_user.username : '-' },
            { header: 'Due Date', accessor: (l) => l.due_date ? new Date(l.due_date).toLocaleDateString() : '-' }
        ], 'Leads Report', 'leads_report.pdf');
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Leads...</div>;

    const LeadActions = ({ lead }) => (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
                onClick={() => navigate(`/portal/leads/edit/${lead.id}`)}
                title="Edit Lead"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            {lead.project ? (
                <button
                    onClick={() => navigate(`/portal/projects/${lead.project.id}`)}
                    className="btn-secondary"
                    title="View Linked Project"
                    style={{ fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.6rem' }}
                >
                    {lead.project.name} ↗
                </button>
            ) : lead.milestone ? (
                <button
                    onClick={() => navigate(`/portal/projects/${lead.milestone.project_id}`)}
                    className="btn-secondary"
                    title="View Linked Milestone"
                    style={{ fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.6rem' }}
                >
                    ms: {lead.milestone.name} ↗
                </button>
            ) : (
                <>
                    {(lead.status || '').toLowerCase() !== 'converted' && (
                        <button
                            onClick={() => {
                                setSelectedLeadId(lead.id);
                                setShowSmartClone(true);
                            }}
                            className="btn-secondary"
                            title="AI CloneWiz Project Template"
                            style={{ fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.6rem', color: 'var(--primary)', borderColor: 'var(--primary)', background: 'transparent' }}
                        >
                            🚀 AI CloneWiz
                        </button>
                    )}
                    <button
                        onClick={() => handleConvert(lead)}
                        className="btn-secondary"
                        title="Manual Convert to Project"
                        style={{ color: '#22c55e', borderColor: '#22c55e', padding: '0.25rem 0.6rem', fontSize: '0.85rem', background: 'transparent' }}
                    >
                        Project
                    </button>
                    <button
                        onClick={() => {
                            setSelectedLeadForMilestone(lead);
                            setShowMilestoneModal(true);
                        }}
                        className="btn-secondary"
                        title="Manual Convert to Milestone"
                        style={{ color: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.25rem 0.6rem', fontSize: '0.85rem', background: 'transparent' }}
                    >
                        Milestone
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                        <h2>Leads</h2>
                    </div>



                    {viewMode === 'grid' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                            <select
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <option value="created_at" style={{ color: 'black' }}>Date Created</option>
                                <option value="name" style={{ color: 'black' }}>Name</option>
                                <option value="customer" style={{ color: 'black' }}>Customer</option>
                                <option value="location" style={{ color: 'black' }}>Location</option>
                                <option value="estimated_value" style={{ color: 'black' }}>Value</option>
                                <option value="status" style={{ color: 'black' }}>Status</option>
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
                                    background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
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
                                    background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
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
                                onClick={() => setViewMode('bulk')}
                                style={{
                                    background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px'
                                }}
                                title="Bulk Edit Mode"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            </button>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            {filteredLeads.length} Records Displayed
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                    {/* Filters Group - Moved to Right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '120px' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Status</option>
                            <option value="new" style={{ color: 'black' }}>New</option>
                            <option value="contacted" style={{ color: 'black' }}>Contacted</option>
                            <option value="qualified" style={{ color: 'black' }}>Qualified</option>
                            <option value="proposal" style={{ color: 'black' }}>Proposal</option>
                            <option value="proposal_sent" style={{ color: 'black' }}>Proposal Sent</option>
                            <option value="lost" style={{ color: 'black' }}>Lost</option>
                            <option value="converted" style={{ color: 'black' }}>Converted</option>
                        </select>

                        <select
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '150px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Customers</option>
                            {uniqueCustomers.map(c => (
                                <option key={c} value={c} style={{ color: 'black' }}>{c}</option>
                            ))}
                        </select>

                        <select
                            value={filterCreator}
                            onChange={(e) => setFilterCreator(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '150px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                        >
                            <option value="all" style={{ color: 'black' }}>All Creators</option>
                            {uniqueCreators.map(c => (
                                <option key={c} value={c} style={{ color: 'black' }}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setShowHideDropdown(!showHideDropdown)}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        >
                            👁️ Hide ({hideStatuses.length})
                        </button>
                        {showHideDropdown && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10, minWidth: '150px' }}>
                                {allStatuses.map(s => (
                                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={hideStatuses.includes(s)} 
                                            onChange={() => {
                                                setHideStatuses(prev => 
                                                    prev.includes(s) ? prev.filter(st => st !== s) : [...prev, s]
                                                );
                                            }} 
                                        />
                                        {s.toUpperCase()}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleExportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={handleExportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <button onClick={() => navigate('/portal/leads/new')} className="btn btn-primary">
                        + New Lead
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedLeads.map((lead) => {
                        const created = new Date(lead.created_at);
                        const now = new Date();
                        const diffDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));
                        return (
                            <div className="card" key={lead.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{lead.name}</h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto', paddingLeft: '0.5rem' }}>
                                        {lead.display_id || `L-${lead.id}`}
                                    </div>
                                    <span className={`status-badge status-${(lead.status || '').toLowerCase() === 'converted' ? 'completed' : (lead.status || '').toLowerCase() === 'new' ? 'active' : 'draft'}`}>
                                        {(lead.status || 'new').toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '1rem', flex: 1 }}>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontWeight: '500' }}>
                                        {lead.customer ? lead.customer.name : 'Unknown Customer'}
                                    </p>
                                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>
                                        {lead.location ? lead.location.name : '-- All Sites --'}
                                    </p>
                                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                                        {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '$0'}
                                    </p>
                                    {lead.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{String(lead.description).substring(0, 60)}...</p>}
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created: {diffDays} days ago</span>
                                        {lead.due_date && (
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                color: (() => {
                                                    const due = new Date(lead.due_date);
                                                    const now = new Date();
                                                    const diffTime = due - now;
                                                    const dDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    if (dDays > 7) return '#22c55e'; // Green
                                                    if (dDays <= 3 && dDays > 0) return '#eab308'; // Yellow
                                                    if (dDays <= 0) return '#ef4444'; // Red
                                                    return 'var(--text-muted)';
                                                })()
                                            }}>
                                                Due: {new Date(lead.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <LeadActions lead={lead} />
                                </div>
                            </div>
                        );
                    })}
                    {sortedLeads.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No leads found.</p>}
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto', paddingBottom: viewMode === 'bulk' ? '3rem' : '0' }}>
                    {viewMode === 'bulk' && (
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Bulk Edit Mode: {filteredLeads.length} Leads</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: Object.keys(editBuffer).length > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                                    {Object.keys(editBuffer).length} unsaved changes
                                </span>
                                <button onClick={() => { setViewMode('list'); setEditBuffer({}); }} className="btn-secondary">Cancel</button>
                                <button onClick={saveBulkEdits} className="btn-save" disabled={Object.keys(editBuffer).length === 0}>
                                    Save All Changes
                                </button>
                            </div>
                        </div>
                    )}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>Lead # {sortField === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('location')} style={{ cursor: 'pointer' }}>Location {sortField === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('project_type')} style={{ cursor: 'pointer' }}>Type {sortField === 'project_type' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('estimated_value')} style={{ cursor: 'pointer' }}>Value {sortField === 'estimated_value' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Age {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedLeads.map((lead) => {
                                const created = new Date(lead.created_at);
                                const now = new Date();
                                const diffDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));

                                const currentVals = editBuffer[lead.id] || {};
                                const rName = currentVals.name !== undefined ? currentVals.name : lead.name;
                                const rVal = currentVals.estimated_value !== undefined ? currentVals.estimated_value : lead.estimated_value;
                                const rStatus = currentVals.status !== undefined ? currentVals.status : lead.status;
                                const rType = currentVals.project_type !== undefined ? currentVals.project_type : lead.project_type;

                                return (
                                    <tr key={lead.id} style={{ background: editBuffer[lead.id] ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}>
                                        <td style={{ fontWeight: '500', color: 'var(--text-muted)' }}>
                                            {lead.display_id || `L-${lead.id}`}
                                        </td>
                                        <td className="font-medium">
                                            {viewMode === 'bulk' ? (
                                                <input type="text" value={rName || ''} onChange={e => handleBulkChange(lead.id, 'name', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (
                                                <>
                                                    {lead.name}
                                                    {lead.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{String(lead.description).substring(0, 50)}...</div>}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            {viewMode === 'bulk' ? (
                                                <select 
                                                    value={currentVals.customer_id !== undefined ? (currentVals.customer_id || '') : (lead.customer_id || '')} 
                                                    onChange={e => handleBulkChange(lead.id, 'customer_id', parseInt(e.target.value) || null)} 
                                                    style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                >
                                                    <option value="">-- No Customer --</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            ) : (
                                                lead.customer ? lead.customer.name : '-'
                                            )}
                                        </td>
                                        <td>
                                            {viewMode === 'bulk' ? (
                                                <select 
                                                    value={currentVals.location_id !== undefined ? (currentVals.location_id || '') : (lead.location_id || '')} 
                                                    onChange={e => handleBulkChange(lead.id, 'location_id', parseInt(e.target.value) || null)} 
                                                    style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                >
                                                    <option value="">-- All Sites --</option>
                                                    {locations
                                                        .filter(l => {
                                                            const custId = currentVals.customer_id !== undefined ? currentVals.customer_id : lead.customer_id;
                                                            return custId ? l.customer_id === custId : true;
                                                        })
                                                        .map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                                                    }
                                                </select>
                                            ) : (
                                                lead.location ? lead.location.name : '-- All Sites --'
                                            )}
                                        </td>
                                        <td>
                                            {viewMode === 'bulk' ? (
                                                <select value={rType || 'Other'} onChange={e => handleBulkChange(lead.id, 'project_type', e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="Fixed Price">Fixed Price</option>
                                                    <option value="T&M">T&M</option>
                                                    <option value="Retainer">Retainer</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            ) : (lead.project_type || 'Other')}
                                        </td>
                                        <td>
                                            {viewMode === 'bulk' ? (
                                                <input type="number" step="100" value={rVal !== null ? rVal : ''} onChange={e => handleBulkChange(lead.id, 'estimated_value', parseFloat(e.target.value) || 0)} style={{ width: '100px', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                            ) : (
                                                lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'
                                            )}
                                        </td>
                                        <td>{diffDays} days</td>
                                        <td>
                                            {viewMode === 'bulk' ? (
                                                <select value={rStatus || 'new'} onChange={e => handleBulkChange(lead.id, 'status', e.target.value)} style={{ padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                    <option value="new">New</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="qualified">Qualified</option>
                                                    <option value="proposal">Proposal</option>
                                                    <option value="proposal_sent">Proposal Sent</option>
                                                    <option value="lost">Lost</option>
                                                    <option value="converted">Converted</option>
                                                </select>
                                            ) : (
                                                <span className={`status-badge status-${(lead.status || '').toLowerCase() === 'converted' ? 'completed' : (lead.status || '').toLowerCase() === 'new' ? 'active' : 'draft'}`}>
                                                    {(lead.status || 'new').toUpperCase()}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <LeadActions lead={lead} />
                                        </td>
                                    </tr>
                                );
                            })}
                            {leads.length === 0 && (
                                <tr className="empty-row">
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No leads found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <SmartCloneWizard 
                isOpen={showSmartClone} 
                onClose={() => setShowSmartClone(false)} 
                defaultLeadId={selectedLeadId} 
            />
            <LeadToMilestoneModal
                isOpen={showMilestoneModal}
                onClose={() => setShowMilestoneModal(false)}
                lead={selectedLeadForMilestone}
                onSuccess={(newMilestone) => {
                    setShowMilestoneModal(false);
                    // Navigate to the parent project
                    navigate(`/portal/projects/${newMilestone.project_id}`);
                }}
            />
        </div>
    );
};

export default LeadList;
