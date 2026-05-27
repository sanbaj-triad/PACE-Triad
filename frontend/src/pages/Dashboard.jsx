import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const Dashboard = () => {
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

export default Dashboard;
