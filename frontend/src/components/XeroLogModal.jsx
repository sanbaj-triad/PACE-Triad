import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const XeroLogModal = ({ onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await api.get('/xero/logs?limit=50');
                setLogs(data);
            } catch (err) {
                console.error("Failed to fetch Xero logs", err);
                setError("Failed to fetch logs");
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const handleDownloadFormat = () => {
        const token = localStorage.getItem('token');
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/xero/logs/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            if (!response.ok) throw new Error("Download failed");
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'xero_sync_logs.txt';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => {
            console.error("Download Error", err);
            alert("Failed to download logs.");
        });
    };

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '800px', maxWidth: '90vw', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Xero Synchronization Logs</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                <div style={{ flex: 1, minHeight: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Recent API interactions and webhook events with Xero.</p>
                        <button onClick={handleDownloadFormat} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download TXT
                        </button>
                    </div>
                    
                    {loading ? (
                        <div>Loading logs...</div>
                    ) : error ? (
                        <div style={{ color: 'var(--error)' }}>{error}</div>
                    ) : logs.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Xero logs recorded yet.</div>
                    ) : (
                        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Endpoint</th>
                                        <th>Entity</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                            <td style={{ fontWeight: '500' }}>{log.endpoint}</td>
                                            <td>{log.entity_type} {log.entity_id ? `#${log.invoice_number || log.entity_id}` : ''}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                                                    background: log.status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: log.status === 'SUCCESS' ? '#22c55e' : '#ef4444' 
                                                }}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-muted)' }} title={log.details}>
                                                {log.details || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default XeroLogModal;
