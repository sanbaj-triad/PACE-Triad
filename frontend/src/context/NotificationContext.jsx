import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ws = useRef(null);

    useEffect(() => {
        if (!user || !user.id || !token) {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            return;
        }

        // Fetch initial historical notifications
        const fetchNotifications = async () => {
            try {
                const res = await api.get('/notifications/');
                // api.js returns the json directly, not wrapped in axois 'data'
                setNotifications(res);
                setUnreadCount(res.filter(n => !n.is_read).length);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        fetchNotifications();

        // Connect WebSocket
        const connectWs = () => {
            if (ws.current) return;
            
            // Build WS URL correctly parsing VITE_API_URL or host
            let wsUrl = '';
            if (import.meta.env.VITE_API_URL) {
                const apiBase = import.meta.env.VITE_API_URL;
                const isHttps = apiBase.startsWith('https');
                wsUrl = apiBase.replace(/^https?:\/\//, isHttps ? 'wss://' : 'ws://') + `/ws/notifications/${user.id}`;
            } else {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                wsUrl = `${protocol}//${window.location.host}/ws/notifications/${user.id}`;
            }

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("WebSocket connected for presence/notifications");
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'notification') {
                        setNotifications(prev => [data.payload, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                } catch(err) {
                    console.error("WS parse error", err);
                }
            };

            ws.current.onclose = () => {
                ws.current = null;
                // Simple reconnect logic
                setTimeout(() => {
                    if (user && token) connectWs();
                }, 5000);
            };
        };

        connectWs();

        // Keepalive ping to update `last_active_at`
        const pingInterval = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 60000); // Send ping every 60 seconds

        return () => {
            clearInterval(pingInterval);
            if (ws.current) {
                // Remove close handler right before closing so it doesn't try to reconnect
                ws.current.onclose = null;
                ws.current.close();
                ws.current = null;
            }
        };
    }, [user, token]);

    const markAsRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
