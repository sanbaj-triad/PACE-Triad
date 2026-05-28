import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Circle, CheckCircle2, Plus, Trash2, CheckSquare, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// --- Sub-components for Employee Workspace ---

const WeeklyHoursMeter = ({ hours }) => {
    const target = 35.0;
    const percentage = Math.min((hours / target) * 100, 100);
    
    let statusText = "Keep up the great work!";
    let barColor = 'linear-gradient(90deg, #6366f1, #10b981)';
    if (hours >= target) {
        statusText = "Target reached! Excellent job. 🎉";
        barColor = 'linear-gradient(90deg, #10b981, #059669)';
    } else if (hours > 0 && hours < 15) {
        statusText = "Starting strong! Keep loggin' those hours.";
        barColor = 'linear-gradient(90deg, #ef4444, #f59e0b)';
    } else if (hours >= 15 && hours < target) {
        statusText = "Over halfway there! You've got this.";
        barColor = 'linear-gradient(90deg, #f59e0b, #6366f1)';
    }

    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} style={{ color: 'var(--primary)' }} />
                    Weekly Hours Tracker
                </h3>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Target: {target} hrs
                </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        {hours.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>hours logged</span>
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: hours >= target ? 'var(--success)' : 'var(--primary)' }}>
                        {Math.round(percentage)}%
                    </span>
                </div>
                
                <div style={{ 
                    height: '14px', 
                    width: '100%', 
                    background: 'var(--bg-hover)', 
                    borderRadius: '999px',
                    overflow: 'hidden',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ 
                        height: '100%', 
                        width: `${percentage}%`, 
                        background: barColor, 
                        borderRadius: '999px',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                </div>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {statusText}
            </p>
        </div>
    );
};

