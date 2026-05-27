import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const EntityChat = ({ entityType, entityId, entityTitle, onClose }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [systemUsers, setSystemUsers] = useState([]);
    const [mentionState, setMentionState] = useState(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchComments = async () => {
        try {
            const endpoint = entityType === 'project' 
                ? `/projects/${entityId}/comments` 
                : `/tasks/${entityId}/comments`;
            
            const data = await api.get(endpoint);
            // Reverse so oldest is at top for chat-like view
            setComments(data.reverse());
            setLoading(false);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load comments", err);
        }
    };

    useEffect(() => {
        fetchComments();
        api.get('/users/').then(res => setSystemUsers(res.filter(u => u.is_active && u.is_employee && !u.locked_out))).catch(console.error);
        // Polling for new messages every 15 seconds
        const interval = setInterval(fetchComments, 15000);
        return () => clearInterval(interval);
    }, [entityId, entityType]);

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const payload = {
                content: newMessage
            };

            if (entityType === 'project') {
                payload.project_id = entityId;
            } else {
                payload.task_id = entityId;
            }

            const endpoint = entityType === 'project' 
                ? `/projects/${entityId}/comments` 
                : `/tasks/${entityId}/comments`;

            const newComment = await api.post(endpoint, payload);
            setComments(prev => [...prev, newComment]);
            setNewMessage('');
            setMentionState(null);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to post comment", err);
            alert("Failed to post message");
        }
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setNewMessage(val);
        
        let cursorPosition = e.target.selectionStart;
        if (cursorPosition === undefined) cursorPosition = val.length;

        const textBeforeCursor = val.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\-\.]*)$/);
        
        if (match) {
            setMentionState({
                query: match[1],
                start: cursorPosition - match[1].length - 1,
                end: cursorPosition
            });
            setMentionIndex(0);
        } else {
            setMentionState(null);
        }
    };

    const handleMentionSelect = (username) => {
        if (!mentionState) return;
        const textBefore = newMessage.substring(0, mentionState.start);
        const textAfter = newMessage.substring(mentionState.end);
        const updated = `${textBefore}@${username} ${textAfter}`;
        setNewMessage(updated);
        setMentionState(null);
        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = mentionState.start + username.length + 2;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const filteredUsers = mentionState 
        ? systemUsers.filter(u => u.username.toLowerCase().includes(mentionState.query.toLowerCase()))
        : [];

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
            ' ' + date.toLocaleDateString();
    };

    const getInitials = (username) => {
        return username ? username.substring(0, 2).toUpperCase() : '??';
    };

    const renderContentWithMentions = (text, isMe) => {
        if (!text) return null;
        const regex = /(@[a-zA-Z0-9_\-\.]+)/g;
        return text.split(regex).map((part, i) => {
            if (part.startsWith('@')) {
                return (
                    <span key={i} style={{
                        color: isMe ? '#fbbf24' : 'var(--primary)',
                        fontWeight: 'bold',
                    }}>
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div style={{
            width: '350px',
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-dark)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <h3 style={{ margin: 0, fontSize: '1rem' }}>{entityType === 'project' ? 'Project' : 'Task'} Chat</h3>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{entityTitle}</span>
                </div>
                {onClose && (
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-main)' }}>×</button>
                )}
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : comments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    comments.map(msg => {
                        const isMe = msg.user?.id === user?.id;
                        return (
                            <div key={msg.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.2rem',
                                    flexDirection: isMe ? 'row-reverse' : 'row'
                                }}>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        background: isMe ? 'var(--primary)' : 'var(--bg-hover)',
                                        color: isMe ? 'white' : 'var(--text-main)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 'bold'
                                    }}>
                                        {getInitials(msg.user?.username || 'User')}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{msg.user?.username}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(msg.created_at)}</span>
                                </div>
                                <div style={{
                                    background: isMe ? 'var(--primary-hover)' : 'var(--bg-dark)',
                                    color: isMe ? 'white' : 'var(--text-main)',
                                    padding: '0.5rem 0.8rem',
                                    borderRadius: '8px',
                                    borderTopRightRadius: isMe ? '0' : '8px',
                                    borderTopLeftRadius: isMe ? '8px' : '0',
                                    maxWidth: '90%',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    whiteSpace: 'pre-wrap',
                                    border: isMe ? 'none' : '1px solid var(--border)'
                                }}>
                                    {renderContentWithMentions(msg.content, isMe)}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={{
                padding: '1rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-dark)',
                display: 'flex',
                gap: '0.5rem',
                position: 'relative'
            }}>
                {mentionState && filteredUsers.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '1rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        maxHeight: '150px',
                        overflowY: 'auto',
                        width: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        marginBottom: '0.5rem'
                    }}>
                        {filteredUsers.map((u, i) => (
                            <div 
                                key={u.id}
                                onClick={() => handleMentionSelect(u.username)}
                                onMouseEnter={() => setMentionIndex(i)}
                                style={{
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    background: i === mentionIndex ? 'var(--primary-hover)' : 'transparent',
                                    color: i === mentionIndex ? 'white' : 'var(--text-main)',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <div style={{width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem'}}>{u.username.charAt(0).toUpperCase()}</div>
                                {u.username}
                            </div>
                        ))}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextChange}
                    placeholder="Type a message... (Use @ to tag)"
                    rows="1"
                    style={{
                        flex: 1,
                        resize: 'none',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-hover)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit'
                    }}
                    onKeyDown={(e) => {
                        if (mentionState && filteredUsers.length > 0) {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setMentionIndex(prev => (prev + 1) % filteredUsers.length);
                                return;
                            }
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
                                return;
                            }
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                handleMentionSelect(filteredUsers[mentionIndex].username);
                                return;
                            }
                            if (e.key === 'Escape') {
                                setMentionState(null);
                                return;
                            }
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button type="submit" disabled={!newMessage.trim()} className="btn-primary" style={{ padding: '0 1rem' }}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default EntityChat;
