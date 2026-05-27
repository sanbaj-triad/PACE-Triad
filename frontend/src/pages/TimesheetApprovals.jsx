import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';

const generateYearlyWeeks = (year, startDayOfWeek) => {
    const weeks = [];
    const firstDay = new Date(year, 0, 1);
    
    let startD = new Date(firstDay);
    while (startD.getDay() !== startDayOfWeek) {
        startD.setDate(startD.getDate() - 1);
    }
    
    for (let i = 1; i <= 53; i++) {
        let endD = new Date(startD);
        endD.setDate(startD.getDate() + 6);
        
        const pad = (n) => n.toString().padStart(2, '0');
        const sStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-${pad(startD.getDate())}`;
        const eStr = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;
        
        weeks.push({
            value: `${sStr}|${eStr}`,
            label: `Week ${pad(i)} (${startD.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${endD.toLocaleDateString('en-US', {month:'short', day:'numeric'})})`,
            startDate: sStr,
            endDate: eStr
        });
        
        startD.setDate(startD.getDate() + 7);
        if (startD.getFullYear() > year) break;
    }
    return weeks;
};

const TimesheetApprovals = () => {
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [selectedWeek, setSelectedWeek] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [locations, setLocations] = useState([]);
    const [regionMode, setRegionMode] = useState('HQ'); // 'HQ' or 'Asia'

    const startDayOfWeek = regionMode === 'Asia' ? 0 : 1;
    const weeksList = React.useMemo(() => generateYearlyWeeks(new Date().getFullYear(), startDayOfWeek), [startDayOfWeek]);

    useEffect(() => {
        // Init to current week mapped onto selected region
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
        const match = weeksList.find(w => w.startDate <= todayStr && w.endDate >= todayStr);
        if(match) {
            setSelectedWeek(match.value);
            setStartDate(match.startDate);
            setEndDate(match.endDate);
        }
    }, [weeksList]); // Recalculate and update bound when region (weeksList) shifts

    const handleWeekChange = (e) => {
        const val = e.target.value;
        setSelectedWeek(val);
        if (val) {
            const [s, eDate] = val.split('|');
            setStartDate(s);
            setEndDate(eDate);
        }
    };

    useEffect(() => {
        if(startDate && endDate) fetchData();
    }, [startDate, endDate, regionMode]);

    const fetchData = async () => {
        if (!isFinancial) return;
        setLoading(true);
        try {
            const [usersRes, eventsRes, tasksRes, locationsRes] = await Promise.all([
                api.get('/users/'),
                api.get(`/task-events/?start_date=${startDate}&end_date=${endDate}`),
                api.get('/tasks/'),
                api.get('/locations/')
            ]);
            setLocations(locationsRes);
            setEvents(eventsRes);
            setTasks(tasksRes);
            
            // Filter users based on Region toggle
            const filteredUsers = usersRes.filter(u => {
                if(!u.is_active || !u.is_employee) return false;
                
                const loc = locationsRes.find(l => l.id === u.location_id);
                const locName = (u.location?.name || loc?.name || '').toLowerCase();
                const isAsia = locName.includes('asia');
                
                return regionMode === 'Asia' ? isAsia : !isAsia;
            });
            setUsers(filteredUsers);
        } catch (err) {
            console.error(err);
            alert("Error fetching data");
        }
        setLoading(false);
    };

    const handleApprove = async (userId) => {
        if(!window.confirm("Approve this user's submitted timesheet?")) return;
        setLoading(true);
        try {
            await api.post('/task-events/approve', {
                user_id: userId,
                start_date: startDate,
                end_date: endDate
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to approve");
        }
        setLoading(false);
    };

    const handleReject = async (userId) => {
        if(!window.confirm("Reject this timesheet? The user will be notified to fix and resubmit.")) return;
        setLoading(true);
        try {
            await api.post('/task-events/reject', {
                user_id: userId,
                start_date: startDate,
                end_date: endDate
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to reject");
        }
        setLoading(false);
    };

    // Group events logically
    const groupedUsers = users.map(u => {
        const userEvents = events.filter(e => e.user_id === u.id);
        const totalHours = userEvents.reduce((sum, e) => sum + (e.hours_spent || 0), 0);
        
        let overallStatus = 'Draft';
        if (userEvents.length > 0) {
            const statuses = userEvents.map(e => e.status || 'Draft');
            if (statuses.includes('Submitted')) overallStatus = 'Submitted';
            else if (statuses.every(s => s === 'Approved')) overallStatus = 'Approved';
            else if (statuses.includes('Rejected')) overallStatus = 'Rejected';
            else if (statuses.includes('Locked')) overallStatus = 'Locked';
        } else {
            overallStatus = 'No Entries';
        }

        return { ...u, userEvents, totalHours, overallStatus };
    });

    if (!isFinancial) return <div style={{ padding: '2rem' }}>Access Denied</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <div>
                    <h2>Timesheet Approvals</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Review and manage historically tracked hours by region timeline.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <button 
                            className={`btn-${regionMode === 'HQ' ? 'primary' : 'secondary'}`} 
                            style={{ padding: '0.25rem 1rem', border: 'none', background: regionMode === 'HQ' ? 'var(--primary)' : 'transparent', color: regionMode === 'HQ' ? 'white' : 'var(--text-muted)' }}
                            onClick={() => setRegionMode('HQ')}
                        >Headquarters</button>
                        <button 
                            className={`btn-${regionMode === 'Asia' ? 'primary' : 'secondary'}`} 
                            style={{ padding: '0.25rem 1rem', border: 'none', background: regionMode === 'Asia' ? 'var(--primary)' : 'transparent', color: regionMode === 'Asia' ? 'white' : 'var(--text-muted)' }}
                            onClick={() => setRegionMode('Asia')}
                        >Asia</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Week</span>
                        <select 
                            value={selectedWeek} 
                            onChange={handleWeekChange}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        >
                            {weeksList.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading timesheets...</div>
            ) : (
                <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Status</th>
                                <th>Entries Logged</th>
                                <th>Total Hours</th>
                                <th>Tasks Touched</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No active employees found.
                                    </td>
                                </tr>
                            ) : (
                                groupedUsers.map(u => {
                                    const tasksTouched = new Set(u.userEvents.map(e => e.task?.description || `Task #${e.task_id}`));
                                    
                                    let statusColor = 'var(--text-muted)';
                                    if(u.overallStatus === 'Submitted') statusColor = '#3b82f6';
                                    if(u.overallStatus === 'Approved') statusColor = '#10b981';
                                    if(u.overallStatus === 'Rejected') statusColor = '#ef4444';
                                    if(u.overallStatus === 'Locked') statusColor = 'var(--warning)';

                                    return (
                                        <tr key={u.id} style={{ borderLeft: `4px solid ${statusColor}` }}>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{u.first_name || u.username} {u.last_name || ''}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.title || "Employee"}</div>
                                            </td>
                                            <td>
                                                <span style={{ padding: '0.25rem 0.5rem', background: `${statusColor}22`, color: statusColor, borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                    {u.overallStatus}
                                                </span>
                                            </td>
                                            <td>{u.userEvents.length} distinct logs</td>
                                            <td style={{ fontWeight: 'bold' }}>{u.totalHours.toFixed(2)}</td>
                                            <td>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {Array.from(tasksTouched).join(', ') || '-'}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {u.overallStatus === 'Submitted' ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                                                        <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => handleReject(u.id)}>Reject</button>
                                                    </div>
                                                ) : u.overallStatus === 'Approved' ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approved</span>
                                                        <button 
                                                            style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }} 
                                                            onClick={() => handleReject(u.id)}
                                                            title="Revert to Rejected (Editable) state"
                                                        >Revert</button>
                                                        <button
                                                            style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            title="Download PDF Archive"
                                                            onClick={() => {
                                                                const columns = [
                                                                    { header: 'Date', accessor: 'event_date' },
                                                                    { header: 'Time', accessor: (r) => r.start_time || '-' },
                                                                    { header: 'Employee', accessor: () => u.username },
                                                                    { header: 'Task', accessor: (r) => { 
                                                                        const t = tasks.find(x => x.id === r.task_id); 
                                                                        return t ? `${t.description}\n(#${r.task_id})` : '-'; 
                                                                    } },
                                                                    { header: 'Type', accessor: (r) => r.event_type || 'Other' },
                                                                    { header: 'Location', accessor: (r) => r.work_location || 'Office' },
                                                                    { header: 'Status', accessor: (r) => r.status || 'Draft' },
                                                                    { header: 'Hours', accessor: 'hours_spent' },
                                                                    { header: 'Description', accessor: 'content' }
                                                                ];
                                                                const filteredRows = u.userEvents.filter(r => r.event_date).sort((a, b) => {
                                                                    const timeA = new Date(`${a.event_date}T${a.start_time || '00:00'}`).getTime();
                                                                    const timeB = new Date(`${b.event_date}T${b.start_time || '00:00'}`).getTime();
                                                                    return timeA - timeB;
                                                                });
                                                                const matchWeekLabel = weeksList.find(w => w.startDate === startDate && w.endDate === endDate)?.label || `Dates: ${startDate} to ${endDate}`;
                                                                const weekMatch = matchWeekLabel.match(/Week (\d+)/);
                                                                const weekNum = weekMatch ? weekMatch[1] : 'xx';
                                                                const currentYear = startDate ? startDate.split('-')[0] : new Date().getFullYear();
                                                                
                                                                const fileName = `${u.username}_w${weekNum}_y${currentYear}_approved.pdf`;
                                                                
                                                                const meta = {
                                                                    empId: u.id,
                                                                    empName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
                                                                    weekRange: matchWeekLabel,
                                                                    uniqueDays: new Set(filteredRows.map(r => r.event_date)).size,
                                                                    totalHours: u.totalHours.toFixed(2)
                                                                };
                                                                
                                                                import('../utils/exportUtils').then(({ exportTimesheetPDF }) => {
                                                                    exportTimesheetPDF(filteredRows, columns, meta, fileName);
                                                                });
                                                            }}
                                                        >
                                                            PDF <svg style={{marginLeft:'2px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {u.overallStatus === 'No Entries' ? '-' : `Already ${u.overallStatus}`}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TimesheetApprovals;
