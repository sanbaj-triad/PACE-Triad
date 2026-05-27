import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const InvoiceAnalytics = () => {
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invData, projData] = await Promise.all([
                    api.get('/invoices/'),
                    api.get('/projects/')
                ]);
                setInvoices(invData);
                setProjects(projData);
            } catch (err) {
                console.error("Failed to load analytics data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const customers = useMemo(() => {
        const unique = [...new Set(projects.map(p => p.customer?.name || p.customer_id).filter(Boolean))].sort();
        return unique;
    }, [projects]);

    // Initial Filter
    const filteredInvoices = useMemo(() => {
        if (selectedCustomer === 'all') return invoices;
        return invoices.filter(i => (i.project?.customer?.name || i.project?.customer_id) === selectedCustomer);
    }, [invoices, selectedCustomer]);

    const filteredProjects = useMemo(() => {
        if (selectedCustomer === 'all') return projects;
        return projects.filter(p => (p.customer?.name || p.customer_id) === selectedCustomer);
    }, [projects, selectedCustomer]);

    // KPIs
    const kpis = useMemo(() => {
        if (filteredInvoices.length === 0) return null;

        const totalInvoices = filteredInvoices.length;
        const paidInvoices = filteredInvoices.filter(i => i.status.toLowerCase() === 'paid');
        const waitingInvoices = filteredInvoices.filter(i => ['sent', 'open', 'partial'].includes(i.status.toLowerCase()));
        
        let totalVal = 0;
        filteredInvoices.forEach(i => {
            const sum = i.items?.reduce((acc, it) => acc + (it.amount || 0), 0) || 0;
            totalVal += sum;
        });
        const avgInvoiceValue = totalVal / totalInvoices;

        let totalDaysToPay = 0;
        let validPaidCount = 0;
        paidInvoices.forEach(i => {
            const issueDate = new Date(i.issue_date);
            let paidDate = new Date(i.updated_at);
            if (i.payments && i.payments.length > 0) {
                // Find latest payment date
                const maxPayDate = Math.max(...i.payments.map(p => new Date(p.payment_date || p.created_at).getTime()));
                paidDate = new Date(maxPayDate);
            }
            if (!isNaN(issueDate) && !isNaN(paidDate)) {
                const diffTime = Math.abs(paidDate - issueDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDaysToPay += diffDays;
                validPaidCount++;
            }
        });

        const avgDaysToPay = validPaidCount > 0 ? (totalDaysToPay / validPaidCount) : 0;

        return {
            total: totalInvoices,
            paid: paidInvoices.length,
            waiting: waitingInvoices.length,
            avgVal: avgInvoiceValue,
            avgDays: avgDaysToPay
        };
    }, [filteredInvoices]);

    // User Creation Bar Chart
    const userStats = useMemo(() => {
        const counts = {};
        filteredInvoices.forEach(i => {
            const u = i.created_by_user?.username || 'System/Unknown';
            counts[u] = (counts[u] || 0) + 1;
        });
        return Object.keys(counts).map(key => ({ name: key, count: counts[key] })).sort((a,b) => b.count - a.count);
    }, [filteredInvoices]);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Analytics Engines...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2>Invoice Analytics</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Financial timing and volume analysis</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>Target Customer:</span>
                    <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.95rem', cursor: 'pointer', minWidth: '200px' }}
                    >
                        <option value="all">-- All Global Customers --</option>
                        {customers.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs */}
            {kpis ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--primary)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Invoices</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpis.total}</span>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #22c55e' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid Volume</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>{kpis.paid}</span>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #eab308' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Awaiting Payment</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eab308' }}>{kpis.waiting}</span>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Turnaround</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{kpis.avgDays.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>days</span></span>
                    </div>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #06b6d4' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mean Invoice Value</span>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#06b6d4' }}>${kpis.avgVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No invoices found for the selected view.</div>
            )}

            {/* Split View: Graph & Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                
                {/* User Creation Stats */}
                <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Invoice Creation by User</h3>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {userStats.length > 0 ? userStats.map((u, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                    <span style={{ fontWeight: '500', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        {u.name}
                                    </span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {u.count} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>invoices</span>
                                    </span>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Vertical Timeline by Project */}
                <div className="card" style={{ maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'var(--bg-card)', paddingBottom: '1rem', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
                        Project Billing Timelines
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {filteredProjects.map(project => {
                            const projectInvoices = filteredInvoices.filter(i => i.project_id === project.id).sort((a,b) => new Date(a.issue_date) - new Date(b.issue_date));
                            if (projectInvoices.length === 0) return null; // Skip projects with no invoices

                            const projectTotalValue = project.budget > 0 ? project.budget : (projectInvoices.reduce((sum, i) => sum + (i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0), 0));

                            return (
                                <div key={project.id} style={{ position: 'relative' }}>
                                    {/* Spine */}
                                    <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '110px', width: '2px', background: 'var(--border)' }}></div>

                                    {/* Timeline Nodes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        
                                        {/* Node 1: Project Creation */}
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
                                            <div style={{ width: '90px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
                                                {new Date(project.created_at).toLocaleDateString()}
                                            </div>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--text-muted)', position: 'absolute', left: '105px', top: '7px' }}></div>
                                            <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', flex: 1 }}>
                                                <strong style={{ display: 'block' }}>Project Created</strong>
                                                <Link to={`/portal/projects/${project.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                                                    {project.name} ({project.project_unique_id})
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Incremental Invoices */}
                                        {projectInvoices.map((inv, idx) => {
                                            const total = inv.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0;
                                            const pct = projectTotalValue > 0 ? ((total / projectTotalValue) * 100).toFixed(1) : 0;
                                            const isPaid = inv.status.toLowerCase() === 'paid';
                                            
                                            let paidDateStr = null;
                                            if (isPaid) {
                                                if (inv.payments && inv.payments.length > 0) {
                                                    const maxPayDate = Math.max(...inv.payments.map(p => new Date(p.payment_date || p.created_at).getTime()));
                                                    paidDateStr = new Date(maxPayDate).toLocaleDateString();
                                                } else {
                                                    paidDateStr = new Date(inv.updated_at).toLocaleDateString();
                                                }
                                            }

                                            return (
                                                <div key={inv.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
                                                    <div style={{ width: '90px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-main)', paddingTop: '4px', fontWeight: '500' }}>
                                                        {new Date(inv.issue_date).toLocaleDateString()}
                                                    </div>
                                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: isPaid ? '#22c55e' : '#eab308', position: 'absolute', left: '104px', top: '7px', zIndex: 2, boxShadow: '0 0 0 2px var(--bg-card)' }}></div>
                                                    <div style={{ background: 'var(--bg-main)', padding: '0.5rem 1rem', borderRadius: '6px', border: `1px solid ${isPaid ? '#22c55e' : '#eab308'}`, flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                            <strong>
                                                                <Link to={`/portal/invoices/${inv.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                    Invoice #{inv.invoice_number}
                                                                </Link>
                                                            </strong>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isPaid ? '#22c55e' : '#eab308' }}>
                                                                {isPaid ? 'PAID' : inv.status}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            <span>Value: <strong style={{color: 'var(--text-main)'}}>${total.toLocaleString()}</strong></span>
                                                            {pct > 0 && <span>Project %: <strong style={{color: 'var(--text-main)'}}>{pct}%</strong></span>}
                                                            {isPaid && paidDateStr && <span style={{ color: '#22c55e' }}>Paid on: {paidDateStr}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Terminal Milestone if Complete */}
                                        {(() => {
                                            const totalBilled = projectInvoices.reduce((sum, i) => sum + (i.items?.reduce((s, it) => s + (it.amount || 0), 0) || 0), 0);
                                            const remainingBalance = Math.max(0, projectTotalValue - totalBilled);
                                            const allPaid = projectInvoices.length > 0 && projectInvoices.every(i => i.status.toLowerCase() === 'paid');
                                            
                                            // Check if Project Invoicing is completed
                                            if (remainingBalance <= 0.01 && allPaid) {
                                                // Find the latest paid date across all invoices for this project
                                                let finalPaidDate = new Date(project.updated_at);
                                                projectInvoices.forEach(inv => {
                                                    if (inv.payments && inv.payments.length > 0) {
                                                        const maxPayDate = Math.max(...inv.payments.map(p => new Date(p.payment_date || p.created_at).getTime()));
                                                        if (maxPayDate > finalPaidDate.getTime()) finalPaidDate = new Date(maxPayDate);
                                                    } else {
                                                        const docDate = new Date(inv.updated_at);
                                                        if (docDate > finalPaidDate) finalPaidDate = docDate;
                                                    }
                                                });
                                                
                                                return (
                                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative', marginTop: '0.5rem' }}>
                                                        <div style={{ width: '90px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--primary)', paddingTop: '4px', fontWeight: 'bold' }}>
                                                            {finalPaidDate.toLocaleDateString()}
                                                        </div>
                                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--primary)', position: 'absolute', left: '103px', top: '5px', zIndex: 2 }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{position:'absolute', top:'1px', left:'1px'}}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        </div>
                                                        <div style={{ padding: '0.25rem 1rem', color: 'var(--primary)', fontWeight: 'bold', flex: 1 }}>
                                                            Project Invoicing Completed
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceAnalytics;
