import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';

const DetailedProjectReport = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const data = await api.get(`/projects/${id}`);
                setProject(data);
            } catch (err) {
                console.error("Failed to fetch project for report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/projects/${id}/report/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` } // If using bearer auth
            });

            if (!response.ok) {
                throw new Error("Failed to generate PDF");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
            const projIdStr = project.project_unique_id ? `${project.project_unique_id}_` : '';
            link.setAttribute('download', `Project_Report_${projIdStr}${safeName}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (err) {
            console.error("Failed to download PDF", err);
            alert("Failed to download PDF report. See console for details.");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Project Report...</div>;
    if (!project) return <div className="error-message" style={{ margin: '2rem' }}>Project not found.</div>;

    // Derived values
    const budget = project.budget || 0;
    const actual = project.current_value || 0;
    const billed = project.total_billed || 0;
    const remaining = actual - billed;
    const amountPaid = project.amount_paid || 0;
    const balanceDue = project.balance_due || 0;

    // Fallback info for lead or customer
    const clientName = project.customer?.name || project.lead?.company || 'Unknown Client';
    const email = project.customer?.email || project.lead?.email || '-';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <Link to="/portal/reports/projects" style={{ textDecoration: 'none', color: 'var(--text-muted)' }}>← Back to Reports</Link>
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{project.project_unique_id} - {project.name}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Detailed Project Status Report</p>
                </div>
                <div>
                    <button
                        onClick={handleDownloadPDF}
                        className="btn btn-primary"
                        disabled={downloading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {downloading ? 'Generating PDF...' : 'Download Full PDF'}
                    </button>
                </div>
            </div>

            {/* General Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Overview</h3>
                    <table style={{ width: '100%', fontSize: '0.95rem' }}>
                        <tbody>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0', width: '140px' }}>Status</td><td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{project.status}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Client</td><td style={{ fontWeight: 500 }}>{clientName}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Contact Email</td><td>{email}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Project Manager</td><td>{project.pm_user?.username || '-'}</td></tr>
                        </tbody>
                    </table>
                </div>
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Timeline</h3>
                    <table style={{ width: '100%', fontSize: '0.95rem' }}>
                        <tbody>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0', width: '140px' }}>Created</td><td>{project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Target Date</td><td>{project.due_date ? new Date(project.due_date).toLocaleDateString() : 'TBD'}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>PO Number</td><td>{project.customer_po || '-'}</td></tr>
                            <tr><td style={{ color: 'var(--text-muted)', padding: '0.5rem 0' }}>Progress</td><td><strong style={{ color: 'var(--primary)' }}>{Math.round(project.financial_progress || 0)}%</strong></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Financial Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Estimated Budget</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Planned (Actual)</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.25rem', fontWeight: 500 }}>Total Billed</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>${billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '1rem', background: amountPaid > 0 ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-hover)', borderRadius: '8px', border: amountPaid > 0 ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: amountPaid > 0 ? '#0ea5e9' : 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 500 }}>Total Paid</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: amountPaid > 0 ? '#0ea5e9' : 'inherit' }}>${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '1rem', background: balanceDue > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-hover)', borderRadius: '8px', border: balanceDue > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: balanceDue > 0 ? 'var(--error)' : 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: balanceDue > 0 ? 500 : 400 }}>Balance Due</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: balanceDue > 0 ? 'var(--error)' : 'inherit' }}>${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ padding: '1rem', background: remaining < 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-hover)', borderRadius: '8px', border: remaining < 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: remaining < 0 ? 'var(--error)' : 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: remaining < 0 ? 500 : 400 }}>Remaining unbilled</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: remaining < 0 ? 'var(--error)' : 'inherit' }}>${remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>
            </div>

            {/* Milestones and Tasks */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Milestones & Tasks</h3>
                {(!project.milestones || project.milestones.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No milestones created for this project.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {project.milestones.sort((a, b) => a.milestone_number - b.milestone_number).map(m => {
                            const mStatus = m.invoice_id ? 'Billed' : (m.is_completed ? 'Completed' : 'In Progress');
                            return (
                                <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, marginRight: '1rem' }}>#{m.milestone_number}: {m.name}</span>
                                            <span className="status-badge" style={{ fontSize: '0.75rem' }}>{mStatus}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                                            <span><span style={{ color: 'var(--text-muted)' }}>Progress:</span> <strong style={{ color: 'var(--primary)' }}>{Math.round(m.progress || 0)}%</strong></span>
                                            <span><span style={{ color: 'var(--text-muted)' }}>Value:</span> <strong>${m.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0' }}>
                                        {(!m.tasks || m.tasks.length === 0) ? (
                                            <div style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tasks assigned.</div>
                                        ) : (
                                            <table className="data-table" style={{ margin: 0, boxShadow: 'none' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ background: 'transparent' }}>Task Description</th>
                                                        <th style={{ background: 'transparent' }}>Assigned To</th>
                                                        <th style={{ background: 'transparent' }}>Status</th>
                                                        <th style={{ background: 'transparent', textAlign: 'center' }}>Progress</th>
                                                        <th style={{ background: 'transparent', textAlign: 'center' }}>Hours (Act / Est)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {m.tasks.map(t => (
                                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                            <td><Link to={`/portal/tasks/edit/${t.id}`}>{t.description}</Link></td>
                                                            <td>{t.assigned_to?.username || '-'}</td>
                                                            <td>{t.status}</td>
                                                            <td style={{ textAlign: 'center' }}>{Math.round(t.progress || 0)}%</td>
                                                            <td style={{ textAlign: 'center' }}>{t.total_hours_spent || 0} / {t.estimated_effort > 0 ? t.estimated_effort : '?'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Invoices */}
            <div className="card">
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Issued Invoices</h3>
                {(!project.invoices || project.invoices.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No invoices linked to this project.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0, boxShadow: 'none' }}>
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Status</th>
                                    <th>Issue Date</th>
                                    <th>Due Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'right' }}>Paid</th>
                                    <th style={{ textAlign: 'right' }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(inv => {
                                    const total = inv.items?.reduce((sum, i) => sum + i.amount, 0) || 0;
                                    const invPaid = inv.amount_paid || 0;
                                    const invBal = Math.max(0, total - invPaid);
                                    return (
                                        <tr key={inv.id}>
                                            <td><Link to={`/portal/invoices/${inv.id}`} style={{ fontWeight: 500 }}>{inv.invoice_number}</Link></td>
                                            <td><span className={`status-badge`}>{inv.status}</span></td>
                                            <td>{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '-'}</td>
                                            <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 500 }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 500, color: '#22c55e' }}>${invPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 500, color: invBal > 0 ? '#ef4444' : 'inherit' }}>${invBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default DetailedProjectReport;
