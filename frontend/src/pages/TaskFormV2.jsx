import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EntityChat from '../components/EntityChat';
import { hasFinancialAccess } from '../utils/rbac';

export default function TaskFormV2() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isEdit = Boolean(id);
    const isNew = !isEdit;
    const isFinancial = hasFinancialAccess(user);

    const searchParams = new URLSearchParams(location.search);
    const initialProjectId = searchParams.get('project_id') ? parseInt(searchParams.get('project_id')) : '';
    const initialMilestoneId = searchParams.get('milestone_id') ? parseInt(searchParams.get('milestone_id')) : '';
    const initialAssignedToId = searchParams.get('assigned_to_id') ? parseInt(searchParams.get('assigned_to_id')) : '';

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        task_type: 'Other',
        status: 'Open',
        priority: 'Medium',
        start_date: '',
        due_date: '',
        estimated_effort: 0,
        estimated_utilization: 0,
        progress: 0,
        assigned_to_id: initialAssignedToId,
        project_id: initialProjectId,
        milestone_id: initialMilestoneId
    });

    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [events, setEvents] = useState([]);
    const [task, setTask] = useState(null);
    const [error, setError] = useState(null);
    const [newEventContent, setNewEventContent] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [eventStartTime, setEventStartTime] = useState('');
    const [eventHours, setEventHours] = useState(''); // String to allow clear input
    const [eventType, setEventType] = useState('Other');
    const [eventLocation, setEventLocation] = useState(localStorage.getItem('globalWorkLocation') || 'Office');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [taskCreatorId, setTaskCreatorId] = useState(null);
    const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Derived logic for time tracking
    const totalHours = task?.total_hours_spent || 0;
    const estimatedHours = parseFloat(formData.estimated_effort) || 0;
    const isOverBudget = estimatedHours > 0 && totalHours > estimatedHours;

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Users
                const userData = await api.get('/users/');
                if (Array.isArray(userData)) {
                    setUsers(userData.filter(u => u.is_employee));
                } else {
                    console.error("User data is not an array:", userData);
                    setUsers([]);
                }

                // Fetch Projects
                const reqProjects = await api.get('/projects/');
                if (Array.isArray(reqProjects)) {
                    setProjects(reqProjects);
                }

                if (isEdit) {
                    await fetchTask();
                } else {
                    // New Task
                    if (user && user.id) {
                        let defaultProjectId = '';
                        let defaultMilestoneId = '';
                        
                        if (Array.isArray(reqProjects)) {
                            const mgrProjects = reqProjects.filter(p => p.pm_id === user.id || p.customer_pm_id === user.id);
                            if (mgrProjects.length > 0) {
                                const activeProject = mgrProjects.find(p => p.status !== 'Completed' && p.status !== 'Archived') || mgrProjects[0];
                                defaultProjectId = activeProject.id;
                                
                                if (activeProject.milestones && activeProject.milestones.length > 0) {
                                    const activeMilestone = activeProject.milestones.find(m => m.owner_id === user.id && !m.is_completed) || activeProject.milestones[0];
                                    defaultMilestoneId = activeMilestone.id;
                                }
                            }
                        }
                        
                        setFormData(prev => ({ 
                            ...prev, 
                            assigned_to_id: prev.assigned_to_id || user.id,
                            project_id: prev.project_id || defaultProjectId,
                            milestone_id: prev.milestone_id || defaultMilestoneId
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load data", err);
                alert("Error loading task data: " + (err.message || "Unknown error"));
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadData();
        } else {
            const token = localStorage.getItem('token');
            if (!token) setLoading(false);
        }
    }, [id, isEdit, user]);

    const fetchTask = async () => {
        try {
            const taskData = await api.get(`/tasks/${id}`);
            if (taskData) {
                setTask(taskData);
                setEvents(taskData.events || []);
                setFormData({
                    description: taskData.description || '',
                    task_type: taskData.task_type || 'Other',
                    status: taskData.status || 'Open',
                    priority: taskData.priority || 'Medium',
                    start_date: taskData.start_date ? taskData.start_date.split('T')[0] : '',
                    due_date: taskData.due_date ? taskData.due_date.split('T')[0] : '',
                    estimated_effort: taskData.estimated_effort || 0,
                    estimated_utilization: taskData.estimated_utilization || 0,
                    progress: taskData.progress || 0,
                    assigned_to_id: taskData.assigned_to_id || '',
                    project_id: taskData.project_id || '',
                    milestone_id: taskData.milestone_id || ''
                });
                setTaskCreatorId(taskData.created_by_id);
            }
        } catch (err) {
            console.error("Failed to fetch task", err);
        }
    };

    const handleClone = async () => {
        if (!window.confirm("Are you sure you want to clone this task?")) return;
        setSaving(true);
        try {
            const res = await api.post(`/tasks/${id}/clone`);
            // The clone API returns the cloned Task object
            if (res && res.id) {
                navigate(`/portal/tasks/${res.id}`);
                // Simple trick to force a clean re-mount if router doesn't reset state cleanly
                window.location.reload();
            } else {
                navigate('/portal/tasks');
            }
        } catch (err) {
            console.error("Failed to clone task", err);
            setError("Failed to clone task: " + (err.response?.data?.detail || err.message));
            setSaving(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                assigned_to_id: formData.assigned_to_id ? parseInt(formData.assigned_to_id) : null,
                project_id: formData.project_id ? parseInt(formData.project_id) : null,
                milestone_id: formData.milestone_id ? parseInt(formData.milestone_id) : null,
                estimated_effort: formData.estimated_effort ? parseFloat(formData.estimated_effort) : 0,
                estimated_utilization: formData.estimated_utilization ? parseInt(formData.estimated_utilization) : 0,
                progress: formData.progress ? parseInt(formData.progress) : 0,
                start_date: formData.start_date || null,
                due_date: formData.due_date || null
            };

            if (isEdit) {
                await api.put(`/tasks/${id}`, payload);
            } else {
                await api.post('/tasks/', payload);
            }
            navigate('/portal/tasks');
        } catch (err) {
            console.error("Failed to save", err);
            const status = err.response?.status || "Unknown Status";
            const msg = err.response?.data?.detail
                ? JSON.stringify(err.response.data.detail)
                : (err.message || "Unknown error");
            setError(`Failed to save task: ${status} - ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        if (!newEventContent.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const hours = parseFloat(eventHours) || 0;
            // Calculate end time if start time and hours exist
            let endTime = null;
            if (eventStartTime && hours > 0) {
                const [h, m] = eventStartTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0);
                d.setMinutes(d.getMinutes() + (hours * 60));
                endTime = d.toTimeString().substring(0, 5);
            }

            // Validation: Cannot be a future date/time
            const selectedDateStr = eventDate || new Date().toISOString().split('T')[0];
            const selectedTimeStr = eventStartTime || new Date().toTimeString().split(' ')[0].substring(0,5);
            const selectedDateTime = new Date(`${selectedDateStr}T${selectedTimeStr}`);
            if (selectedDateTime > new Date()) {
                setError("invalid future date selected");
                setSaving(false);
                return;
            }

            await api.post(`/tasks/${id}/events`, {
                content: newEventContent,
                event_date: eventDate || new Date().toISOString().split('T')[0],
                start_time: eventStartTime || null,
                end_time: endTime,
                hours_spent: hours,
                event_type: eventType,
                work_location: eventLocation
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewEventContent('');
            setEventStartTime('');
            setEventHours('');
            setEventType('Other');
            setEventLocation(localStorage.getItem('globalWorkLocation') || 'Office');

            // Refresh task data to get new event and updated totals
            await fetchTask();

        } catch (err) {
            console.error("Failed to add event", err);
            setError("Failed to add event: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleEventUpdate = async (eventId, content, hours, date, start_time, end_time, event_type, work_location) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await api.put(`/task-events/${eventId}`, { content, hours_spent: parseFloat(hours) || 0, event_date: date, start_time: start_time || null, end_time: end_time || null, event_type, work_location }, config);
            await fetchTask();
        } catch (err) {
            console.error("Failed to update event", err);
            const status = err.response?.status || "Unknown Status";
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to update event (${status}): ${msg}`);
        }
    };

    const handleEventDelete = async (eventId) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await api.delete(`/task-events/${eventId}`, config);
            await fetchTask();
        } catch (err) {
            console.error("Failed to delete event", err);
            const status = err.response?.status || "Unknown Status";
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to delete event (${status}): ${msg}`);
        }
    };

    const handleEventClone = async (eventObj) => {
        if (!window.confirm("Are you sure you want to clone this time entry?")) return;
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                content: eventObj.content || '',
                event_date: eventObj.event_date,
                start_time: eventObj.start_time || null,
                hours_spent: parseFloat(eventObj.hours_spent) || 0,
                user_id: eventObj.user_id,
                event_type: eventObj.event_type || 'Other',
                work_location: eventObj.work_location || 'Office',
                task_id: eventObj.task_id,
                milestone_id: eventObj.milestone_id || null
            };

            if (id && id.startsWith('m-')) {
                payload.task_id = null;
                payload.milestone_id = parseInt(id.replace('m-', ''));
                await api.post('/events', payload, config);
            } else {
                await api.post(`/tasks/${id}/events`, payload, config);
            }
            await fetchTask();
        } catch (err) {
            console.error("Failed to clone event", err);
            const status = err.response?.status || "Unknown Status";
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to clone event (${status}): ${msg}`);
        }
    };


    if (loading) return <div style={{ padding: '2rem' }}>Loading Task...</div>;
    if (!task && !isNew) return <div className="error-message">Task not found</div>;

    return (
        <>
            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{isNew ? 'New Task' : 'Edit Task'}</h2>
                {!isNew && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            type="button" 
                            onClick={handleClone}
                            className="btn btn-secondary"
                            disabled={saving}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Clone
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {isDetailsCollapsed ? (
                                <>
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
                                    Show Details
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                                    Hide Details
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSave} className="card" style={{ display: isDetailsCollapsed ? 'none' : 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        rows="3"
                        className="form-input"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Assigned To</label>
                        <select
                            value={formData.assigned_to_id}
                            onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                            className="form-input"
                        >
                            <option value="">{formData.task_type === 'FIXED' ? 'Global (All Staff)' : 'Unassigned'}</option>
                            {user && <option value={user.id}>Me</option>}
                            {users.filter(u => isFinancial || u.manager_id === user?.id).map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={formData.task_type}
                            onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                            className="form-input"
                        >
                            <option value="Admin">Admin</option>
                            <option value="Design">Design</option>
                            <option value="Documentation">Documentation</option>
                            <option value="Engineering">Engineering</option>
                            <option value="FAT">FAT</option>
                            <option value="LAB">LAB</option>
                            <option value="Learning">Learning</option>
                            <option value="Onsite">Onsite</option>
                            <option value="Ordering">Ordering</option>
                            <option value="Other">Other</option>
                            <option value="PM">PM</option>
                            <option value="PTO">PTO</option>
                            <option value="FIXED">FIXED</option>
                            <option value="Panel Building">Panel Building</option>
                            <option value="Planning">Planning</option>
                            <option value="Programming">Programming</option>
                            <option value="SAT">SAT</option>
                            <option value="Shipping">Shipping</option>
                            <option value="Support">Support</option>
                            <option value="Testing">Testing</option>
                            <option value="Training">Training</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="form-input"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="form-input"
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Related Project (Optional)</label>
                        <select
                            value={formData.project_id}
                            onChange={(e) => {
                                setFormData({ ...formData, project_id: e.target.value, milestone_id: '' });
                            }}
                            className="form-input"
                        >
                            <option value="">None</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Related Milestone (Optional)</label>
                        <select
                            value={formData.milestone_id}
                            onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value })}
                            className="form-input"
                            disabled={!formData.project_id}
                        >
                            <option value="">None</option>
                            {formData.project_id && projects.find(p => p.id == formData.project_id)?.milestones?.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="form-input"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Estimated Effort (Hours)</label>
                        <input
                            type="number"
                            step="0.5"
                            value={formData.estimated_effort}
                            onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Estimated Utilization (%)</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={formData.estimated_utilization}
                            onChange={(e) => setFormData({ ...formData, estimated_utilization: e.target.value })}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* Progress Section */}
                {/* User requested ONLY 2 bars. One manual (adjustable), One calculated. */}
                <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>Task Progress</h4>

                    {/* 1. Manual Progress Bar (Adjustable) */}
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ margin: 0 }}>Manual Progress (User Set)</label>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formData.progress}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={formData.progress}
                            onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                    </div>

                    {/* 2. Calculated Time Budget Bar (Read Only) */}
                    {isEdit && (
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ margin: 0 }}>Budget Consumed (Calculated)</label>
                                <span>{estimatedHours > 0 ? Math.round((totalHours / estimatedHours) * 100) : 0}% ({totalHours.toFixed(2)} / {estimatedHours} hrs)</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min((totalHours / (estimatedHours || 1)) * 100, 100)}%`,
                                    background: isOverBudget ? '#ef4444' : '#10b981',
                                    height: '100%',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {formData.status === 'Completed' && isEdit && user && user.id !== taskCreatorId && user.id === parseInt(formData.assigned_to_id) && (
                    <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', color: 'var(--warning)', borderRadius: '6px', fontSize: '0.9rem' }}>
                        Note: Since this task was assigned to you, marking it as Completed will submit it for approval.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => navigate('/portal/tasks')} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Task'}
                    </button>
                </div>
            </form>

            {isEdit && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Events & Time Log
                    </h3>
                    {task?.status !== 'Completed' ? (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                            <textarea
                                placeholder="Add a new event or time entry..."
                                value={newEventContent}
                                onChange={(e) => setNewEventContent(e.target.value)}
                                className="form-input"
                                style={{
                                    flex: 1,
                                    resize: 'vertical',
                                    background: 'var(--bg-dark)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--border)',
                                    fontSize: '1rem',
                                    padding: '1rem'
                                }}
                                rows={3}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="form-input"
                                    title="Event Date"
                                    style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="time"
                                        value={eventStartTime}
                                        onChange={(e) => setEventStartTime(e.target.value)}
                                        className="form-input"
                                        title="Start Time"
                                        style={{ width: '50%', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Hrs"
                                        min="0"
                                        step="0.25"
                                        value={eventHours}
                                        onChange={(e) => setEventHours(e.target.value)}
                                        className="form-input"
                                        title="Time Spent (Hours)"
                                        style={{ width: '50%', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <select
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        className="form-input"
                                        title="Event Type"
                                        style={{ flex: 1, background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Design">Design</option>
                                        <option value="Documentation">Documentation</option>
                                        <option value="Engineering">Engineering</option>
                                        <option value="FAT">FAT</option>
                                        <option value="LAB">LAB</option>
                                        <option value="Learning">Learning</option>
                                        <option value="Onsite">Onsite</option>
                                        <option value="Ordering">Ordering</option>
                                        <option value="Other">Other</option>
                                        <option value="PM">PM</option>
                                        <option value="PTO">PTO</option>
                                        <option value="FIXED">FIXED</option>
                                        <option value="Panel Building">Panel Building</option>
                                        <option value="Planning">Planning</option>
                                        <option value="Programming">Programming</option>
                                        <option value="SAT">SAT</option>
                                        <option value="Shipping">Shipping</option>
                                        <option value="Support">Support</option>
                                        <option value="Testing">Testing</option>
                                        <option value="Training">Training</option>
                                    </select>
                                    <select
                                        value={eventLocation}
                                        onChange={(e) => setEventLocation(e.target.value)}
                                        className="form-input"
                                        title="Work Location"
                                        style={{ flex: 1, background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    >
                                        <option value="Office">Office</option>
                                        <option value="Home">Home</option>
                                        <option value="Field">Field</option>
                                        <option value="Travel">Travel</option>
                                        <option value="Training">Training</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <button onClick={handleEventSubmit} className="btn btn-secondary" disabled={!newEventContent.trim()}>
                                    Log Event
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                            This task is <strong>Completed</strong>. New events and time entries can no longer be added. Ensure the task is changed to Open or In Progress if further work is required.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {events.length === 0 && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No events logged yet.</div>}
                        {events.map(event => (
                            <EventItem
                                key={event.id}
                                eventObj={event}
                                onClone={handleEventClone}
                                onUpdate={handleEventUpdate}
                                onDelete={handleEventDelete}
                                currentUserId={user ? user.id : null}
                                isClosedTask={task?.status === 'Completed'}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
            
            {/* Contextual Messaging / Chat widget */}
            {isEdit && (
                <>
                    <button 
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            right: '2rem',
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                        title="Discussion"
                    >
                        {isChatOpen ? (
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 
                        ) : (
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        )}
                    </button>

                    {isChatOpen && (
                        <div style={{
                            position: 'fixed',
                            bottom: '5.5rem',
                            right: '2rem',
                            height: '450px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            zIndex: 1000,
                            display: 'flex'
                        }}>
                             <EntityChat 
                                 entityType="task" 
                                 entityId={task.id} 
                                 entityTitle={`Task #${task.id}`} 
                                 onClose={() => setIsChatOpen(false)} 
                             />
                        </div>
                    )}
                </>
            )}
        </>
    );
}


