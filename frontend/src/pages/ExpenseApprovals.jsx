import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const ExpenseApprovals = () => {
    const [expenses, setExpenses] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Load submitted expenses (we fetch all recent or pending, API can be extended, but pulling all for now for simplicity)
            const [expensesRes, usersRes, projectsRes] = await Promise.all([
                api.get('/expenses/?limit=5000'), 
                api.get('/users/'),
                api.get('/projects/')
            ]);
            
            // Keep expenses that are submitted, approved, or locked (waiting approval/revert)
            const targetEvents = expensesRes.filter(e => ['Submitted', 'Approved', 'Locked'].includes(e.status));
            setExpenses(targetEvents);
            setUsers(usersRes);
            setProjects(projectsRes);

        } catch (err) {
            console.error(err);
            alert("Error loading pending expenses.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const groupedExpenses = React.useMemo(() => {
        const groups = {};
        expenses.forEach(e => {
            const key = `${e.project_id}-${e.user_id}`;
            if (!groups[key]) {
                groups[key] = {
                    project_id: e.project_id,
                    user_id: e.user_id,
                    amount: 0,
                    count: 0,
                    expense_ids: [],
                    rawExpenses: [],
                    earliest: e.date_time,
                    latest: e.date_time
                };
            }
            groups[key].amount += parseFloat(e.amount);
            groups[key].count += 1;
            groups[key].expense_ids.push(e.id);
            groups[key].rawExpenses.push(e);
            if (e.date_time < groups[key].earliest) groups[key].earliest = e.date_time;
            if (e.date_time > groups[key].latest) groups[key].latest = e.date_time;
        });
        
        return Object.values(groups).map(g => {
            const statuses = g.rawExpenses.map(x => x.status);
            let overallStatus = 'Submitted';
            if (!statuses.includes('Submitted')) {
                overallStatus = 'Approved';
            }
            return { ...g, overallStatus };
        });
    }, [expenses]);

    const handleApprove = async (expenseIds) => {
        if (!window.confirm(`Approve and Lock ${expenseIds.length} expense(s)?`)) return;
        setLoading(true);
        try {
            await api.post('/expenses/bulk-approve', { expense_ids: expenseIds });
            alert("Approved!");
            fetchData();
        } catch (err) {
            alert(`Error approving: ${err.message}`);
            setLoading(false);
        }
    };

    const handleReject = async (expenseIds) => {
        if (!window.confirm(`Reject ${expenseIds.length} expense(s)?`)) return;
        setLoading(true);
        try {
            await api.post('/expenses/bulk-reject', { expense_ids: expenseIds });
            alert("Rejected!");
            fetchData();
        } catch (err) {
            alert(`Error rejecting: ${err.message}`);
            setLoading(false);
        }
    };

    if (loading && expenses.length === 0) return <div style={{ padding: '2rem' }}>Loading Pending Approvals...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h2>Expense Approvals</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Review, approve, or revert submitted project expenses.</p>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Employee</th>
                            <th>Status</th>
                            <th>Timeframe</th>
                            <th>Total Expenses</th>
                            <th>Amount</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedExpenses.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No pending expense approvals found.
                                </td>
                            </tr>
                        ) : (
                            groupedExpenses.map((group, idx) => {
                                const proj = projects.find(p => p.id == group.project_id);
                                const user = users.find(u => u.id == group.user_id);
                                return (
                                    <tr key={idx}>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>P-{group.project_id}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{proj ? proj.name : 'Unknown Project'}</div>
                                        </td>
                                        <td>{user ? user.username : `User #${group.user_id}`}</td>
                                        <td>
                                            <span style={{ 
                                                padding: '0.25rem 0.5rem', 
                                                background: group.overallStatus === 'Submitted' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                                color: group.overallStatus === 'Submitted' ? '#38bdf8' : '#10b981', 
                                                borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' 
                                            }}>
                                                {group.overallStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {new Date(group.earliest).toLocaleDateString()} to {new Date(group.latest).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td>{group.count} Line Item(s)</td>
                                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            ${group.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {group.overallStatus === 'Submitted' ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button onClick={() => handleApprove(group.expense_ids)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#22c55e', borderColor: '#22c55e' }}>
                                                        Approve
                                                    </button>
                                                    <button onClick={() => handleReject(group.expense_ids)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}>
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approved</span>
                                                    <button 
                                                        style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }} 
                                                        onClick={() => handleReject(group.expense_ids)}
                                                        title="Revert to Rejected (Editable) state"
                                                    >Revert</button>
                                                    <button
                                                        style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                        title="Download PDF Archive"
                                                        onClick={() => {
                                                            const columns = [
                                                                { header: 'Date', accessor: (r) => r.date_time ? new Date(r.date_time).toISOString().split('T')[0] : '-' },
                                                                { header: 'Employee', accessor: () => user?.username || '-' },
                                                                { header: 'Project', accessor: () => proj?.name || '-' },
                                                                { header: 'Type', accessor: 'expense_type' },
                                                                { header: 'Billable', accessor: (r) => r.billable ? 'Yes' : 'No' },
                                                                { header: 'Amount ($)', accessor: (r) => `$${parseFloat(r.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
                                                                { header: 'Description', accessor: 'notes' },
                                                            ];
                                                            
                                                            const formattedDate = new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'}).replace(/\//g, '');
                                                            const fileName = `P-${group.project_id}_${user?.username || 'user'}_${formattedDate}.pdf`;
                                                            const meta = {
                                                                empId: user?.id || '-',
                                                                empName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Unknown',
                                                                weekRange: `Dates: ${new Date(group.earliest).toISOString().split('T')[0]} to ${new Date(group.latest).toISOString().split('T')[0]}`,
                                                                totalEntries: group.count,
                                                                totalAmount: group.amount.toFixed(2)
                                                            };
                                                            
                                                            import('../utils/exportUtils').then(({ exportExpenseSheetPDF }) => {
                                                                exportExpenseSheetPDF(group.rawExpenses, columns, meta, fileName);
                                                            });
                                                        }}
                                                    >
                                                        PDF <svg style={{marginLeft:'2px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpenseApprovals;
