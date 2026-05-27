import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const EmailLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token } = useAuth();
    
    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.get('/system/logs/email');
            setLogs(data);
        } catch (err) {
            console.error("Failed to fetch email logs", err);
            setError(err.message || 'Failed to fetch email logs');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLogs();
    }, [token]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>System Email Logs</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>Real-time server activity and diagnostics for outbound notifications.</p>
                </div>
                <div>
                    <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.26l5.08 2.69"></path>
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh Logs'}
                    </button>
                </div>
            </div>

            {error && <div className="error-message" style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>}

            <div className="table-container fade-in" style={{ background: 'var(--card-bg)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                            <th style={{ width: '200px', textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Date &amp; Time</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Server Event Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="2" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading server logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="2" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No historical email logs found on the server.</td></tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 16px' }}>{log.timestamp}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: log.message.toLowerCase().includes('failed') || log.message.toLowerCase().includes('error') ? 'var(--danger)' : 'inherit' }}>
                                        {log.message}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmailLogs;