// Sub-component for individual event to handle edit state
const EventItem = ({ eventObj, onClone, onUpdate, onDelete, currentUserId, isClosedTask }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(eventObj.content);
    const [editHours, setEditHours] = useState(eventObj.hours_spent);
    const [editEventType, setEditEventType] = useState(eventObj.event_type || 'Other');
    const [editLocation, setEditLocation] = useState(eventObj.work_location || 'Office');
    const [editDate, setEditDate] = useState(eventObj.event_date ? eventObj.event_date.split('T')[0] : '');
    const [editStartTime, setEditStartTime] = useState(eventObj.start_time ? eventObj.start_time.substring(0, 5) : '');

    useEffect(() => {
        setEditContent(eventObj.content);
        setEditHours(eventObj.hours_spent);
        setEditEventType(eventObj.event_type || 'Other');
        setEditLocation(eventObj.work_location || 'Office');
        setEditDate(eventObj.event_date ? eventObj.event_date.split('T')[0] : '');
        setEditStartTime(eventObj.start_time ? eventObj.start_time.substring(0, 5) : '');
    }, [eventObj]);

    const handleUpdate = () => {
        let endTime = null;
        if (editStartTime && parseFloat(editHours) > 0) {
            const [h, m] = editStartTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0);
            d.setMinutes(d.getMinutes() + (parseFloat(editHours) * 60));
            endTime = d.toTimeString().substring(0, 5);
        }

        const selectedDateStr = editDate || new Date().toISOString().split('T')[0];
        const selectedTimeStr = editStartTime || new Date().toTimeString().split(' ')[0].substring(0,5);
        const selectedDateTime = new Date(`${selectedDateStr}T${selectedTimeStr}`);
        if (selectedDateTime > new Date()) {
            alert("invalid future date selected");
            return;
        }

        onUpdate(eventObj.id, editContent, editHours, editDate, editStartTime, endTime, editEventType, editLocation);
        setIsEditing(false);
    };

    const showActions = (((currentUserId && eventObj.user_id === currentUserId) || !eventObj.user_id) && !isClosedTask);

    if (isEditing) {
        return (
            <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Edit Event Content:</label>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="form-input"
                        rows={3}
                        style={{
                            width: '100%',
                            background: 'var(--bg-dark)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            padding: '0.75rem',
                            resize: 'vertical'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Date:</label>
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Start Time:</label>
                        <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Hours:</label>
                        <input type="number" step="0.25" value={editHours} onChange={e => setEditHours(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem', width: '80px' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Type:</label>
                        <select value={editEventType} onChange={e => setEditEventType(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }}>
                            <option value="Admin">Admin</option>
                            <option value="Design">Design</option>
                            <option value="Documentation">Documentation</option>
                            <option value="Engineering">Engineering</option>
                            <option value="FAT">FAT</option>
                            <option value="LAB">LAB</option>
                            <option value="Learning">Learning</option>
                            <option value="Onsite">Onsite</option>
                            <option value="Ordering">Ordering</option>
                            <option value="Other">Other</option>
                            <option value="PM">PM</option>
                            <option value="PTO">PTO</option>
                            <option value="FIXED">FIXED</option>
                            <option value="Panel Building">Panel Building</option>
                            <option value="Planning">Planning</option>
                            <option value="Programming">Programming</option>
                            <option value="SAT">SAT</option>
                            <option value="Shipping">Shipping</option>
                            <option value="Support">Support</option>
                            <option value="Testing">Testing</option>
                            <option value="Training">Training</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Location:</label>
                        <select value={editLocation} onChange={e => setEditLocation(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }}>
                            <option value="Office">Office</option>
                            <option value="Home">Home</option>
                            <option value="Field">Field</option>
                            <option value="Travel">Travel</option>
                            <option value="Training">Training</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
                    <button onClick={handleUpdate} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.25rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{eventObj.user ? eventObj.user.username : 'Unknown'}</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>{new Date(eventObj.entry_date).toLocaleString()}</span>
                    {showActions && (
                        <>
                            <button onClick={() => onClone(eventObj)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }} title="Clone Event">📋</button>
                            <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }} title="Edit Event">✎</button>
                            <button onClick={() => onDelete(eventObj.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '4px' }} title="Delete Event">🗑</button>
                        </>
                    )}
                </div>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-main)' }}>{eventObj.content}</div>
            
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                    📅 {new Date(eventObj.event_date).toLocaleDateString()}
                </div>
                {eventObj.event_type && eventObj.event_type !== 'Other' && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '4px', color: '#60a5fa' }}>
                        🏷️ {eventObj.event_type}
                    </div>
                )}
                {eventObj.work_location && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '4px', color: '#34d399' }}>
                        📍 {eventObj.work_location}
                    </div>
                )}
                {eventObj.hours_spent > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', color: 'var(--primary)' }}>
                        ⏱ {eventObj.hours_spent} hrs
                        {eventObj.start_time && ` (${eventObj.start_time.substring(0, 5)} - ${eventObj.end_time ? eventObj.end_time.substring(0, 5) : '?'})`}
                    </div>
                )}
            </div>
        </div>
    );
};
