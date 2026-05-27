import React, { useState, useEffect } from 'react';
import { Circle, CheckCircle2, Plus, Trash2, CalendarPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TodoSidebar = ({ isVisible, onClose }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [newItemContent, setNewItemContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Conversion State
    const [convertingItemId, setConvertingItemId] = useState(null);
    const [convertData, setConvertData] = useState({ taskId: '', hours: 0 });

    useEffect(() => {
        if (isVisible) {
            fetchItems();
        }
    }, [isVisible]);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiBaseURL = import.meta.env.VITE_API_URL || '';
            const [itemRes, taskRes] = await Promise.all([
                fetch(`${apiBaseURL}/users/me/action-items`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiBaseURL}/tasks/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (itemRes.ok) {
                const data = await itemRes.json();
                setItems(data);
            }
            if (taskRes.ok) {
                const data = await taskRes.json();
                setTasks(data.filter(t => t.status !== 'Completed'));
            }
        } catch (err) {
            console.error('Failed to fetch action items/tasks', err);
        }
    };

    const handleAdd = async (e) => {
        if (e.key === 'Enter' && newItemContent.trim()) {
            e.preventDefault();
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const apiBaseURL = import.meta.env.VITE_API_URL || '';
                const res = await fetch(`${apiBaseURL}/users/me/action-items`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: newItemContent.trim() })
                });
                if (res.ok) {
                    const savedItem = await res.json();
                    setItems([...items, savedItem]); // Push to end so it re-renders. Actually get_user_action_items returns incomplete first. 
                    // Let's refetch to get proper sorting.
                    fetchItems();
                    setNewItemContent('');
                } else {
                    console.error("Error saving action item:", await res.text());
                }
            } catch (err) {
                console.error('Failed to add item', err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const toggleComplete = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const apiBaseURL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiBaseURL}/users/me/action-items/${item.id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_completed: !item.is_completed })
            });
            if (res.ok) {
                const updatedItem = await res.json();
                setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
            }
        } catch (err) {
            console.error('Failed to update item', err);
        }
    };

    const handleDelete = async (item_id, isPermanent = false) => {
        if (isPermanent) {
            const answer = window.prompt("This deletion will be permanent.\nType Y to delete, N to cancel.");
            if (!answer || answer.toUpperCase() !== 'Y') return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const apiBaseURL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiBaseURL}/users/me/action-items/${item_id}${isPermanent ? '?permanent=true' : ''}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                if (isPermanent) {
                    setItems(items.filter(i => i.id !== item_id));
                } else {
                    setItems(items.map(i => i.id === item_id ? { ...i, is_deleted: true } : i));
                }
            }
        } catch (err) {
            console.error('Failed to delete item', err);
        }
    };
    
    const handleRestore = async (item_id) => {
        try {
            const token = localStorage.getItem('token');
            const apiBaseURL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiBaseURL}/users/me/action-items/${item_id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_deleted: false, is_completed: false })
            });
            if (res.ok) {
                const updatedItem = await res.json();
                setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
            }
        } catch (err) {
            console.error('Failed to restore item', err);
        }
    };

    const handleConvertToEvent = async (item) => {
        if (!convertData.taskId) {
            alert("Please select a task.");
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const apiBaseURL = import.meta.env.VITE_API_URL || '';
            
            // 1. Create the Task Event
            const payload = {
                content: item.content,
                event_date: new Date().toISOString().split('T')[0],
                hours_spent: parseFloat(convertData.hours),
                user_id: user.id,
                event_type: 'Other',
                work_location: 'Office',
                task_id: parseInt(convertData.taskId)
            };
            
            const eventRes = await fetch(`${apiBaseURL}/tasks/${convertData.taskId}/events`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (eventRes.ok) {
                // 2. Mark item as completed
                await toggleComplete(item);
                setConvertingItemId(null);
                setConvertData({ taskId: '', hours: 0 });
            } else {
                const msg = await eventRes.text();
                alert(`Error creating event: ${msg}`);
            }
        } catch (err) {
            console.error('Failed to convert event', err);
            alert('Failed to convert to event.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    const activeItems = items.filter(i => !i.is_completed && !i.is_deleted);
    const completedItems = items.filter(i => i.is_completed || i.is_deleted);

    return (
        <aside style={{
            width: '320px',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            height: '100%',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)'
        }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Action Items</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {activeItems.map(item => (
                    <div key={item.id} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <button onClick={() => toggleComplete(item)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem 0' }} title="Mark as complete">
                                <Circle size={18} />
                            </button>
                            <div style={{ flex: 1, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                {item.content}
                            </div>
                            {convertingItemId !== item.id && (
                                <button onClick={() => setConvertingItemId(item.id)} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', opacity: 0.8 }} title="Convert to Event">
                                    <CalendarPlus size={16} />
                                </button>
                            )}
                            <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.8 }} title="Delete">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        {convertingItemId === item.id && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Log to Timesheet</div>
                                <select 
                                    value={convertData.taskId}
                                    onChange={(e) => setConvertData({ ...convertData, taskId: e.target.value })}
                                    style={{ width: '100%', padding: '0.4rem', marginBottom: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                >
                                    <option value="">-- Select Task --</option>
                                    {tasks.map(t => <option key={t.id} value={t.id}>#{t.id} - {t.description.substring(0,25)}{t.description.length > 25 ? '...' : ''}</option>)}
                                </select>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hours:</span>
                                    <input 
                                        type="number" min="0" step="0.1"
                                        value={convertData.hours}
                                        onChange={(e) => setConvertData({ ...convertData, hours: e.target.value })}
                                        style={{ width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setConvertingItemId(null)} disabled={isLoading} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => handleConvertToEvent(item)} disabled={isLoading} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#0ea5e9', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Submit</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add New Item Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ color: 'var(--primary)', padding: '0.2rem 0' }}>
                        <Plus size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Add a new to-do..." 
                        value={newItemContent}
                        onChange={e => setNewItemContent(e.target.value)}
                        onKeyDown={handleAdd}
                        disabled={isLoading}
                        style={{ 
                            flex: 1, 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--text-main)', 
                            outline: 'none',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>

                {completedItems.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Completed & Deleted</h4>
                        {completedItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem', opacity: 0.6 }}>
                                {!item.is_deleted && (
                                    <button onClick={() => toggleComplete(item)} style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '0.2rem 0' }} title="Mark as active">
                                        <CheckCircle2 size={18} />
                                    </button>
                                )}
                                <div style={{ flex: 1, color: item.is_deleted ? 'var(--error)' : 'var(--text-muted)', fontSize: '0.95rem', textDecoration: 'line-through', lineHeight: '1.4' }}>
                                    {item.content} {item.is_deleted && <span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>(DELETED)</span>}
                                </div>
                                <button onClick={() => handleRestore(item.id)} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.5rem' }} title="Restore">
                                    ♻️
                                </button>
                                <button onClick={() => handleDelete(item.id, true)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', marginLeft: '0.2rem' }} title="Permanently Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default TodoSidebar;
