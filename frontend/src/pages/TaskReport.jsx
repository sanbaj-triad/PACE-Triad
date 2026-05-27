import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const TaskReport = () => {
    const { user } = useAuth();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Admin Filters
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [taskType, setTaskType] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            if (user?.role === 'admin') {
                try {
                    const res = await api.get('/users/');
                    setUsers(res.filter(u => u.is_employee));
                } catch (err) {
                    console.error("Failed to fetch users", err);
                }
            }
        };
        fetchUsers();
    }, [user]);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (selectedUser) queryParams.append('user_id', selectedUser);
            if (taskType) queryParams.append('task_type', taskType);

            const queryString = queryParams.toString();
            const url = `/reports/task-analysis${queryString ? `?${queryString}` : ''}`;

            const response = await api.get(url);
            setReport(response);
        } catch (err) {
            console.error("Report error:", err);
            setError("Failed to generate report.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = (e) => {
        e.preventDefault();
        fetchReport();
    };

    const handleDownloadPDF = async () => {
        try {
            setError('');
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (selectedUser) queryParams.append('user_id', selectedUser);
            if (taskType) queryParams.append('task_type', taskType);

            const queryString = queryParams.toString();
            const url = `/reports/task-analysis/pdf${queryString ? `?${queryString}` : ''}`;

            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const objUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objUrl;
            
            const dateStr = (startDate && endDate) ? `_${startDate}_to_${endDate}` : '';
            link.setAttribute('download', `Task_Analysis_Report${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to download PDF", err);
            setError("Failed to download Report PDF. See console for details.");
        }
    };

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-header">Task Analysis Report</h2>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>

                    {user?.role === 'admin' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Filter User</label>
                            <select
                                className="form-input"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                style={{ minWidth: '200px' }}
                            >
                                <option value="">All Users</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>End Date (Inclusive)</label>
                        <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Task Type</label>
                        <select
                            className="form-input"
                            value={taskType}
                            onChange={(e) => setTaskType(e.target.value)}
                        >
                            <option value="">All Types</option>
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

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleDownloadPDF} disabled={loading}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Download PDF
                        </button>
                    </div>
                    {error && <span style={{ color: 'var(--error)', marginLeft: '1rem' }}>{error}</span>}
                </form>
            </div>

            {report && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Hours Logged</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {report.total_hours_logged.toFixed(1)} <span style={{ fontSize: '1rem' }}>hrs</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'}
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Active Tasks</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {report.tasks.length}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {/* By User */}
                        <div className="card">
                            <h3>Hours by User</h3>
                            <table className="table" style={{ width: '100%', marginTop: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>User</th>
                                        <th style={{ textAlign: 'right' }}>Hours</th>
                                        <th style={{ textAlign: 'right' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.by_user?.map(u => (
                                        <tr key={u.username}>
                                            <td>{u.username}</td>
                                            <td style={{ textAlign: 'right' }}>{u.hours_logged.toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {report.total_hours_logged > 0
                                                    ? ((u.hours_logged / report.total_hours_logged) * 100).toFixed(1) + '%'
                                                    : '0%'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!report.by_user || report.by_user.length === 0) && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* By Type */}
                        <div className="card">
                            <h3>Hours by Task Type</h3>
                            <table className="table" style={{ width: '100%', marginTop: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Type</th>
                                        <th style={{ textAlign: 'right' }}>Hours</th>
                                        <th style={{ textAlign: 'right' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.by_type.map(t => (
                                        <tr key={t.task_type}>
                                            <td>{t.task_type}</td>
                                            <td style={{ textAlign: 'right' }}>{t.hours_logged.toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {report.total_hours_logged > 0
                                                    ? ((t.hours_logged / report.total_hours_logged) * 100).toFixed(1) + '%'
                                                    : '0%'}
                                            </td>
                                        </tr>
                                    ))}
                                    {report.by_type.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* By Location */}
                        <div className="card">
                            <h3>Hours by Location</h3>
                            <table className="table" style={{ width: '100%', marginTop: '1rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Location</th>
                                        <th style={{ textAlign: 'right' }}>Hours</th>
                                        <th style={{ textAlign: 'right' }}>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.by_location?.map(l => (
                                        <tr key={l.work_location}>
                                            <td>{l.work_location}</td>
                                            <td style={{ textAlign: 'right' }}>{l.hours_logged.toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {report.total_hours_logged > 0
                                                    ? ((l.hours_logged / report.total_hours_logged) * 100).toFixed(1) + '%'
                                                    : '0%'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!report.by_location || report.by_location.length === 0) && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Task Details */}
                    <div className="card">
                        <h3>Task Activity Details</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Hours (Period)</th>
                                        <th style={{ textAlign: 'right' }}>Total Lifetime</th>
                                        <th style={{ textAlign: 'right' }}>Est. Effort</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.tasks.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>Task #{t.id}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {t.description && t.description.length > 50 ? t.description.substring(0, 50) + '...' : t.description}
                                                </div>
                                            </td>
                                            <td><span className="badge">{t.task_type}</span></td>
                                            <td>{t.status}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{t.hours_logged.toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>{t.total_hours_spent.toFixed(1)}</td>
                                            <td style={{ textAlign: 'right' }}>{t.estimated_effort.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                    {report.tasks.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No tasks found in this period.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default TaskReport;