const ActionableChecklist = ({ items, onToggle, onAdd, onDelete }) => {
    const [newItem, setNewItem] = useState('');
    const activeItems = items.filter(i => !i.is_completed && !i.is_deleted);

    const handleSubmit = (e) => {
        if (e.key === 'Enter' && newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'default', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                    My To-Do Checklist
                </h3>
                <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {activeItems.length} active
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <Plus size={16} style={{ color: 'var(--text-muted)' }} />
                <input 
                    type="text" 
                    placeholder="Add a quick checklist item... (Press Enter)"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={handleSubmit}
                    style={{ 
                        flex: 1, 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-main)', 
                        outline: 'none', 
                        fontSize: '0.9rem' 
                    }}
                />
            </div>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem', 
                maxHeight: '300px', 
                overflowY: 'auto',
                paddingRight: '4px'
            }}>
                {activeItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        All caught up! Add a new item above.
                    </div>
                ) : (
                    activeItems.map(item => (
                        <div 
                            key={item.id} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '0.75rem', 
                                padding: '0.25rem 0'
                            }}
                        >
                            <button 
                                onClick={() => onToggle(item)}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: 'var(--text-muted)', 
                                    cursor: 'pointer', 
                                    padding: '2px 0 0 0',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Mark Complete"
                            >
                                <Circle size={16} />
                            </button>
                            <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                {item.content}
                            </span>
                            <button 
                                onClick={() => onDelete(item.id)}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: 'var(--error)', 
                                    cursor: 'pointer', 
                                    opacity: 0.6,
                                    padding: '2px 0 0 0',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Delete To-Do"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const MyTasksTable = ({ tasks }) => {
    const sortedTasks = [...tasks]
        .filter(t => t.status !== 'Completed')
        .sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        });

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'critical': return 'var(--error)';
            case 'high': return 'var(--warning)';
            case 'medium': return 'var(--primary)';
            case 'low': return 'var(--text-muted)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'in_progress':
            case 'in progress': return '#0ea5e9';
            case 'open': return 'var(--primary)';
            case 'pending': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    const isOverdue = (dateStr) => {
        if (!dateStr) return false;
        const today = new Date();
        today.setHours(0,0,0,0);
        return new Date(dateStr) < today;
    };

    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                    My Open Tasks
                </h3>
                <Link to="/portal/tasks" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                    View All Tasks →
                </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
                {sortedTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No open tasks assigned to you.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem 0.5rem 0', color: 'var(--text-muted)', fontWeight: '600' }}>Task Description</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Deadline</th>
                                <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Priority</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem 0 0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.slice(0, 5).map(task => {
                                const overdue = isOverdue(task.due_date);
                                return (
                                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '0.75rem 0.75rem 0.75rem 0', fontWeight: '500' }}>
                                            <Link to={`/portal/tasks/${task.id}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                                                {task.description.length > 45 ? `${task.description.substring(0, 45)}...` : task.description}
                                            </Link>
                                            {task.project?.name && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {task.project.name}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.75rem', color: overdue ? 'var(--error)' : 'var(--text-main)', fontWeight: overdue ? 'bold' : 'normal' }}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                            {overdue && <span style={{ fontSize: '0.7rem', marginLeft: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1px 4px', borderRadius: '4px' }}>OVERDUE</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 'bold', 
                                                color: getPriorityColor(task.priority),
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: `1px solid ${getPriorityColor(task.priority)}40`
                                            }}>
                                                {task.priority || 'Medium'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0 0.75rem 0.75rem', textAlign: 'right' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 'bold', 
                                                color: getStatusColor(task.status),
                                                background: `${getStatusColor(task.status)}10`,
                                                padding: '2px 8px',
                                                borderRadius: '9999px'
                                            }}>
                                                {(task.status || 'Open').replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const PersonalAgenda = ({ events }) => {
    const getNext7Days = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            d.setHours(0,0,0,0);
            days.push(d);
        }
        return days;
    };

    const days = getNext7Days();

    const formatDateLocal = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    };

    const getDayName = (date, isToday) => {
        if (isToday) return "Today";
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getEventBadgeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'task': return { bg: '#818cf8', text: '#e0e7ff' };
            case 'milestone': return { bg: '#fb923c', text: '#ffedd5' };
            case 'pto': return { bg: '#facc15', text: '#fef9c3' };
            case 'lead': return { bg: '#38bdf8', text: '#e0f2fe' };
            case 'project': return { bg: '#c084fc', text: '#f3e8ff' };
            case 'invoice': return { bg: '#4ade80', text: '#dcfce7' };
            default: return { bg: 'var(--bg-hover)', text: 'var(--text-muted)' };
        }
    };

    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} style={{ color: 'var(--primary)' }} />
                    7-Day Personal Agenda
                </h3>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '0.75rem',
                marginTop: '0.5rem'
            }}>
                {days.map((day, idx) => {
                    const dateStr = formatDateLocal(day);
                    const dayEvents = events.filter(e => {
                        if (!e.start) return false;
                        return e.start.split('T')[0] === dateStr;
                    });
                    
                    const isToday = idx === 0;

                    return (
                        <div 
                            key={dateStr} 
                            style={{ 
                                padding: '0.75rem', 
                                background: isToday ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-main)', 
                                borderRadius: '8px', 
                                border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    {getDayName(day, isToday)}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {day.getDate()}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
                                {dayEvents.length === 0 ? (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 'auto' }}>No events</span>
                                ) : (
                                    dayEvents.map(e => {
                                        const colors = getEventBadgeColor(e.type);
                                        return (
                                            <div 
                                                key={e.id} 
                                                title={`${e.type}: ${e.title}`}
                                                style={{ 
                                                    fontSize: '0.7rem', 
                                                    padding: '2px 4px', 
                                                    borderRadius: '4px',
                                                    background: colors.bg,
                                                    color: colors.text,
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {e.title}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EmployeeWorkspace = () => {
    const { user } = useAuth();
    const [actionItems, setActionItems] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [weeklyHours, setWeeklyHours] = useState(0);
    const [agendaEvents, setAgendaEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkspaceData = async () => {
        try {
            setLoading(true);
            
            const now = new Date();
            const day = now.getDay();
            const monday = new Date(now);
            const diffToMonday = day === 0 ? -6 : 1 - day;
            monday.setDate(now.getDate() + diffToMonday);
            monday.setHours(0,0,0,0);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23,59,59,999);
            
            const formatDate = (d) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const date = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${date}`;
            };
            
            const startStr = formatDate(monday);
            const endStr = formatDate(sunday);

            const [actionRes, tasksRes, eventsRes, calRes] = await Promise.all([
                api.get('/users/me/action-items'),
                api.get(`/tasks/?assigned_to_id=${user.id}&hide_completed=true`),
                api.get(`/task-events/?user_id=${user.id}&start_date=${startStr}&end_date=${endStr}`),
                api.get(`/calendar/events?user_id=${user.id}`)
            ]);
            
            setActionItems(actionRes || []);
            setMyTasks(tasksRes || []);
            const totalHours = (eventsRes || []).reduce((sum, e) => sum + (e.hours_spent || 0), 0);
            setWeeklyHours(totalHours);
            setAgendaEvents(calRes || []);
        } catch (err) {
            console.error("Failed to load employee workspace data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchWorkspaceData();
        }
    }, [user?.id]);

    const handleToggleActionItem = async (item) => {
        try {
            const updated = await api.put(`/users/me/action-items/${item.id}`, {
                is_completed: !item.is_completed
            });
            setActionItems(prev => prev.map(i => i.id === item.id ? updated : i));
        } catch (err) {
            console.error("Failed to toggle action item", err);
        }
    };

    const handleAddActionItem = async (content) => {
        try {
            const created = await api.post('/users/me/action-items', { content });
            setActionItems(prev => [...prev, created]);
        } catch (err) {
            console.error("Failed to add action item", err);
        }
    };

    const handleDeleteActionItem = async (itemId) => {
        try {
            await api.delete(`/users/me/action-items/${itemId}`);
            setActionItems(prev => prev.filter(i => i.id !== itemId));
        } catch (err) {
            console.error("Failed to delete action item", err);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Workspace Overview...</div>;

    return (
        <div className="dashboard-container" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
            <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>My Workspace Overview</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.first_name || user?.username}</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <WeeklyHoursMeter hours={weeklyHours} />
                    <MyTasksTable tasks={myTasks} />
                </div>
                <div>
                    <ActionableChecklist 
                        items={actionItems} 
                        onToggle={handleToggleActionItem} 
                        onAdd={handleAddActionItem} 
                        onDelete={handleDeleteActionItem} 
                    />
                </div>
            </div>

            <div style={{ width: '100%' }}>
                <PersonalAgenda events={agendaEvents} />
            </div>
        </div>
    );
};

