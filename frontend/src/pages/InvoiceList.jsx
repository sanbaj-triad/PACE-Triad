import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import XeroLogModal from '../components/XeroLogModal';
import useSessionState from '../hooks/useSessionState';

const InvoiceList = ({ projectId }) => {
    const scope = projectId ? `_${projectId}` : '_global';
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useSessionState(`invoice_list${scope}_viewMode`, projectId ? 'list' : 'grid');
    const [filterCustomer, setFilterCustomer] = useSessionState(`invoice_list${scope}_filterCustomer`, 'all');
    const [filterProject, setFilterProject] = useSessionState(`invoice_list${scope}_filterProject`, 'all');
    const [filterStatus, setFilterStatus] = useSessionState(`invoice_list${scope}_filterStatus`, 'all');
    const [sortField, setSortField] = useSessionState(`invoice_list${scope}_sortField`, 'issue_date');
    const [sortOrder, setSortOrder] = useSessionState(`invoice_list${scope}_sortOrder`, 'desc');
    const [showXeroLogs, setShowXeroLogs] = useState(false);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const data = await api.get(`/invoices/?t=${new Date().getTime()}`);
                if (projectId) {
                    setInvoices(data.filter(i => i.project_id === parseInt(projectId)));
                } else {
                    setInvoices(data);
                }
            } catch (err) {
                console.error("Failed to load invoices", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, [projectId]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };



    const [hideStatus, setHideStatus] = useState('none');

    // Derived unique values for filters
    const uniqueCustomers = [...new Set(invoices.map(i => i.project?.customer?.name || '').filter(Boolean))].sort();
    const uniqueProjects = [...new Set(invoices.map(i => i.project?.name || '').filter(Boolean))].sort();

    const filteredInvoices = invoices.filter(i => {
        if (filterStatus !== 'all') {
            if (filterStatus === 'overdue') {
                if (i.status === 'paid' || i.status === 'void' || i.status === 'cancelled') return false;
                if (!i.due_date) return false;
                const due = new Date(i.due_date);
                const now = new Date();
                due.setHours(0,0,0,0);
                now.setHours(0,0,0,0);
                if (due >= now) return false; // Not overdue
            } else if (i.status !== filterStatus) {
                return false;
            }
        }

        if (hideStatus === 'sent' && i.status === 'sent') return false;
        if (hideStatus === 'paid' && i.status === 'paid') return false;
        if (hideStatus === 'both' && (i.status === 'sent' || i.status === 'paid')) return false;

        const iCustomer = i.project?.customer?.name || '';
        if (filterCustomer !== 'all' && iCustomer !== filterCustomer) return false;

        const iProject = i.project?.name || '';
        if (filterProject !== 'all' && iProject !== filterProject) return false;

        return true;
    });

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Derived
        if (sortField === 'project') {
            aValue = a.project ? a.project.name : (a.project_id || '');
            bValue = b.project ? b.project.name : (b.project_id || '');
        } else if (sortField === 'total') {
            aValue = a.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0;
            bValue = b.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0;
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

    const downloadPdfSecure = async (e, invoice) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await fetch(`/invoices/${invoice.id}/download-pdf`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                let rawProj = invoice.project?.project_unique_id || 'UNKNOWN';
                if (rawProj.startsWith('P-')) rawProj = rawProj.substring(2);
                const safeProj = rawProj.replace(/[^a-zA-Z0-9-_]/g, '');
                
                let rawInv = invoice.invoice_number;
                if (rawInv.startsWith('I-')) rawInv = rawInv.substring(2);
                const safeInv = rawInv.replace(/[^a-zA-Z0-9-_]/g, '');
                
                a.download = `INV_P-${safeProj}_I-${safeInv}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Failed to download PDF");
            }
        } catch (error) {
            console.error("Download failed", error);
        }
    }

    const getMilestoneNames = (invoice) => {
        if (!invoice.items || invoice.items.length === 0) return null;
        const milestones = [...new Set(invoice.items.filter(i => i.milestone).map(i => i.milestone.name))];
        if (milestones.length === 0) return null;
        return milestones.join(', ');
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className={projectId ? "" : "dashboard-container"}>
            {!projectId && (
                <div className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

                        <h2>Invoices</h2>


                        {viewMode === 'grid' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                                <select
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    <option value="issue_date">Date</option>
                                    <option value="due_date">Due Date</option>
                                    <option value="invoice_number">Number</option>
                                    <option value="project">Project</option>
                                    <option value="milestone">Milestone</option>
                                    <option value="total">Total</option>
                                    <option value="status">Status</option>
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
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {sortedInvoices.length} Records Displayed
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
                                <option value="all">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '140px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                            >
                                <option value="all">All Projects</option>
                                {uniqueProjects.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>

                            <select
                                value={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '140px', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}
                            >
                                <option value="all">All Customers</option>
                                {uniqueCustomers.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => {
                                const columns = [
                                    { header: 'Number', accessor: 'invoice_number' },
                                    { header: 'Project', accessor: (i) => i.project ? i.project.name : i.project_id },
                                    { header: 'Date', accessor: (i) => new Date(i.issue_date).toLocaleDateString() },
                                    { header: 'Due', accessor: (i) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '-' },
                                    { header: 'Total', accessor: (i) => `$${(i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0).toLocaleString()}` },
                                    { header: 'Balance', accessor: (i) => `$${((i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0) - (i.amount_paid || 0)).toLocaleString()}` },
                                    { header: 'Status', accessor: 'status' }
                                ];
                                import('../utils/exportUtils').then(({ exportToCSV }) => {
                                    exportToCSV(sortedInvoices, columns, 'invoices.csv');
                                });
                            }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                            <button onClick={() => {
                                const columns = [
                                    { header: 'Number', accessor: 'invoice_number' },
                                    { header: 'Project', accessor: (i) => i.project ? i.project.name : i.project_id },
                                    { header: 'Date', accessor: (i) => new Date(i.issue_date).toLocaleDateString() },
                                    { header: 'Due', accessor: (i) => i.due_date ? new Date(i.due_date).toLocaleDateString() : '-' },
                                    { header: 'Total', accessor: (i) => `$${(i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0).toLocaleString()}` },
                                    { header: 'Balance', accessor: (i) => `$${((i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0) - (i.amount_paid || 0)).toLocaleString()}` },
                                    { header: 'Status', accessor: 'status' }
                                ];
                                import('../utils/exportUtils').then(({ exportToPDF }) => {
                                    exportToPDF(sortedInvoices, columns, 'Invoice List', 'invoices.pdf');
                                });
                            }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </button>
                            <button onClick={() => setShowXeroLogs(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Audit Xero Logs">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                Xero Logs
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Hide:</span>
                            <select
                                value={hideStatus}
                                onChange={(e) => setHideStatus(e.target.value)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                <option value="none">None</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="both">Sent & Paid</option>
                            </select>
                        </div>

                        <Link to="/portal/invoices/new">
                            <button className="btn-primary">+ New Invoice</button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Embedded Toolbar if projectId exists */}
            {projectId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Project Invoices</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Link to={`/portal/invoices/new?project_id=${projectId}`}>
                            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>+ New Invoice</button>
                        </Link>
                    </div>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedInvoices.map((invoice) => {
                        const total = invoice?.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
                        const project = invoice?.project || {};
                        const customer = project.customer || {};
                        return (
                            <Link to={`/portal/invoices/${invoice.id}`} key={invoice.id} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h3 style={{ marginBottom: 0 }}>
                                            {invoice.invoice_number}
                                            {invoice.xero_id && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#0ea5e9' }} title="Synced to Xero">☁️</span>}
                                        </h3>
                                        <span className={`status-badge ${invoice.status === 'paid' ? 'status-active' : ''}`}>
                                            {invoice.status === 'Sent' && invoice.amount_paid > 0 ? 'Partial' : (invoice.status === 'Sent' ? 'Open' : invoice.status)}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                            {project.name ? `${project.name} (${project.project_unique_id || '-'})` : `Project ID: ${invoice.project_id}`}
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {customer.name || 'Unknown Customer'}
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}</p>
                                        <p style={{
                                            margin: '0.25rem 0 0 0', fontWeight: '500', color: (() => {
                                                if (!invoice.due_date) return 'var(--text-muted)';
                                                const due = new Date(invoice.due_date);
                                                const now = new Date();
                                                const diffTime = due - now;
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                if (diffDays > 7) return '#22c55e'; // Green
                                                if (diffDays <= 3 && diffDays > 0) return '#eab308'; // Yellow
                                                if (diffDays <= 0) return '#ef4444'; // Red
                                                return 'var(--text-muted)';
                                            })()
                                        }}>
                                            Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            {invoice.created_by_user?.username || 'System'}
                                        </p>
                                    </div>
                                    <div className="card-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="font-medium" style={{ fontSize: '1.2rem' }}>${total.toLocaleString()}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                {invoice.amount_paid > 0 && <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 'bold' }}>Bal: ${(total - invoice.amount_paid).toLocaleString()}</span>}
                                                <button title="Download PDF" onClick={(e) => downloadPdfSecure(e, invoice)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                </button>
                                            </div>
                                        </div>
                                        {getMilestoneNames(invoice) && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Miles: {getMilestoneNames(invoice)}</div>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                    {invoices.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No invoices found.</p>}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('invoice_number')} style={{ cursor: 'pointer' }}>Number {sortField === 'invoice_number' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('project')} style={{ cursor: 'pointer' }}>Project {sortField === 'project' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Milestone</th>
                                <th onClick={() => handleSort('issue_date')} style={{ cursor: 'pointer' }}>Issue Date {sortField === 'issue_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('total')} style={{ cursor: 'pointer' }}>Total {sortField === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Balance</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Creator</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedInvoices.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td></tr>
                            ) : (
                                sortedInvoices.map((invoice) => {
                                    const total = invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
                                    const project = invoice.project || {};
                                    const customer = project.customer || {};
                                    return (
                                        <tr key={invoice.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/portal/invoices/${invoice.id}`}>
                                            <td className="font-medium">{invoice.invoice_number}</td>
                                            <td>{project.name ? `${project.name} (${project.project_unique_id || '-'})` : invoice.project_id}</td>
                                            <td>{customer.name || '-'}</td>
                                            <td>{getMilestoneNames(invoice) || '-'}</td>
                                            <td>{new Date(invoice.issue_date).toLocaleDateString()}</td>
                                            <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                                            <td className="font-medium">${total.toLocaleString()}</td>
                                            <td className="font-medium" style={{ color: total - (invoice.amount_paid || 0) <= 0 ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                                ${(total - (invoice.amount_paid || 0)).toLocaleString()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {invoice.xero_id && <span title="Synced to Xero" style={{ fontSize: '0.8rem' }}>☁️</span>}
                                                    <span className={`status-badge ${invoice.status === 'paid' ? 'status-active' : ''}`}>
                                                        {invoice.status === 'Sent' && invoice.amount_paid > 0 ? 'Partial' : (invoice.status === 'Sent' ? 'Open' : invoice.status)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {invoice.created_by_user?.username || 'System'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <Link to={`/portal/invoices/${invoice.id}`} title="View Invoice" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </Link>
                                                    <button title="Download PDF" onClick={(e) => downloadPdfSecure(e, invoice)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {showXeroLogs && <XeroLogModal onClose={() => setShowXeroLogs(false)} />}
        </div>
    );
};

export default InvoiceList;
