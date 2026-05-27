import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Send, Check, CheckCheck } from 'lucide-react';

const Messages = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeUserId, setActiveUserId] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const endOfMessagesRef = useRef(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Polling for newly unread
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [msgRes, usersRes] = await Promise.all([
                api.get('/messages/'),
                api.get('/users/?limit=1000')
            ]);
            
            if (Array.isArray(msgRes)) {
                setMessages(msgRes);
            }
            if (Array.isArray(usersRes)) {
                setUsers(usersRes.filter(u => u.is_employee && u.is_active && !u.locked_out));
            }
            setLoading(false);
        } catch (e) {
            console.error("Error loading mailbox data:", e);
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeUserId) return;
        
        try {
            const payload = {
                content: newMessage.trim(),
                recipient_id: activeUserId
            };
            const sentMsg = await api.post('/messages/', payload);
            setMessages([sentMsg, ...messages]);
            setNewMessage('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const activeUser = users.find(u => u.id === activeUserId);
    
    // Group threads
    const threads = {};
    if (user?.id && Array.isArray(messages)) {
        messages.forEach(m => {
            const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
            if (!threads[otherId]) threads[otherId] = [];
            threads[otherId].push(m);
        });
    }

    const activeThread = activeUserId ? (threads[activeUserId] || []) : [];
    const sortedActiveThread = [...activeThread].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

    // Mark as read when viewing
    useEffect(() => {
        if (activeUserId) {
            const unread = activeThread.filter(m => m.recipient_id === user?.id && !m.is_read);
            if (unread.length > 0) {
                unread.forEach(m => {
                    api.post(`/messages/${m.id}/read`).catch(console.error);
                });
                // Optimistic UI
                setMessages(prev => prev.map(m => m.recipient_id === user?.id && unread.find(u => u.id === m.id) ? {...m, is_read: true} : m));
            }
        }
    }, [activeUserId, messages]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sortedActiveThread]);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-main)' }}>
            {/* Sidebar */}
            <div style={{ width: '300px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Inbox ({users.length})</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {users.filter(u => u.id !== user?.id).map(u => {
                        const userMessages = threads[u.id] || [];
                        const hasUnread = userMessages.some(m => !m.is_read && m.recipient_id === user?.id);
                        const lastMsg = userMessages[0]; // because DB order_by created_at.desc() is first
                        
                        return (
                            <div 
                                key={u.id}
                                onClick={() => setActiveUserId(u.id)}
                                style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    background: activeUserId === u.id ? 'var(--bg-secondary)' : 'transparent',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem'
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    {hasUnread && (
                                        <div style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#dc3545', border: '2px solid white' }} />
                                    )}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: hasUnread ? '900' : '500', color: hasUnread ? '#000' : 'var(--text-main)' }}>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}</div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: hasUnread ? '#333' : 'var(--text-muted)', fontWeight: hasUnread ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {lastMsg ? (lastMsg.sender_id === user?.id ? `You: ${lastMsg.content}` : lastMsg.content) : "Tap to start chatting"}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeUser ? (
                    <>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem'
                            }}>
                                {activeUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{activeUser.first_name || activeUser.username} {activeUser.last_name || ''}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeUser.role}</div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {sortedActiveThread.map((msg, idx) => {
                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id || idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '60%' }}>
                                        <div style={{
                                            background: isMe ? 'var(--primary)' : 'var(--bg-secondary)',
                                            color: isMe ? 'white' : 'var(--text-main)',
                                            padding: '0.75rem 1rem',
                                            borderRadius: isMe ? '18px 18px 0px 18px' : '18px 18px 18px 0px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.4'
                                        }}>
                                            {msg.content}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '0.2rem' }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && (msg.is_read ? <CheckCheck size={12} color="#10b981" /> : <Check size={12} />)}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={endOfMessagesRef} />
                        </div>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    placeholder="Type a message..." 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg-input, transparent)', color: 'var(--text-main)', outline: 'none' }}
                                />
                                <button type="submit" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} disabled={!newMessage.trim()}>
                                    <Send size={18} style={{ marginLeft: '-2px' }} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '1rem' }}>💬</div>
                        <h3>Select a conversation</h3>
                        <p>Choose a colleague from the sidebar to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
