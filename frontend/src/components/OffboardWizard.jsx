import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const OffboardWizard = ({ isOpen, onClose, userToOffboard, onComplete }) => {
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    
    const [activeUsers, setActiveUsers] = useState([]);
    
    // Transfer toggles
    const [config, setConfig] = useState({
        transfer_projects: true,
        transfer_tasks: true,
        transfer_milestones: true,
        transfer_leads: true,
        transfer_pto_approvals: true,
        deactivate_user: true
    });
    const [targetUser, setTargetUser] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && userToOffboard) {
            // Fetch stats for the user
            setLoadingStats(true);
            setError(null);
            
            api.get(`/users/${userToOffboard.id}/offboard-stats`)
                .then(data => setStats(data))
                .catch(err => {
                    console.error("Failed to load stats", err);
                    setError("Failed to load user asset statistics.");
                })
                .finally(() => setLoadingStats(false));
                
            // Fetch users for the dropdown
            api.get('/users/')
                .then(users => {
                    // Filter to active employees, exclude the user being offboarded
                    const available = users.filter(u => u.is_active && u.id !== userToOffboard.id);
                    setActiveUsers(available);
                    if (available.length > 0) {
                        setTargetUser(available[0].id.toString());
                    }
                })
                .catch(err => console.error("Failed to load users", err));
        }
    }, [isOpen, userToOffboard]);

    if (!isOpen || !userToOffboard) return null;

    const handleToggle = (key) => {
        setConfig(prev => ({...prev, [key]: !prev[key]}));
    };

    const handleSubmit = async () => {
        if (!targetUser) {
            setError("You must select a target user for migration.");
            return;
        }

        const payload = {
            target_user_id: parseInt(targetUser, 10),
            ...config
        };

        try {
            setSubmitting(true);
            setError(null);
            await api.post(`/users/${userToOffboard.id}/offboard`, payload);
            if (onComplete) onComplete();
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to offboard user. " + (err.response?.data?.detail || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '700px', background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                    Offboard User: {userToOffboard.first_name} {userToOffboard.last_name || userToOffboard.username}
                </h2>
                
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Transfer active operational assets to another user while preserving historical data.
                </p>

                {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #ef4444' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {/* Left Column: Impact Stats */}
                    <div style={{ flex: '1 1 250px' }}>
                        <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Active Assests Found</h4>
                        {loadingStats ? (
                            <p style={{ color: 'var(--text-muted)' }}>Calculating impact...</p>
                        ) : stats ? (
                            <ul style={{ listStyle: 'none', margin: 0, background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px' }}>
                                <li style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Active Projects:</span> <strong style={{ color: 'var(--text-main)' }}>{stats.active_projects}</strong>
                                </li>
                                <li style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Active Tasks:</span> <strong style={{ color: 'var(--text-main)' }}>{stats.active_tasks}</strong>
                                </li>
                                <li style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Incomplete Milestones:</span> <strong style={{ color: 'var(--text-main)' }}>{stats.active_milestones}</strong>
                                </li>
                                <li style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Open Leads:</span> <strong style={{ color: 'var(--text-main)' }}>{stats.active_leads}</strong>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Pending PTOs:</span> <strong style={{ color: 'var(--text-main)' }}>{stats.pending_ptos}</strong>
                                </li>
                            </ul>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Could not load stats.</p>
                        )}
                    </div>

                    {/* Right Column: Target Selection */}
                    <div style={{ flex: '1.5 1 300px' }}>
                        <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Migrate To</h4>
                        <select 
                            style={{ 
                                width: '100%', 
                                marginBottom: '1.5rem', 
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                fontSize: '1rem'
                            }}
                            value={targetUser}
                            onChange={(e) => setTargetUser(e.target.value)}
                        >
                            <option value="">-- Select Target User --</option>
                            {activeUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username} ({u.role})
                                </option>
                            ))}
                        </select>
                        
                        <h4 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>What options to Transfer</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', color: 'var(--text-main)' }}>
                            {Object.keys(config).filter(k => k !== 'deactivate_user').map(key => {
                                const displayName = key.replace('transfer_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={config[key]} 
                                            onChange={() => handleToggle(key)} 
                                            style={{ marginRight: '0.5rem', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                        />
                                        {displayName}
                                    </label>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>
                                <input 
                                    type="checkbox" 
                                    checked={config.deactivate_user} 
                                    onChange={() => handleToggle('deactivate_user')} 
                                    style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#ef4444' }}
                                />
                                Lock & Deactivate User Account
                            </label>
                            <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                This will instantly terminate login access. Historical entries linked to this user (timesheets, expenses) are permanently retained.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !targetUser} style={{ background: '#ef4444', border: 'none', padding: '0.5rem 1.5rem' }}>
                        {submitting ? 'Executing Migration...' : 'Execute Offboarding'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OffboardWizard;
