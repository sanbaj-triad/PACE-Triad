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

const Timesheet = () => {
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);

    const [events, setEvents] = useState([]);
    const [yearlyEvents, setYearlyEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [allVirtualTasks, setAllVirtualTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Track rows being edited locally before saving
    // A row can be a newly created row (id: `new-${Date.now()}`) or an existing event loaded from DB
    const [rows, setRows] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [taskFilterMode, setTaskFilterMode] = useState('both'); // 'all', 'project', 'virtual'
    const [sortConfig, setSortConfig] = useState({ key: 'event_date', direction: 'desc' });

    const activeTargetUser = selectedEmployee ? users.find(u => u.id === parseInt(selectedEmployee)) : user;
    const targetLoc = locations.find(l => l.id === activeTargetUser?.location_id);
    const locName = activeTargetUser?.location?.name || targetLoc?.name || '';
    const isAsia = locName.toLowerCase().includes('asia');
    const startDayOfWeek = isAsia ? 0 : 1; 
    
    const weeksList = React.useMemo(() => generateYearlyWeeks(new Date().getFullYear(), startDayOfWeek), [startDayOfWeek]);
    const [selectedWeek, setSelectedWeek] = useState('');

    useEffect(() => {
        const match = weeksList.find(w => w.startDate === startDate && w.endDate === endDate);
        setSelectedWeek(match ? match.value : '');
    }, [startDate, endDate, weeksList]);

    const handleWeekChange = (e) => {
        const val = e.target.value;
        setSelectedWeek(val);
        if (val) {
            const [s, eDate] = val.split('|');
            setStartDate(s);
            setEndDate(eDate);
        }
    };

    const sortedRows = React.useMemo(() => {
        let sortableRows = [...rows];
        if (sortConfig !== null) {
            sortableRows.sort((a, b) => {
                if (a.isNew && !b.isNew) return -1;
                if (!a.isNew && b.isNew) return 1;

                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'task_id') {
                    if (typeof aVal === 'string' && aVal.startsWith('m-')) {
                        const m = allVirtualTasks.find(x => `m-${x.id}` === aVal);
                        aVal = m ? m.name : '';
                    } else {
                        const taskA = allTasks.find(t => t.id === aVal);
                        aVal = taskA ? taskA.description : '';
                    }
                    if (typeof bVal === 'string' && bVal.startsWith('m-')) {
                        const m = allVirtualTasks.find(x => `m-${x.id}` === bVal);
                        bVal = m ? m.name : '';
                    } else {
                        const taskB = allTasks.find(t => t.id === bVal);
                        bVal = taskB ? taskB.description : '';
                    }
                } else if (sortConfig.key === 'user_id') {
                    const userA = users.find(u => u.id === aVal);
                    const userB = users.find(u => u.id === bVal);
                    aVal = userA ? userA.username : '';
                    bVal = userB ? userB.username : '';
                } else if (sortConfig.key === 'hours_spent') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = aVal || '';
                    bVal = bVal || '';
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableRows;
    }, [rows, sortConfig, tasks, users]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const validRows = rows.filter(r => r.event_date && parseFloat(r.hours_spent) > 0);
    const uniqueDays = new Set(validRows.map(r => r.event_date)).size;
    const totalHours = validRows.reduce((sum, r) => sum + parseFloat(r.hours_spent || 0), 0);

    const isPastWeek = endDate ? new Date(endDate) <= new Date() : false; // Use <= for edge cases
    const hasDraftOrRejected = validRows.some(r => ['Draft', 'Rejected'].includes(r.status));
    const hasUnsavedChanges = rows.some(r => r.isDirty);
    
    const canSubmit = isPastWeek && totalHours >= 35 && hasDraftOrRejected && !hasUnsavedChanges;

    const handleSubmitTimesheet = async () => {
        if (!window.confirm(`Submit timesheet for ${totalHours.toFixed(1)} hours over ${startDate} to ${endDate}?`)) return;
        setLoading(true);
        try {
            await api.post('/task-events/submit', {
                user_id: activeTargetUser?.id || user.id,
                start_date: startDate,
                end_date: endDate
            });
            alert("Timesheet successfully submitted!");
            fetchData();
        } catch (err) {
            alert(`Failed to submit: ${err.response?.data?.detail || err.message}`);
            setLoading(false);
        }
    };

    const handleRevertRejected = async () => {
        if (!window.confirm("Revert your rejected timesheet back to Draft to make corrections?")) return;
        setLoading(true);
        try {
            await api.post('/task-events/lock_project', {
                project_id: -1, // Not used but schema required, we will rewrite an endpoint or better yet, just loop the front end edit
                lock: false 
            }); 
            // Wait, there is no un-reject endpoint. I can just edit the grid rows manually to map to DB!
            // Actually they can just edit "Rejected" items natively because crud.py allows it.
            // "if db_event.status.value not in ['Draft', 'Rejected']"
            // Let's just leave them as Rejected and let them edit and hit submit!
        } catch(err) {} 
        setLoading(false);
    }
    
    useEffect(() => {
        fetchData();
    }, [startDate, endDate, selectedEmployee]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const eventUrl = selectedEmployee && isFinancial 
                ? `/task-events/?start_date=${startDate}&end_date=${endDate}&user_id=${selectedEmployee}`
                : `/task-events/?start_date=${startDate}&end_date=${endDate}`;

            const currentYear = new Date().getFullYear();
            const yearUrl = selectedEmployee && isFinancial
                ? `/task-events/?start_date=${currentYear}-01-01&end_date=${currentYear}-12-31&user_id=${selectedEmployee}`
                : `/task-events/?start_date=${currentYear}-01-01&end_date=${currentYear}-12-31`;

            // Fetch relevant data
            const [eventsRes, tasksRes, usersRes, projectsRes, locationsRes, yearlyEventsRes, milestonesRes] = await Promise.all([
                api.get(eventUrl),
                api.get('/tasks/'),
                isFinancial ? api.get('/users/') : Promise.resolve([]),
                api.get('/projects/'),
                api.get('/locations/'),
                api.get(yearUrl),
                api.get('/milestones/')
            ]);

            setEvents(eventsRes);
            setYearlyEvents(yearlyEventsRes);
            setProjects(projectsRes);
            setLocations(locationsRes);
            
            setAllTasks(tasksRes); // Store all tasks including closed
            const virtualTasks = milestonesRes.filter(m => m.is_global_bucket === true);
            setAllVirtualTasks(virtualTasks);
            
            // Filter tasks based on RBAC mapping
            const activeTasks = tasksRes.filter(task => task.status !== 'Completed');
            const availableTasks = isFinancial 
                ? activeTasks 
                : activeTasks.filter(t => t.assigned_to_id === user?.id);
                
            setTasks(availableTasks);
            
            if (isFinancial) {
                setUsers(usersRes.filter(u => u.is_active && u.is_employee));
            }

            // Sync database events to local grid row state
            setRows(eventsRes.map(e => ({
                isNew: false,
                id: e.id,
                task_id: e.milestone_id ? `m-${e.milestone_id}` : (e.task_id || ''),
                user_id: e.user_id || user?.id,
                content: e.content || '',
                event_date: e.event_date ? new Date(e.event_date).toISOString().split('T')[0] : '',
                start_time: e.start_time || '',
                hours_spent: e.hours_spent || 0,
                event_type: e.event_type || 'Other',
                work_location: e.work_location || localStorage.getItem('globalWorkLocation') || 'Office',
                latitude: e.latitude || null,
                longitude: e.longitude || null,
                status: e.status || 'Draft',
                project_name: e.project_name,
                project_number: e.project_number,
                milestone_name: e.milestone_name,
                customer_name: e.customer_name,
                task_title: e.task_title,
                isDirty: false
            })));
            
        } catch (err) {
            console.error("Failed to load timesheet data:", err);
            alert("Error loading timesheet.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        const td = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const localDateString = `${td.getFullYear()}-${pad(td.getMonth()+1)}-${pad(td.getDate())}`;

        const newRow = {
            isNew: true,
            id: `new-${Date.now()}`,
            task_id: tasks.length > 0 ? tasks[0].id : '',
            user_id: user?.id,
            content: '',
            event_date: localDateString,
            start_time: '',
            hours_spent: 0,
            event_type: 'Other',
            work_location: localStorage.getItem('globalWorkLocation') || 'Office',
            status: 'Draft',
            isDirty: true
        };
        setRows([newRow, ...rows]);
    };

    const handleRowChange = (id, field, value) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                return { ...row, [field]: value, isDirty: true };
            }
            return row;
        }));
    };

    const handleRemoveNewRow = (id) => {
        setRows(prev => prev.filter(row => row.id !== id));
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Delete this timesheet entry forever?")) return;
        try {
            await api.delete(`/task-events/${id}`);
            setRows(prev => prev.filter(row => row.id !== id));
        } catch (err) {
            console.error("Failed to delete event:", err);
            alert("Error deleting event.");
        }
    };

    const validateRow = (row) => {
        if (!row.task_id) return "Task is required";
        if (!row.event_date) return "Date is required";
        if (!row.content.trim()) return "Description is required";
        if (parseFloat(row.hours_spent) <= 0) return "Hours must be greater than 0";

        // Prevent future dates natively
        const selectedDateStr = row.event_date;
        const selectedTimeStr = row.start_time || new Date().toTimeString().split(' ')[0].substring(0,5);
        const selectedDateTime = new Date(`${selectedDateStr}T${selectedTimeStr}`);
        if (selectedDateTime > new Date()) {
            return "Invalid future date selected.";
        }
        return null;
    };

    const handleSaveAll = async () => {
        const dirtyRows = rows.filter(r => r.isDirty);
        if (dirtyRows.length === 0) {
            alert("No changes to save.");
            return;
        }

        // Validate all dirty rows before sending any requests
        for (let row of dirtyRows) {
            const error = validateRow(row);
            if (error) {
                alert(`Error on row items: ${error}`);
                return;
            }
        }

        setLoading(true);
        try {
            for (let row of dirtyRows) {
                const payload = {
                    content: row.content,
                    event_date: row.event_date,
                    start_time: row.start_time || null,
                    end_time: null,
                    hours_spent: parseFloat(row.hours_spent),
                    user_id: row.user_id, // The backend now respects this!
                    event_type: row.event_type || 'Other',
                    work_location: row.work_location || 'Office',
                    task_id: (typeof row.task_id === 'string' && row.task_id.startsWith('m-')) ? null : parseInt(row.task_id),
                    milestone_id: (typeof row.task_id === 'string' && row.task_id.startsWith('m-')) ? parseInt(row.task_id.substring(2)) : null
                };

                if (row.isNew) {
                    // Route to new explicit events router if it's bound to milestone vs task natively, actually the backend '/events/' endpoint allows pure create!
                    await api.post('/events', { ...payload, user_id: activeTargetUser?.id || user.id });
                } else {
                    await api.put(`/task-events/${row.id}`, payload);
                }
            }
            alert("Timesheet saved successfully!");
            fetchData(); // Reload everything cleanly
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to save timesheet: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const historyLogs = React.useMemo(() => {
        const pastWeeks = weeksList.filter(w => new Date(w.startDate) <= new Date()).reverse(); // latest first
        
        return pastWeeks.map(w => {
            const wEvents = yearlyEvents.filter(e => e.event_date >= w.startDate && e.event_date <= w.endDate);
            const wTotalHours = wEvents.reduce((sum, e) => sum + parseFloat(e.hours_spent || 0), 0);
            
            let overallStatus = 'Draft';
            if (wEvents.length > 0) {
                const statuses = wEvents.map(e => e.status || 'Draft');
                if (statuses.includes('Submitted')) overallStatus = 'Submitted';
                else if (statuses.every(s => s === 'Approved')) overallStatus = 'Approved';
                else if (statuses.includes('Rejected')) overallStatus = 'Rejected';
                else if (statuses.includes('Locked')) overallStatus = 'Locked';
            } else {
                overallStatus = 'No Entries';
            }
            
            return {
                ...w,
                events: wEvents,
                totalHours: wTotalHours,
                status: overallStatus
            };
        });
    }, [weeksList, yearlyEvents]);

    if (loading && rows.length === 0) return <div style={{ padding: '2rem' }}>Loading Timesheet...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <h2>Timesheet</h2>
                    {validRows.some(r => ['Approved', 'Locked'].includes(r.status)) && (
                        <div style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #ef4444', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                            View includes Approved/Locked timesheet entries which cannot be edited.
                        </div>
                    )}
                    <p style={{ color: 'var(--text-muted)' }}>Log internal hours and event details synchronously across multiple tasks.</p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        <div style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{uniqueDays}</strong> Unique Days
                        </div>
                        <div style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{totalHours.toFixed(1)}</strong> Total Hours
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Week</span>
                        <select 
                            value={selectedWeek} 
                            onChange={handleWeekChange}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        >
                            <option value="">-- Custom Date --</option>
                            {weeksList.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>From</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>To</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        />
                    </div>
                    
                    {isFinancial && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Employee</span>
                            <select 
                                value={selectedEmployee} 
                                onChange={e => setSelectedEmployee(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                            >
                                <option value="">All Employees</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Task Filter:</span>
                        <select 
                            value={taskFilterMode} 
                            onChange={e => setTaskFilterMode(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        >
                            <option value="both">All Tasks & Virtual</option>
                            <option value="project">Project Tasks Only</option>
                            <option value="virtual">Virtual / Global Only</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Date', accessor: 'event_date' },
                                { header: 'Time', accessor: (r) => r.start_time || '-' },
                                { header: 'Employee', accessor: (r) => { 
                                    const u = users.find(x => x.id === r.user_id); 
                                    return u ? u.username : (r.user_id === user?.id ? user?.username : '-'); 
                                } },
                                { header: 'Task #', accessor: (r) => r.task_id ? `#${r.task_id}` : '-' },
                                { header: 'Task Name', accessor: (r) => { 
                                    if (typeof r.task_id === 'string' && r.task_id.startsWith('m-')) {
                                        const m = allVirtualTasks.find(x => `m-${x.id}` === r.task_id);
                                        return m ? `[Virtual] ${m.name}` : '-';
                                    }
                                    const t = allTasks.find(x => x.id === r.task_id); 
                                    return t ? t.description : '-'; 
                                } },
                                { header: 'Project #', accessor: (r) => {
                                    if (typeof r.task_id === 'string' && r.task_id.startsWith('m-')) return 'Global';
                                    const t = allTasks.find(x => x.id === r.task_id);
                                    return (t && t.project_id) ? `P-${t.project_id}` : '-';
                                } },
                                { header: 'Project Name', accessor: (r) => {
                                    if (r.project_name) return `${r.project_name} ${r.project_number ? `(P-${r.project_number})` : ''}`;
                                    const t = allTasks.find(x => x.id === r.task_id);
                                    if(!t) return '-';
                                    const p = projects.find(x => x.id === t.project_id);
                                    return p ? p.name : '-';
                                } },
                                { header: 'Type', accessor: (r) => r.event_type || 'Other' },
                                { header: 'Location', accessor: (r) => r.work_location || 'Office' },
                                { header: 'Status', accessor: (r) => r.status || 'Draft' },
                                { header: 'Hours', accessor: 'hours_spent' },
                                { header: 'Description', accessor: 'content' }
                            ];
                            const filteredRows = rows.filter(r => !r.isNew && r.event_date).sort((a, b) => {
                                const timeA = new Date(`${a.event_date}T${a.start_time || '00:00'}`).getTime();
                                const timeB = new Date(`${b.event_date}T${b.start_time || '00:00'}`).getTime();
                                return timeA - timeB;
                            });
                            import('../utils/exportUtils').then(({ exportToCSV }) => {
                                exportToCSV(filteredRows, columns, 'timesheet_export.csv');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Date', accessor: 'event_date' },
                                { header: 'Time', accessor: (r) => r.start_time || '-' },
                                { header: 'Employee', accessor: (r) => { 
                                    const u = users.find(x => x.id === r.user_id); 
                                    return u ? u.username : (r.user_id === user?.id ? user?.username : '-'); 
                                } },
                                { header: 'Task', accessor: (r) => { 
                                    if (r.task_title) return `${r.task_title}\n(${r.task_id})`;
                                    if (typeof r.task_id === 'string' && r.task_id.startsWith('m-')) {
                                        const m = allVirtualTasks.find(x => `m-${x.id}` === r.task_id);
                                        return m ? `[Virtual] ${m.name}\n(Global)` : '-';
                                    }
                                    const t = allTasks.find(x => x.id === r.task_id); 
                                    return t ? `${t.description}\n(#${r.task_id})` : '-'; 
                                } },
                                { header: 'Project', accessor: (r) => {
                                    if (r.project_name) return `${r.project_name}\n${r.project_number ? `(P-${r.project_number})` : ''}`;
                                    if (typeof r.task_id === 'string' && r.task_id.startsWith('m-')) return 'Virtual / Global Bucket';
                                    const t = allTasks.find(x => x.id === r.task_id);
                                    if(!t) return '-';
                                    const p = projects.find(x => x.id === t.project_id);
                                    return p ? `${p.name}\n(P-${t.project_id})` : (t.project_id ? `Unassigned\n(P-${t.project_id})` : '-');
                                } },
                                { header: 'Type', accessor: (r) => r.event_type || 'Other' },
                                { header: 'Location', accessor: (r) => r.work_location || 'Office' },
                                { header: 'Status', accessor: (r) => r.status || 'Draft' },
                                { header: 'Hours', accessor: 'hours_spent' },
                                { header: 'Description', accessor: 'content' }
                            ];
                            const filteredRows = rows.filter(r => !r.isNew && r.event_date).sort((a, b) => {
                                const timeA = new Date(`${a.event_date}T${a.start_time || '00:00'}`).getTime();
                                const timeB = new Date(`${b.event_date}T${b.start_time || '00:00'}`).getTime();
                                return timeA - timeB;
                            });
                            
                            const actUser = selectedEmployee ? users.find(u => u.id === parseInt(selectedEmployee)) : user;
                            const actUserName = actUser ? actUser.username : 'Unknown';
                            
                            const matchWeekLabel = weeksList.find(w => w.startDate === startDate && w.endDate === endDate)?.label || `Dates: ${startDate} to ${endDate}`;
                            const weekMatch = matchWeekLabel.match(/Week (\d+)/);
                            const weekNum = weekMatch ? weekMatch[1] : 'xx';
                            const currentYear = startDate ? startDate.split('-')[0] : new Date().getFullYear();
                            
                            const fileName = `${actUserName}_w${weekNum}_y${currentYear}.pdf`;
                            
                            const meta = {
                                empId: actUser?.id || 'N/A',
                                empName: actUser ? `${actUser.first_name || ''} ${actUser.last_name || ''}`.trim() : 'Unknown',
                                weekRange: matchWeekLabel,
                                uniqueDays: uniqueDays,
                                totalHours: totalHours.toFixed(1)
                            };
                            
                            import('../utils/exportUtils').then(({ exportTimesheetPDF }) => {
                                exportTimesheetPDF(filteredRows, columns, meta, fileName);
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <button onClick={handleAddRow} className="btn-secondary">
                        + Add Row
                    </button>
                    {isPastWeek ? (
                        canSubmit ? (
                            <button onClick={handleSubmitTimesheet} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Submit Timesheet
                            </button>
                        ) : (
                            <button disabled style={{ background: 'var(--bg-dark)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'not-allowed', fontWeight: 'bold' }} 
                                title="Check constraints: Over 35 hours required, all changes must be saved, and entries must be in a Draft or Rejected state.">
                                {hasUnsavedChanges ? 'Save Changes to Submit' : (totalHours < 35 ? `Submit (${totalHours.toFixed(1)}/35 hrs)` : 'Timesheet Fully Submitted/Locked')}
                            </button>
                        )
                    ) : (
                        <div style={{ padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cannot submit current/future weeks.</div>
                    )}
                    {(validRows.some(r => r.status === 'Rejected') && !canSubmit) && (
                        <div style={{ color: '#ef4444', fontWeight: 'bold', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                            Contains Rejected Entries - Fix and Resubmit
                        </div>
                    )}
                    <button onClick={handleSaveAll} className="btn-primary">
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '900px' }}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('event_date')} style={{ width: '10%', cursor: 'pointer' }}>Date {sortConfig?.key === 'event_date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('start_time')} style={{ width: '8%', cursor: 'pointer' }}>Time {sortConfig?.key === 'start_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            {isFinancial && <th onClick={() => handleSort('user_id')} style={{ width: '10%', cursor: 'pointer' }}>Employee {sortConfig?.key === 'user_id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
                            <th onClick={() => handleSort('task_id')} style={{ width: '16%', cursor: 'pointer' }}>Task {sortConfig?.key === 'task_id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('event_type')} style={{ width: '10%', cursor: 'pointer' }}>Type {sortConfig?.key === 'event_type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('work_location')} style={{ width: '8%', cursor: 'pointer' }}>Location {sortConfig?.key === 'work_location' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th style={{ width: '4%', textAlign: 'center' }}>GPS</th>
                            <th onClick={() => handleSort('hours_spent')} style={{ width: '8%', cursor: 'pointer' }}>Hours {sortConfig?.key === 'hours_spent' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('content')} style={{ width: '18%', cursor: 'pointer' }}>Description {sortConfig?.key === 'content' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th style={{ width: '12%' }}>Project (Ref)</th>
                            <th style={{ width: '7%' }}>Status</th>
                            <th style={{ width: '4%' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={isFinancial ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No timesheet entries found for this period. Click "+ Add Row" to create one!
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map(row => {
                                const isClosedTask = !row.isNew && typeof row.task_id === 'number' && allTasks.find(t => t.id === row.task_id)?.status === 'Completed';
                                const isLocked = isClosedTask || ['Approved', 'Locked'].includes(row.status) || (row.status === 'Submitted' && !isFinancial);
                                return (
                                <tr key={row.id} style={{ background: row.isDirty ? 'var(--bg-dark)' : (row.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'), opacity: isLocked ? 0.6 : 1 }}>
                                    <td>
                                        <input 
                                            type="date" 
                                            value={row.event_date} 
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'event_date', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="time"  
                                            value={row.start_time} 
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'start_time', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    {isFinancial && (
                                        <td>
                                            <select 
                                                value={row.user_id} 
                                                disabled={isLocked}
                                                onChange={(e) => handleRowChange(row.id, 'user_id', parseInt(e.target.value))}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            >
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                    <td>
                                        <select 
                                            value={row.task_id} 
                                            disabled={isLocked}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleRowChange(row.id, 'task_id', val.startsWith('m-') ? val : parseInt(val));
                                            }}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">-- Select Task --</option>
                                            
                                            {['both', 'project'].includes(taskFilterMode) && (
                                                <optgroup label="Project Tasks">
                                                    {tasks.map(t => (
                                                        <option key={t.id} value={t.id}>#{t.id} - {t.description.length > 30 ? t.description.substring(0, 30)+'...' : t.description}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            
                                            {['both', 'virtual'].includes(taskFilterMode) && (
                                                <optgroup label="Virtual / Global Buckets">
                                                    {allVirtualTasks.map(m => (
                                                        <option key={`m-${m.id}`} value={`m-${m.id}`}>[Virtual] {m.customer_name ? `${m.customer_name} : ` : ''}{m.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}

                                            {!row.isNew && row.task_id && !tasks.find(t => t.id === row.task_id) && typeof row.task_id !== 'string' && (
                                                <option value={row.task_id}>
                                                    {allTasks.find(t => t.id === row.task_id) 
                                                        ? `Closed: ${allTasks.find(t => t.id === row.task_id).description}`.substring(0,40) + '...' 
                                                        : `Task #${row.task_id} (Closed/Filtered)`}
                                                </option>
                                            )}
                                            
                                            {!row.isNew && row.task_id && typeof row.task_id === 'string' && !allVirtualTasks.find(m => `m-${m.id}` === row.task_id) && (
                                                <option value={row.task_id}>
                                                    [Virtual Closed]
                                                </option>
                                            )}
                                        </select>
                                    </td>
                                    <td>
                                        <select 
                                            value={row.event_type} 
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'event_type', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
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
                                            <option value="Panel Building">Panel Building</option>
                                            <option value="Planning">Planning</option>
                                            <option value="Programming">Programming</option>
                                            <option value="SAT">SAT</option>
                                            <option value="Shipping">Shipping</option>
                                            <option value="Support">Support</option>
                                            <option value="Testing">Testing</option>
                                            <option value="Training">Training</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select 
                                            value={row.work_location} 
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'work_location', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="Office">Office</option>
                                            <option value="Home">Home</option>
                                            <option value="Field">Field</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Training">Training</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {row.latitude && row.longitude ? (
                                            <a 
                                                href={`https://maps.google.com/?q=${row.latitude},${row.longitude}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                title={`View GPS Location: ${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`}
                                                style={{ color: '#0ea5e9', textDecoration: 'none' }}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            </a>
                                        ) : (
                                            <span style={{ color: 'var(--border)' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <input 
                                            type="number" 
                                            min="0.1"
                                            step="0.1"
                                            value={row.hours_spent} 
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'hours_spent', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={row.content} 
                                            placeholder="What did you work on?"
                                            disabled={isLocked}
                                            onChange={(e) => handleRowChange(row.id, 'content', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    <td>
                                        <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={
                                            (() => {
                                                if (row.project_name) return `Project: ${row.project_name} | Customer: ${row.customer_name || 'N/A'}`;
                                                if (typeof row.task_id === 'string' && row.task_id.startsWith('m-')) return 'Virtual / Global Bucket';
                                                const t = allTasks.find(x => x.id === parseInt(row.task_id));
                                                const p = t ? projects.find(x => x.id === t.project_id) : null;
                                                return p ? `Project #${p.id} - ${p.name}` : 'No Project / Unassigned';
                                            })()
                                        }>
                                            {(() => {
                                                if (row.project_name) return <span>{row.project_number ? `P-${row.project_number} - ` : ''}{row.project_name}</span>;
                                                if (typeof row.task_id === 'string' && row.task_id.startsWith('m-')) return <span>Virtual Bucket</span>;
                                                const t = allTasks.find(x => x.id === parseInt(row.task_id));
                                                const p = t ? projects.find(x => x.id === t.project_id) : null;
                                                if (p) {
                                                    return <span>#{p.id} - {p.name}</span>;
                                                }
                                                return <span>-</span>;
                                            })()}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 'bold', 
                                                padding: '0.2rem 0.5rem', 
                                                borderRadius: '4px',
                                                background: row.status === 'Submitted' ? '#3b82f622' : row.status === 'Approved' ? '#10b98122' : row.status === 'Rejected' ? '#ef444422' : row.status === 'Locked' ? 'var(--warning-light, rgba(245,158,11,0.2))' : 'var(--bg-secondary)',
                                                color: row.status === 'Submitted' ? '#3b82f6' : row.status === 'Approved' ? '#10b981' : row.status === 'Rejected' ? '#ef4444' : row.status === 'Locked' ? 'var(--warning)' : 'var(--text-muted)'
                                            }}>
                                                {row.status || 'Draft'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {row.isNew ? (
                                            <button 
                                                onClick={() => handleRemoveNewRow(row.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                title="Remove Row"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleDeleteEvent(row.id)}
                                                disabled={isLocked}
                                                style={{ background: 'transparent', border: 'none', color: isLocked ? 'var(--text-muted)' : '#ef4444', cursor: isLocked ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
                                                title="Delete Event Log"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="card" style={{ marginTop: '2rem', padding: '0' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0 }}>{isFinancial && selectedEmployee ? 'Historical Employee Timesheets' : 'My Timesheet History'}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{isFinancial && selectedEmployee ? 'A comprehensive chronological log of submitted timesheets for this user.' : 'A comprehensive chronological log of your submitted timesheets this year.'}</p>
                </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Week Timeline</th>
                                    <th>Status</th>
                                    <th>Total Hours</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyLogs.length === 0 || historyLogs.every(w => w.status === 'No Entries') ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No historical time entries exist for this year.
                                        </td>
                                    </tr>
                                ) : (
                                    historyLogs.map(w => {
                                        if(w.status === 'No Entries') return null;
                                        
                                        let statusColor = 'var(--text-muted)';
                                        if(w.status === 'Submitted') statusColor = '#3b82f6';
                                        if(w.status === 'Approved') statusColor = '#10b981';
                                        if(w.status === 'Rejected') statusColor = '#ef4444';
                                        if(w.status === 'Locked') statusColor = 'var(--warning)';

                                        return (
                                            <tr key={w.value} style={{ borderLeft: `4px solid ${statusColor}` }}>
                                                <td style={{ fontWeight: 'bold' }}>{w.label}</td>
                                                <td>
                                                    <span style={{ padding: '0.25rem 0.5rem', background: `${statusColor}22`, color: statusColor, borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 'bold' }}>{w.totalHours.toFixed(2)}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button 
                                                            className="btn-secondary" 
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} 
                                                            onClick={() => {
                                                                setSelectedWeek(w.value);
                                                                setStartDate(w.startDate);
                                                                setEndDate(w.endDate);
                                                                window.scrollTo({top: 0, behavior: 'smooth'});
                                                            }}
                                                        >View Grid</button>

                                                        <button
                                                            className="btn-secondary"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center' }}
                                                            onClick={() => {
                                                                const columns = [
                                                                    { header: 'Date', accessor: 'event_date' },
                                                                    { header: 'Time', accessor: (r) => r.start_time || '-' },
                                                                    { header: 'Task', accessor: (r) => { 
                                                                        const t = allTasks.find(x => x.id === r.task_id); 
                                                                        return t ? `${t.description}\n(#${r.task_id})` : '-'; 
                                                                    } },
                                                                    { header: 'Type', accessor: (r) => r.event_type || 'Other' },
                                                                    { header: 'Location', accessor: (r) => r.work_location || 'Office' },
                                                                    { header: 'Status', accessor: (r) => r.status || 'Draft' },
                                                                    { header: 'Hours', accessor: 'hours_spent' },
                                                                    { header: 'Description', accessor: 'content' }
                                                                ];
                                                                const filteredRows = w.events.filter(r => r.event_date).sort((a, b) => {
                                                                    const timeA = new Date(`${a.event_date}T${a.start_time || '00:00'}`).getTime();
                                                                    const timeB = new Date(`${b.event_date}T${b.start_time || '00:00'}`).getTime();
                                                                    return timeA - timeB;
                                                                });
                                                                
                                                                const actUser = selectedEmployee ? users.find(u => u.id === parseInt(selectedEmployee)) : user;
                                                                const actUserName = actUser ? actUser.username : 'Unknown';

                                                                const weekMatch = w.label.match(/Week (\d+)/);
                                                                const weekNum = weekMatch ? weekMatch[1] : 'xx';
                                                                const currentYear = w.startDate ? w.startDate.split('-')[0] : new Date().getFullYear();
                                                                const fileName = `${actUserName}_w${weekNum}_y${currentYear}_timesheet.pdf`;
                                                                
                                                                const meta = {
                                                                    empId: actUser?.id || 'N/A',
                                                                    empName: actUser ? `${actUser.first_name || ''} ${actUser.last_name || ''}`.trim() || actUser.username : 'Unknown',
                                                                    weekRange: w.label,
                                                                    uniqueDays: new Set(filteredRows.map(r => r.event_date)).size,
                                                                    totalHours: w.totalHours.toFixed(2)
                                                                };
                                                                
                                                                import('../utils/exportUtils').then(({ exportTimesheetPDF }) => {
                                                                    exportTimesheetPDF(filteredRows, columns, meta, fileName);
                                                                });
                                                            }}
                                                        >
                                                            PDF <svg style={{marginLeft:'2px'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
            </div>
        </div>
    );
};

export default Timesheet;
