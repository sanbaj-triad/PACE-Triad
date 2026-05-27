import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const PTOAuditReport = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token } = useAuth();
    
    // Filtering and sorting state internally on frontend since list should be natively small early on
    const [filterType, setFilterType] = useState('all');
    const [filterUser, setFilterUser] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc'); // desc or asc on date

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/reports/pto-audit/');
            setLogs(data);
        } catch (err) {
            console.error("Failed to fetch PTO audit logs", err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch PTO audit logs');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (token) fetchLogs();
    }, [token]);

    const filteredAndSortedLogs = [...logs]
        .filter(log => filterType === 'all' || log.transaction_type === filterType)
        .filter(log => filterUser === 'all' || log.user_name === filterUser)
        .sort((a, b) => {
            const dateA = new Date(a.transaction_date).getTime();
            const dateB = new Date(b.transaction_date).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    return (
        <div className="page-container" style={{ padding: '2rem' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link to="/portal/pto" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', textDecoration: 'none' }}>&larr; Back Support</Link>
                        <h1 style={{ margin: 0, marginLeft: '0.5rem' }}>PTO Audit Ledger</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Immutable chronological record of all mathematical operations applied against user PTO banks.</p>
                </div>
                <div>
                    <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.26l5.08 2.69"></path>
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh Ledger'}
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', padding: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Filter by User</label>
                    <select 
                        value={filterUser} 
                        onChange={(e) => setFilterUser(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="all">All Users</option>
                        {Array.from(new Set(logs.map(l => l.user_name))).sort().map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Filter by Transaction</label>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="all">All Transactions</option>
                        <option value="Auto-Accrual">Auto-Accrual</option>
                        <option value="Manual Adjustment">Manual Adjustment</option>
                        <option value="Carry-Over">Carry-Over</option>
                        <option value="Consumed">Consumed (Used)</option>
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sort Chronology</label>
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            {error && <div className="error-message" style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>}

            <div className="table-container fade-in" style={{ background: 'var(--bg-main)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Date & Time (UTC)</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>User</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Transaction Type</th>
                            <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: '600' }}>Impact (Hrs)</th>
                            <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: '600' }}>New Balance</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading financial logs...</td></tr>
                        ) : filteredAndSortedLogs.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No audit logs match these criteria.</td></tr>
                        ) : (
                            filteredAndSortedLogs.map((log) => {
                                const isPositive = log.amount_hours > 0;
                                const isNegative = log.amount_hours < 0;
                                return (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 16px' }}>{new Date(log.transaction_date).toLocaleString()}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--primary)' }}>
                                            <Link to={`/portal/users/edit/${log.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {log.user_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ 
                                                fontSize: '0.8rem', 
                                                padding: '0.2rem 0.5rem', 
                                                borderRadius: '12px', 
                                                background: log.transaction_type === 'Auto-Accrual' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                                                color: log.transaction_type === 'Auto-Accrual' ? 'var(--success)' : 'var(--text-main)',
                                                fontWeight: 'bold'
                                            }}>
                                                {log.transaction_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', color: isPositive ? 'var(--success)' : (isNegative ? 'var(--danger)' : 'var(--text-muted)') }}>
                                            {isPositive ? '+' : ''}{log.amount_hours.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>
                                            {log.balance_after.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {log.notes || '-'}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PTOAuditReport;
