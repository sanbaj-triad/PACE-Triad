import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ChangePasswordModal = ({ onClose, hideCloseButton = false }) => {
    const { token } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("New password must be at least 6 characters.");
            return;
        }

        try {
            const res = await fetch('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            if (res.ok) {
                setMsg("Password changed successfully!");
                localStorage.removeItem('force_reset');
                setTimeout(() => {
                    // Update AuthContext to lift the lock natively!
                    const userElement = document.getElementById('force-reset-signal');
                    if (userElement && userElement.click) userElement.click();
                    if (onClose) onClose();
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.detail || "Failed to change password");
            }
        } catch (err) {
            setError("Network error");
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{hideCloseButton ? 'Action Required: Change Password' : 'Change Password'}</h2>
                    {!hideCloseButton && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                    )}
                </div>

                <div className="modal-body">
                    {msg && <div style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px', marginBottom: '1rem' }}>{msg}</div>}
                    {error && <div style={{ padding: '0.75rem', background: 'var(--bg-dark)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-4">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group mb-6">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            {!hideCloseButton && <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>}
                            <button type="submit" className="btn-primary">Update Password</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
