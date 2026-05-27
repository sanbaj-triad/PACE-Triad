import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationPopover = () => {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div ref={popoverRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative'
                }}
                title="Notifications"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={unreadCount > 0 ? "var(--primary)" : "none"} stroke={unreadCount > 0 ? "var(--primary)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'var(--danger, #ef4444)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        padding: '2px 5px',
                        borderRadius: '10px',
                        minWidth: '16px',
                        textAlign: 'center'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    width: '320px',
                    maxHeight: '400px',
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
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        Notifications
                    </div>
                    {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No notifications yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {notifications.map(n => (
                                <div 
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: n.is_read ? 'transparent' : 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: n.is_read ? 'normal' : 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                            {n.title}
                                        </div>
                                        {!n.is_read && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                                        )}
                                    </div>
                                    {n.message && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {n.message}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationPopover;
