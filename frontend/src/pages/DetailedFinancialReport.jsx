import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

const DetailedFinancialReport = () => {
    const [projects, setProjects] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, invRes] = await Promise.all([
                    api.get('/projects/'),
                    api.get('/invoices/')
                ]);
                setProjects(projRes);
                setInvoices(invRes);
            } catch (err) {
                console.error("Failed to load detailed report data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleProject = (pid) => {
        setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
    };

    // --- Data Processing & Grouping ---
    const getCustomerName = (p) => p.customer?.name || 'Unknown Customer';

    // 1. Group Projects by Customer
    const projectsByCustomer = projects.reduce((acc, project) => {
        const cName = getCustomerName(project);
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(project);
        return acc;
    }, {});

    // 2. Helper to get project invoices
    const getProjectInvoices = (projectId) => invoices.filter(inv => inv.project_id === projectId);

    const sortedCustomers = Object.keys(projectsByCustomer).sort();

    // --- Export Logic ---
    const handleExportCSV = () => {
        // Flatten Data: Customer | Project | Type | Ref | Date | Amount | Status
        const rows = [];
        sortedCustomers.forEach(customer => {
            projectsByCustomer[customer].forEach(project => {
                // Project Summary Row? Maybe not needed for flat data, but useful.
                // Let's add Milestone Rows
                if (project.milestones) {
                    project.milestones.forEach(m => {
                        rows.push({
                            Customer: customer,
                            Project: project.name,
                            Type: 'Milestone',
                            Reference: m.name,
                            Date: m.due_date ? new Date(m.due_date).toLocaleDateString() : '',
                            Amount: m.cost || 0,
                            Paid: 0,
                            Balance: m.cost || 0,
                            Status: m.is_completed ? 'Completed' : 'Pending',
                            Details: m.description || ''
                        });
                    });
                }
                // Invoice Rows
                const projectInvoices = getProjectInvoices(project.id);
                projectInvoices.forEach(inv => {
                    // Calculate total from items if not present (assuming backend might not send total)
                    const total = inv.items ? inv.items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
                    const invPaid = inv.amount_paid || 0;
                    const invBal = Math.max(0, total - invPaid);
                    rows.push({
                        Customer: customer,
                        Project: project.name,
                        Type: 'Invoice',
                        Reference: inv.invoice_number || `INV-${inv.id}`,
                        Date: inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '',
                        Amount: total,
                        Paid: invPaid,
                        Balance: invBal,
                        Status: inv.status,
                        Details: `${inv.items?.length || 0} items`
                    });
                });
            });
        });

        exportToCSV(rows, [
            { header: 'Customer', accessor: 'Customer' },
            { header: 'Project', accessor: 'Project' },
            { header: 'Type', accessor: 'Type' },
            { header: 'Reference', accessor: 'Reference' },
            { header: 'Date', accessor: 'Date' },
            { header: 'Amount', accessor: 'Amount' },
            { header: 'Paid', accessor: 'Paid' },
            { header: 'Balance', accessor: 'Balance' },
            { header: 'Status', accessor: 'Status' },
            { header: 'Details', accessor: 'Details' }
        ], 'detailed_financials.csv');
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Detailed Financials...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h2>Detailed Financial Reports</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Breakdown by Customer, Project, Milestones, and Invoices</p>
                </div>
                <button onClick={handleExportCSV} className="btn-secondary">Export CSV</button>
            </div>

            {sortedCustomers.map(customer => {
                // Customer Aggregates
                const custProjects = projectsByCustomer[customer];
                const custTotalBudget = custProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
                const custTotalInvoiced = custProjects.reduce((sum, p) => {
                    const pInvoices = getProjectInvoices(p.id);
                    const pInvTotal = pInvoices.reduce((isum, inv) => isum + (inv.items?.reduce((itSum, item) => itSum + item.amount, 0) || 0), 0);
                    return sum + pInvTotal;
                }, 0);

                return (
                    <div key={customer} className="card" style={{ marginBottom: '2rem', padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Customer:</span> {customer}
                            </h3>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                                <span><span style={{ color: 'var(--text-muted)' }}>Total Budget:</span> <b>${custTotalBudget.toLocaleString()}</b></span>
                                <span><span style={{ color: 'var(--text-muted)' }}>Total Invoiced:</span> <b style={{ color: 'var(--primary)' }}>${custTotalInvoiced.toLocaleString()}</b></span>
                            </div>
                        </div>

                        <div style={{ padding: '1rem' }}>
                            {custProjects.map(project => {
                                const isExpanded = expandedProjects[project.id];
                                const pInvoices = getProjectInvoices(project.id);
                                const pInvTotal = pInvoices.reduce((sum, inv) => sum + (inv.items?.reduce((itSum, item) => itSum + item.amount, 0) || 0), 0);
                                const pMilestoneTotal = project.milestones?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

                                return (
                                    <div key={project.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1rem' }}>
                                        {/* Project Header Row */}
                                        <div
                                            onClick={() => toggleProject(project.id)}
                                            style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'var(--bg-main)' : 'transparent' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</div>
                                                <span style={{ fontWeight: '600', fontSize: '1rem' }}>{project.name}</span>
                                                <span className={`status-badge ${project.status === 'active' ? 'status-active' : ''}`} style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>{project.status}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                                                <div style={{ minWidth: '100px' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Budget:</span> ${project.budget?.toLocaleString() || 0}</div>
                                                <div style={{ minWidth: '100px' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Planned:</span> ${pMilestoneTotal.toLocaleString()}</div>
                                                <div style={{ minWidth: '100px' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Invoiced:</span> ${pInvTotal.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                                    {/* Milestones Column */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestones</h4>
                                                        {project.milestones && project.milestones.length > 0 ? (
                                                            <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Name</th>
                                                                        <th>Cost</th>
                                                                        <th>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {project.milestones.map(m => (
                                                                        <tr key={m.id}>
                                                                            <td>{m.name}</td>
                                                                            <td>${m.cost?.toLocaleString()}</td>
                                                                            <td>{m.is_completed ? '✔' : '○'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No milestones.</p>}
                                                    </div>

                                                    {/* Invoices Column */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices</h4>
                                                        {pInvoices.length > 0 ? (
                                                            <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Number</th>
                                                                        <th>Date</th>
                                                                        <th>Amount</th>
                                                                        <th>Paid</th>
                                                                        <th>Balance</th>
                                                                        <th>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {pInvoices.map(inv => {
                                                                        const invTotal = inv.items?.reduce((s, i) => s + i.amount, 0) || 0;
                                                                        const invPaid = inv.amount_paid || 0.0;
                                                                        const invBal = Math.max(0, invTotal - invPaid);
                                                                        return (
                                                                            <tr key={inv.id}>
                                                                                <td>{inv.invoice_number || 'DRAFT'}</td>
                                                                                <td>{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '-'}</td>
                                                                                <td>${invTotal.toLocaleString()}</td>
                                                                                <td style={{ color: '#22c55e' }}>${invPaid.toLocaleString()}</td>
                                                                                <td style={{ color: invBal > 0 ? '#ef4444' : 'inherit' }}>${invBal.toLocaleString()}</td>
                                                                                <td>{inv.status}</td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        ) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No invoices.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DetailedFinancialReport;
