import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function ActiveUsersWidget() {
    const [users, setUsers] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users/');
            const onlineUsers = res.filter(u => u.is_online);
            setUsers(onlineUsers);
        } catch (err) {
            console.error("Failed to fetch online users", err);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        // Initial fetch
        fetchUsers();
        
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            fetchUsers();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={popoverRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
                onClick={handleToggle}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginRight: '0.5rem'
                }}
                title="Active Users"
            >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                <span>{users.length || 'Offline'}</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    width: '220px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    marginTop: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Online Now
                    </div>
                    {users.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Nobody is online
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {users.map(u => (
                                <div 
                                    key={u.id}
                                    style={{
                                        padding: '0.6rem 1rem',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)' }}>{u.username}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#10b981' }}>Active</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