// --- Existing Global analytical business dashboards metrics view layout (AdminDashboard) ---

const AdminDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await api.get('/analytics/dashboard');
                setMetrics(response);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Overview...</div>;
    if (!metrics) return <div style={{ padding: '2rem' }}>Error loading dashboard metrics.</div>;

    const formatData = (obj) => Object.entries(obj || {}).map(([name, value]) => ({ name, value }));

    const leadsByStatus = formatData(metrics.leads_by_status);
    const projectsByType = formatData(metrics.projects_by_type);
    const milestonesByType = formatData(metrics.milestones_by_type);
    const tasksByType = formatData(metrics.tasks_by_type);
    const tasksByUser = formatData(metrics.tasks_by_user);
    const projectsByPm = formatData(metrics.projects_by_pm);
    const projectsByCustomer = formatData(metrics.projects_by_customer);
    const eventsByType = formatData(metrics.events_by_type);
    const eventsByUser = formatData(metrics.events_by_user);
    const eventsByLocation = formatData(metrics.events_by_location);

    return (
        <div className="dashboard-container" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
            <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Global System Overview</h2>
                <p style={{ color: 'var(--text-muted)' }}>Real-time non-financial statistics</p>
            </header>

            {/* Top Level Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_leads}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Leads</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #10b981' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_projects}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active Projects</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Avg Completion: {metrics.avg_project_completion.toFixed(1)}%</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_milestones}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Milestones</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Avg Completion: {metrics.avg_milestone_completion.toFixed(1)}%</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_tasks}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pending Tasks</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Avg Output: {metrics.tasks_avg_time_spent.toFixed(1)} hrs</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_event_hours}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Event Hours</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Across {metrics.total_events} Records</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                
                {/* Tasks Workload distribution */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Task Distribution by User</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tasksByUser}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leads Status */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Leads Status (Won/Lost/Open)</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={leadsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {leadsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Projects Type Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Project Types Breakdown</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={projectsByType} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {projectsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Task Type Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Task Type Distribution</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={tasksByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {tasksByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Event Type Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Logged Hours by Event Type</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={eventsByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {eventsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Event Hours by User */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Total Hours by Employee</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={eventsByUser}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Event Location Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Work Location Breakdown</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={eventsByLocation}>
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Internal PM workloads */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Projects by Internal PM</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectsByPm} layout="vertical">
                                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customer Workloads */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Projects Output by Client</h3>
                    <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectsByCustomer} layout="vertical">
                                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={100} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }} />
                                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- Main Dashboard Wrapper Component ---

const Dashboard = () => {
    const { user } = useAuth();
    const isFinancial = user && hasFinancialAccess(user);

    if (isFinancial) {
        return <AdminDashboard />;
    } else {
        return <EmployeeWorkspace />;
    }
};

export default Dashboard;
