import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const MyAnalytics = () => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await api.get('/analytics/my-dashboard');
                setMetrics(response);
            } catch (err) {
                console.error("Failed to load personal metrics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading My Analytics...</div>;
    if (!metrics) return <div style={{ padding: '2rem' }}>Error loading personal dashboard metrics.</div>;

    const formatData = (obj) => Object.entries(obj || {}).map(([name, value]) => ({ name, value }));

    const tasksByType = formatData(metrics.tasks_by_type);
    
    // Sort agenda items
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return (
        <div className="dashboard-container" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
            <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>My Analytics & Agenda</h2>
                <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.first_name || user?.username}</p>
            </header>

            {/* Top Level Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_tasks_assigned}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Assigned Tasks</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Avg Completion: {metrics.avg_task_completion.toFixed(1)}%</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #10b981' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.deadlines_met_pct.toFixed(1)}%</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Deadlines Met</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>On-Time Completion Rate</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.total_event_hours}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Hours Logged</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Avg Session: {metrics.avg_event_time.toFixed(1)} hrs</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{metrics.login_count}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Logins</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
                {/* Left Column: Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                </div>

                {/* Right Column: Daily Agenda */}
                <div>
                     <div className="card" style={{ padding: '1.5rem', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Upcoming Deadlines</h3>
                            <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                                {metrics.agenda_items.length} Items
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {metrics.agenda_items.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No upcoming deadlines.</p>
                            ) : (
                                metrics.agenda_items.map((item, idx) => {
                                    const dueDate = new Date(item.due_date);
                                    dueDate.setHours(0,0,0,0);
                                    const isOverdue = dueDate < today;
                                    const isToday = dueDate.getTime() === today.getTime();
                                    
                                    let dateColor = 'var(--text-muted)';
                                    if (isOverdue) dateColor = '#ef4444';
                                    else if (isToday) dateColor = '#f59e0b';

                                    let link = item.type === 'Task' ? `/portal/tasks/${item.id}` : `/portal/milestones`;

                                    return (
                                        <Link to={link} key={`${item.type}-${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ 
                                                padding: '0.75rem', 
                                                border: '1px solid var(--border)', 
                                                borderRadius: '8px',
                                                background: 'var(--bg-secondary)',
                                                borderLeft: `4px solid ${item.priority === 'Critical' ? '#ef4444' : item.priority === 'High' ? '#f59e0b' : 'var(--primary)'}`,
                                                transition: 'transform 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{item.type}</span>
                                                    <span style={{ fontSize: '0.75rem', color: dateColor, fontWeight: isOverdue || isToday ? 'bold' : 'normal' }}>
                                                        {isToday ? 'Today' : new Date(item.due_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.title}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    <span>{item.status}</span>
                                                    <span>{item.priority}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                     </div>
                </div>
            </div>

            {/* Event Log Analysis */}
            <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Event & Time Log Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {/* Location Breakdown */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-muted)', textAlign: 'center' }}>By Location</h4>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.location_analysis || []}>
                                    <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)' }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="total_hours" name="Total Hrs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="avg_hours" name="Avg Hrs" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="entry_count" name="Entries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Event Type Breakdown */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-muted)', textAlign: 'center' }}>By Event Type</h4>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.event_type_analysis || []}>
                                    <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)' }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="total_hours" name="Total Hrs" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="avg_hours" name="Avg Hrs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="entry_count" name="Entries" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MyAnalytics;
