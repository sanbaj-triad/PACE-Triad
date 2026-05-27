import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';


const Reports = ({ view }) => {
    // Data State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter/Sort State
    const [filterCustomer, setFilterCustomer] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let endpoint = '/projects/';
                if (view === 'leads') endpoint = '/leads/';

                const result = await api.get(endpoint);
                setData(result);
            } catch (err) {
                console.error("Failed to load report data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        // Reset filters on view change
        setFilterStatus('all');
        setFilterCustomer('all');
        setSortField('name');
    }, [view]);

    // --- Helpers ---
    const getCustomerName = (item) => {
        if (view === 'leads') return item.company || (item.customer ? item.customer.name : '');
        return item.customer?.name || '';
    };

    const uniqueCustomers = [...new Set(data.map(item => getCustomerName(item)).filter(Boolean))].sort();

    const filteredData = data.filter(item => {
        if (filterStatus !== 'all' && item.status !== filterStatus) return false;
        const cName = getCustomerName(item);
        if (filterCustomer !== 'all' && cName !== filterCustomer) return false;
        return true;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Custom Sort Logic based on View
        if (sortField === 'customer') {
            aValue = getCustomerName(a);
            bValue = getCustomerName(b);
        } else if (view === 'financial' || view === 'projects') {
            // Project numerical fields
            if (sortField === 'budget') { aValue = a.budget || 0; bValue = b.budget || 0; }
            if (sortField === 'actual') { aValue = a.current_value || 0; bValue = b.current_value || 0; }
            if (sortField === 'billed') { aValue = a.total_billed || 0; bValue = b.total_billed || 0; }
            if (sortField === 'remaining') { aValue = (a.current_value || 0) - (a.total_billed || 0); bValue = (b.current_value || 0) - (b.total_billed || 0); }
        } else if (view === 'leads') {
            if (sortField === 'estimated_value') { aValue = a.estimated_value || 0; bValue = b.estimated_value || 0; }
            if (sortField === 'created_at') { aValue = new Date(a.created_at); bValue = new Date(b.created_at); }
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // --- Export ---
    const getExportConfig = () => {
        if (view === 'leads') {
            return {
                filename: 'leads_report',
                title: 'Leads Report',
                columns: [
                    { header: 'Name', accessor: 'name' },
                    { header: 'Company', accessor: (l) => l.company || l.customer?.name || '' },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Value', accessor: (l) => l.estimated_value ? `$${l.estimated_value.toLocaleString()}` : '-' },
                    { header: 'Created', accessor: (l) => new Date(l.created_at).toLocaleDateString() },
                    { header: 'Owner', accessor: (l) => l.poc?.username || '' }
                ]
            };
        } else if (view === 'projects') {
            return {
                filename: 'project_status_report',
                title: 'Project Status Report',
                columns: [
                    { header: 'Project', accessor: 'name' },
                    { header: 'Customer', accessor: (p) => p.customer?.name || '' },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Progress', accessor: (p) => `${Math.round(p.financial_progress || 0)}%` }, // Using fin progress as proxy for now
                    { header: 'Date Created', accessor: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString() : '-' },
                    { header: 'Due Date', accessor: (p) => p.due_date ? new Date(p.due_date).toLocaleDateString() : '-' }
                ]
            };
        }
        // Default Financial
        return {
            filename: 'financial_report',
            title: 'Financial Report',
            columns: [
                { header: 'Project', accessor: 'name' },
                { header: 'Customer', accessor: (p) => p.customer?.name || '' },
                { header: 'Status', accessor: 'status' },
                { header: 'Budget', accessor: (p) => `$${p.budget?.toLocaleString() || 0}` },
                { header: 'Planned Value', accessor: (p) => `$${p.current_value?.toLocaleString() || 0}` },
                { header: 'Billed', accessor: (p) => `$${p.total_billed?.toLocaleString() || 0}` },
                { header: 'Remaining Unbilled', accessor: (p) => `$${((p.current_value || 0) - (p.total_billed || 0)).toLocaleString()}` },
                { header: 'Amount Paid', accessor: (p) => `$${(p.amount_paid || 0).toLocaleString()}` },
                { header: 'Balance Due', accessor: (p) => `$${(p.balance_due || 0).toLocaleString()}` },
                { header: '% Billed', accessor: (p) => `${p.financial_progress ? p.financial_progress.toFixed(0) : 0}%` }
            ]
        };
    };

    const exportCSV = () => {
        const config = getExportConfig();
        import('../utils/exportUtils').then(({ exportToCSV }) => {
            exportToCSV(sortedData, config.columns, `${config.filename}.csv`);
        });
    };

    const exportPDF = () => {
        const config = getExportConfig();
        import('../utils/exportUtils').then(({ exportToPDF }) => {
            exportToPDF(sortedData, config.columns, config.title, `${config.filename}.pdf`);
        });
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Report...</div>;

    // --- Render Content Based on View ---
    const renderKPIs = () => {
        if (view === 'leads') {
            const total = data.length;
            const openValue = data.reduce((sum, l) => String(l.status) !== 'lost' && String(l.status) !== 'converted' ? sum + (l.estimated_value || 0) : sum, 0);
            const convertedCount = data.filter(l => l.status === 'converted').length;
            const conversionRate = total > 0 ? ((convertedCount / total) * 100).toFixed(1) : 0;

            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Leads</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{total}</p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Open Pipeline Value</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>${openValue.toLocaleString()}</p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Conversion Rate</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{conversionRate}%</p>
                    </div>
                </div>
            )
        }

        // Projects & Financials (similar aggregations, simplified for Projects view)
        const totalBudget = data.reduce((sum, p) => sum + (p.budget || 0), 0);
        // const totalActual = data.reduce((sum, p) => sum + (p.current_value || 0), 0);

        if (view === 'projects') {
            const active = data.filter(p => p.status === 'active').length;
            const completed = data.filter(p => p.status === 'completed').length;
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Projects</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{data.length}</p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{active}</p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Completed</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{completed}</p>
                    </div>
                </div>
            );
        }

        // Financial (Default)
        const totalActual = data.reduce((sum, p) => sum + (p.current_value || 0), 0);
        const totalBilled = data.reduce((sum, p) => sum + (p.total_billed || 0), 0);
        const totalRemaining = totalActual - totalBilled;
        const totalPaid = data.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const totalBalance = data.reduce((sum, p) => sum + (p.balance_due || 0), 0);

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Budget</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${totalBudget.toLocaleString()}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Planned Value</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>${totalActual.toLocaleString()}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Billed</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>${totalBilled.toLocaleString()}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Paid</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0ea5e9' }}>${totalPaid.toLocaleString()}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Balance Due</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: totalBalance > 0 ? '#ef4444' : 'var(--text-main)' }}>${totalBalance.toLocaleString()}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Unbilled</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: totalRemaining < 0 ? '#ef4444' : 'var(--text-main)' }}>${totalRemaining.toLocaleString()}</p>
                </div>
            </div>
        );
    };

    const renderHeader = () => {
        let title = "Financial Reports";
        let sub = "Overview of project financials";
        if (view === 'projects') { title = "Project Reports"; sub = "Project status and timelines"; }
        if (view === 'leads') { title = "Lead Reports"; sub = "Pipeline and conversion metrics"; }

        return (
            <div className="dashboard-header">
                <div>
                    <h2>{title}</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{sub}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={exportCSV} className="btn-secondary">Export CSV</button>
                    <button onClick={exportPDF} className="btn-secondary">Export PDF</button>
                </div>
            </div>
        );
    };

    const renderTableHead = () => {
        if (view === 'leads') {
            return (
                <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Company {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('estimated_value')} style={{ cursor: 'pointer' }}>Value {sortField === 'estimated_value' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Created {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th>Owner</th>
                </tr>
            );
        }
        if (view === 'projects') {
            return (
                <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Project {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                    <th>Date Created</th>
                    <th>Due Date</th>
                    <th>Progress</th>
                    <th>Actions</th>
                </tr>
            );
        }
        // Financial
        return (
            <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Project {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>Budget {sortField === 'budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('actual')} style={{ cursor: 'pointer' }}>Planned Value {sortField === 'actual' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('billed')} style={{ cursor: 'pointer' }}>Billed {sortField === 'billed' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('remaining')} style={{ cursor: 'pointer' }}>Remaining {sortField === 'remaining' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('amount_paid')} style={{ cursor: 'pointer' }}>Paid {sortField === 'amount_paid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('balance_due')} style={{ cursor: 'pointer' }}>Balance {sortField === 'balance_due' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th>% Billed</th>
            </tr>
        );
    };

    const renderTableBody = () => {
        return sortedData.map(item => {
            if (view === 'leads') {
                return (
                    <tr key={item.id}>
                        <td className="font-medium">{item.name}</td>
                        <td>{getCustomerName(item) || '-'}</td>
                        <td><span className={`status-badge status-${String(item.status).toLowerCase()}`}>{item.status}</span></td>
                        <td>{item.estimated_value ? `$${item.estimated_value.toLocaleString()}` : '-'}</td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td>{item.poc?.username || '-'}</td>
                    </tr>
                )
            }
            if (view === 'projects') {
                const p = item; // Alias
                return (
                    <tr key={p.id}>
                        <td><Link to={`/portal/projects/${p.id}`} style={{ color: 'var(--primary)', fontWeight: '500' }}>{p.name}</Link></td>
                        <td>{p.customer?.name || '-'}</td>
                        <td><span className={`status-badge ${p.status === 'active' ? 'status-active' : ''}`}>{p.status}</span></td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                        <td>{p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}</td>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '60px', height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${p.financial_progress}%`, // Using field proxy
                                        height: '100%',
                                        background: 'var(--primary)',
                                        borderRadius: '3px'
                                    }}></div>
                                </div>
                                <span style={{ fontSize: '0.85rem' }}>{p.financial_progress ? p.financial_progress.toFixed(0) : 0}%</span>
                            </div>
                        </td>
                        <td>
                            <Link to={`/portal/reports/projects/${p.id}`} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', textDecoration: 'none' }}>View Report</Link>
                        </td>
                    </tr>
                )
            }
            // Financial
            const p = item;
            const remaining = (p.current_value || 0) - (p.total_billed || 0);
            return (
                <tr key={p.id}>
                    <td><Link to={`/portal/projects/${p.id}`} style={{ color: 'var(--primary)', fontWeight: '500' }}>{p.name}</Link></td>
                    <td>{p.customer?.name || '-'}</td>
                    <td><span className={`status-badge ${p.status === 'active' ? 'status-active' : ''}`}>{p.status}</span></td>
                    <td>${p.budget?.toLocaleString() || 0}</td>
                    <td>${p.current_value?.toLocaleString() || 0}</td>
                    <td style={{ color: '#22c55e', fontWeight: 500 }}>${p.total_billed?.toLocaleString() || 0}</td>
                    <td style={{ color: remaining < 0 ? '#ef4444' : 'inherit' }}>${remaining.toLocaleString()}</td>
                    <td style={{ color: '#0ea5e9', fontWeight: 500 }}>${(p.amount_paid || 0).toLocaleString()}</td>
                    <td style={{ color: (p.balance_due || 0) > 0 ? '#ef4444' : 'inherit', fontWeight: 500 }}>${(p.balance_due || 0).toLocaleString()}</td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '60px', height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${p.financial_progress}%`,
                                    height: '100%',
                                    background: p.financial_progress > 100 ? '#ef4444' : (p.financial_progress > 75 ? '#22c55e' : '#eab308'),
                                    borderRadius: '3px'
                                }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem' }}>{p.financial_progress ? p.financial_progress.toFixed(0) : 0}%</span>
                        </div>
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="dashboard-container">
            {renderHeader()}
            {renderKPIs()}

            {/* Common Filters - Could be extracted but inline for now */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px' }}
                >
                    <option value="all">All Status</option>
                    {view === 'leads' ? (
                        <>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                        </>
                    ) : (
                        <>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                        </>
                    )}
                </select>
                <select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px' }}
                >
                    <option value="all">All {view === 'leads' ? 'Companies' : 'Customers'}</option>
                    {uniqueCustomers.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Data Table */}
            <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ marginTop: 0, boxShadow: 'none' }}>
                    <thead>
                        {renderTableHead()}
                    </thead>
                    <tbody>
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
