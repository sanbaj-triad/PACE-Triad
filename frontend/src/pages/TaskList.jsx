import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';
import useSessionState from '../hooks/useSessionState';
import { getNestedTeamIds } from '../utils/hierarchy';

const TaskList = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useSessionState('task_list_viewMode', 'grid');
    const [sortField, setSortField] = useSessionState('task_list_sortField', 'due_date');
    const [sortOrder, setSortOrder] = useSessionState('task_list_sortOrder', 'asc');
    const [quickLogTask, setQuickLogTask] = useState(null);
    const [bulkTasks, setBulkTasks] = useState([]);
    const [isSavingBulk, setIsSavingBulk] = useState(false);
    const isFinancial = hasFinancialAccess(user);
    const isManager = user?.direct_reports?.length > 0;

    // Filters
    const [filterType, setFilterType] = useSessionState('task_list_filterType', 'all');
    const [filterProject, setFilterProject] = useSessionState('task_list_filterProject', 'all');
    const [filterPriority, setFilterPriority] = useSessionState('task_list_filterPriority', 'all');
    const [filterAssigned, setFilterAssigned] = useSessionState('task_list_filterAssigned', isFinancial ? 'all' : 'me');
    const [hideCompleted, setHideCompleted] = useSessionState('task_list_hideCompleted', true);
    const [filterDateFrom, setFilterDateFrom] = useSessionState('task_list_filterDateFrom', '');
    const [filterDateTo, setFilterDateTo] = useSessionState('task_list_filterDateTo', '');

    // Enforce basic user limits
    useEffect(() => {
        if (!isFinancial && !isManager) setFilterAssigned('me');
    }, [isFinancial, isManager]);

    const navigate = useNavigate();
    const [users, setUsers] = useState([]); // For filter by employee

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [taskData, userData] = await Promise.all([
                    api.get('/tasks/'),
                    api.get('/users/')
                ]);
                setTasks(taskData);
                setUsers(userData.filter(u => u.is_employee));
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const nestedTeamIds = getNestedTeamIds(users, user?.id);

    const filteredTasks = tasks.filter(task => {
        const isNestedReportTask = nestedTeamIds.includes(task.assigned_to_id);
        if (!isFinancial && task.assigned_to_id !== user?.id && task.task_type !== 'FIXED' && !isNestedReportTask) return false;

        if (hideCompleted && task.status === 'Completed') return false;
        if (filterType !== 'all' && task.task_type !== filterType) return false;
        if (filterPriority !== 'all' && (task.priority || 'Medium') !== filterPriority) return false;
        
        if (filterProject !== 'all') {
            const projName = task.project ? task.project.name : 'Unknown';
            if (projName !== filterProject) return false;
        }

        if ((isFinancial || isManager) && filterAssigned !== 'all') {
            if (filterAssigned === 'me') {
                if (task.assigned_to_id !== user.id && task.task_type !== 'FIXED') return false;
            } else if (filterAssigned === 'unassigned') {
                if (task.assigned_to_id !== null || task.task_type === 'FIXED') return false;
            } else {
                if (task.assigned_to_id !== parseInt(filterAssigned) && task.task_type !== 'FIXED') return false;
            }
        }

        if (filterDateFrom) {
            if (!task.due_date || new Date(task.due_date) < new Date(filterDateFrom)) return false;
        }
        if (filterDateTo) {
            if (!task.due_date || new Date(task.due_date) > new Date(filterDateTo)) return false;
        }

        return true;
    });

    // Derive unique projects for filter
    const uniqueProjects = [...new Set(tasks.map(t => t.project ? t.project.name : null).filter(Boolean))].sort();

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle defaults
        if (sortField === 'assigned_to') {
            aValue = a.task_type === 'FIXED' ? 'Global' : (a.assigned_to ? a.assigned_to.username : '');
            bValue = b.task_type === 'FIXED' ? 'Global' : (b.assigned_to ? b.assigned_to.username : '');
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    useEffect(() => {
        if (viewMode === 'bulk') {
            setBulkTasks(sortedTasks.map(t => ({ 
                ...t, 
                start_date: t.start_date ? t.start_date.split('T')[0] : '',
                due_date: t.due_date ? t.due_date.split('T')[0] : '',
                isDirty: false 
            })));
        }
    }, [viewMode, tasks, filterType, filterProject, filterPriority, filterAssigned, hideCompleted, sortField, sortOrder]);

    const handleBulkChange = (taskId, field, value) => {
        setBulkTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, [field]: value, isDirty: true };
            }
            return t;
        }));
    };

    const handleSaveBulk = async () => {
        const dirtyTasks = bulkTasks.filter(t => t.isDirty);
        if (dirtyTasks.length === 0) {
            setViewMode('list');
            return;
        }
        
        setIsSavingBulk(true);
        try {
            await Promise.all(dirtyTasks.map(t => {
                const payload = {
                    description: t.description,
                    task_type: t.task_type || 'Engineering',
                    status: t.status || 'Open',
                    priority: t.priority || 'Medium',
                    assigned_to_id: parseInt(t.assigned_to_id) || null,
                    estimated_effort: parseFloat(t.estimated_effort) || 0,
                    estimated_utilization: parseInt(t.estimated_utilization) || 0,
                    start_date: t.start_date || null,
                    due_date: t.due_date || null
                };
                return api.put(`/tasks/${t.id}`, payload);
            }));
            
            const taskData = await api.get('/tasks/');
            setTasks(taskData);
            setViewMode('list'); 
        } catch (err) {
            console.error(err);
            alert("Failed to save some tasks during bulk edit. Check console.");
        } finally {
            setIsSavingBulk(false);
        }
    };

    const handleExportCSV = () => {
        exportToCSV(sortedTasks, [
            { header: 'ID', accessor: 'id' },
            { header: 'Type', accessor: 'task_type' },
            { header: 'Description', accessor: 'description' },
            { header: 'Priority', accessor: 'priority' },
            { header: 'Status', accessor: 'status' },
            { header: 'Assigned To', accessor: (t) => t.task_type === 'FIXED' ? 'Global' : (t.assigned_to ? t.assigned_to.username : '') },
            { header: 'Start Date', accessor: (t) => t.start_date ? new Date(t.start_date).toLocaleDateString() : '' },
            { header: 'Due Date', accessor: (t) => t.due_date ? new Date(t.due_date).toLocaleDateString() : '' },
            { header: 'Progress', accessor: (t) => `${t.progress}%` }
        ], 'tasks_export.csv');
    };

    const handleExportPDF = () => {
        exportToPDF(sortedTasks, [
            { header: 'ID', accessor: 'id' },
            { header: 'Type', accessor: 'task_type' },
            { header: 'Priority', accessor: 'priority' },
            { header: 'Status', accessor: 'status' },
            { header: 'Assigned To', accessor: (t) => t.task_type === 'FIXED' ? 'Global' : (t.assigned_to ? t.assigned_to.username : '-') },
            { header: 'Start Date', accessor: (t) => t.start_date ? new Date(t.start_date).toLocaleDateString() : '-' },
            { header: 'Due Date', accessor: (t) => t.due_date ? new Date(t.due_date).toLocaleDateString() : '-' },
            { header: 'Progress', accessor: (t) => `${t.progress}%` }
        ], 'Tasks Report', 'tasks_report.pdf');
    };

    const handleDownloadSinglePDF = async (e, taskId) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/tasks/${taskId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Task_${taskId}_Report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to download PDF", err);
            alert("Failed to download Task PDF. See console for details.");
        }
    };

    const handleDelete = async (e, taskId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            await api.delete(`/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error("Failed to delete task", err);
            alert("Failed to delete task: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleCloneTask = async (e, taskId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to clone this task?")) return;

        try {
            await api.post(`/tasks/${taskId}/clone`);
            window.location.reload();
        } catch (err) {
            console.error("Failed to clone task", err);
            alert("Failed to clone task: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleSaveQuickLog = async (taskId, hours, note, eventDate, startTime, eventType, workLocation) => {
        try {
            // Calculate end time
            let endTime = null;
            if (startTime && hours > 0) {
                const [h, m] = startTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0);
                d.setMinutes(d.getMinutes() + (hours * 60));
                endTime = d.toTimeString().substring(0, 5);
            }

            // Validation: Cannot be a future date/time
            const selectedDateStr = eventDate || new Date().toISOString().split('T')[0];
            const selectedTimeStr = startTime || new Date().toTimeString().split(' ')[0].substring(0,5);
            const selectedDateTime = new Date(`${selectedDateStr}T${selectedTimeStr}`);
            
            if (selectedDateTime > new Date()) {
                alert("invalid future date selected");
                return;
            }
            
            await api.post(`/tasks/${taskId}/events`, { 
                hours_spent: hours, 
                content: note,
                event_date: eventDate || new Date().toISOString().split('T')[0],
                start_time: startTime || null,
                end_time: endTime,
                event_type: eventType || 'Other',
                work_location: workLocation || 'Office'
            });
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    return { ...t, total_hours_spent: (t.total_hours_spent || 0) + hours };
                }
                return t;
            }));
            setQuickLogTask(null);
        } catch (err) {
            console.error("Failed to log time", err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to save quick log: ${msg}`);
        }
    };

    const handleProgressUpdate = async (taskId, newProgress) => {
        try {
            await api.put(`/tasks/${taskId}`, { progress: newProgress });
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
        } catch (err) {
            console.error("Failed to update progress", err);
            alert("Failed to update inline progress.");
            // Revert state smoothly by fetching if necessary, but alert is fine
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Tasks...</div>;

    const TaskCard = ({ task }) => (
        <div className="card" onClick={() => navigate(`/portal/tasks/edit/${task.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `4px solid ${getStatusColor(task.status)}`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>

                <button
                    onClick={(e) => { e.stopPropagation(); setQuickLogTask(task); }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginRight: '2px'
                    }}
                    title="Quick Log Time/Notes"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button
                    onClick={(e) => handleDownloadSinglePDF(e, task.id)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginRight: '2px'
                    }}
                    title="Download PDF Report"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
                <button
                    onClick={(e) => handleCloneTask(e, task.id)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginRight: '2px'
                    }}
                    title="Clone Task"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/portal/tasks/edit/${task.id}`); }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                    title="Edit Task"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                {(!task.notes || task.notes.length === 0) && (
                    <button
                        onClick={(e) => handleDelete(e, task.id)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                        title="Delete Task"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '50px' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>{task.task_type}</span>
                    <span className="status-badge" style={{
                        backgroundColor: getPriorityColor(task.priority) + '20',
                        color: getPriorityColor(task.priority),
                        borderColor: getPriorityColor(task.priority)
                    }}>
                        {task.priority || 'Medium'}
                    </span>
                </div>
            </div>
            <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="status-badge" style={{
                    backgroundColor: getStatusColor(task.status) + '20',
                    color: getStatusColor(task.status),
                    borderColor: getStatusColor(task.status)
                }}>
                    {task.status}
                </span>
                {task.project && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column' }}>
                        <span>
                            <span style={{ color: 'var(--primary)', fontWeight: '600', marginRight: '4px' }}>
                                [{task.project.project_unique_id || `P-${task.project.id}`}]
                            </span> 
                            {task.project.name}
                            {task.milestone ? ` • ✨ ${task.milestone.name || `Milestone ${task.milestone.milestone_number}`}` : ''}
                        </span>
                        {task.project.customer && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                👤 {task.project.customer.name}
                            </span>
                        )}
                    </span>
                )}
            </div>

            <div style={{ fontWeight: '500', fontSize: '1rem', margin: '0.25rem 0' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{task.id}</span>
                {task.description && task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description || 'No Description'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    {task.task_type === 'FIXED' ? <span style={{color: 'white', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>Global (All Staff)</span> : (task.assigned_to ? task.assigned_to.username : 'Unassigned')}
                </div>
                {task.due_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', color: getDueDateColor(task.due_date), fontWeight: '500' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {new Date(task.due_date).toLocaleDateString()}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '0.5rem' }}>
                {/* 1. Manual Progress */}
                <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)', alignItems: 'center' }}>
                        <span>Progress</span>
                        <select 
                            value={task.progress}
                            onChange={(e) => { e.stopPropagation(); handleProgressUpdate(task.id, parseInt(e.target.value)); }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                            {[0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map(val => (
                                <option key={val} value={val}>{val}%</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${task.progress}%`, background: getProgressColor(task.progress), height: '100%' }}></div>
                    </div>
                </div>

                {/* 2. Calculated Time */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px', color: 'var(--text-muted)' }}>
                        <span>Budget</span>
                        <span>{(task.total_hours_spent || 0).toFixed(1)} / {task.estimated_effort || 0} h</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(((task.total_hours_spent || 0) / (task.estimated_effort || 1)) * 100, 100)}%`,
                            background: (task.total_hours_spent > task.estimated_effort && task.estimated_effort > 0) ? '#ef4444' : '#10b981',
                            height: '100%'
                        }}></div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2>Tasks</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                            <button onClick={() => setViewMode('bulk')} style={{ background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent', color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px' }} title="Bulk Edit Mode">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            </button>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            {sortedTasks.length} Records Displayed
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {(isFinancial || isManager) && (
                            <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <option value="all" style={{ color: 'black' }}>{isFinancial ? 'All Employees' : 'My Entire Team & Me'}</option>
                                <option value="me" style={{ color: 'black' }}>Assigned to Me</option>
                                {isFinancial && <option value="unassigned" style={{ color: 'black' }}>Unassigned</option>}
                                {users.filter(u => isFinancial || nestedTeamIds.includes(u.id)).map(u => (
                                    <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.username}</option>
                                ))}
                            </select>
                        )}

                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ background: 'transparent', borderLeft: isFinancial ? '1px solid var(--border)' : 'none', paddingLeft: isFinancial ? '0.5rem' : '0', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <option value="all" style={{ color: 'black' }}>All Types</option>
                            <option value="Engineering" style={{ color: 'black' }}>Engineering</option>
                            <option value="Programming" style={{ color: 'black' }}>Programming</option>
                            <option value="Onsite" style={{ color: 'black' }}>Onsite</option>
                            <option value="Documentation" style={{ color: 'black' }}>Documentation</option>
                            <option value="Support" style={{ color: 'black' }}>Support</option>
                            <option value="Design" style={{ color: 'black' }}>Design</option>
                            <option value="Planning" style={{ color: 'black' }}>Planning</option>
                            <option value="Training" style={{ color: 'black' }}>Training</option>
                            <option value="Learning" style={{ color: 'black' }}>Learning</option>
                            <option value="Ordering" style={{ color: 'black' }}>Ordering</option>
                            <option value="Panel Building" style={{ color: 'black' }}>Panel Building</option>
                            <option value="Shipping" style={{ color: 'black' }}>Shipping</option>
                            <option value="Admin" style={{ color: 'black' }}>Admin</option>
                            <option value="PM" style={{ color: 'black' }}>PM</option>
                            <option value="FAT" style={{ color: 'black' }}>FAT</option>
                            <option value="SAT" style={{ color: 'black' }}>SAT</option>
                            <option value="Testing" style={{ color: 'black' }}>Testing</option>
                            <option value="Other" style={{ color: 'black' }}>Other</option>
                            <option value="FIXED" style={{ color: 'black' }}>FIXED</option>
                        </select>

                        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ background: 'transparent', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', maxWidth: '150px' }}>
                            <option value="all" style={{ color: 'black' }}>All Projects</option>
                            {uniqueProjects.map(p => (
                                <option key={p} value={p} style={{ color: 'black' }}>{p}</option>
                            ))}
                        </select>

                        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ background: 'transparent', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <option value="all" style={{ color: 'black' }}>All Priorities</option>
                            <option value="Low" style={{ color: 'black' }}>Low</option>
                            <option value="Medium" style={{ color: 'black' }}>Medium</option>
                            <option value="High" style={{ color: 'black' }}>High</option>
                            <option value="Critical" style={{ color: 'black' }}>Critical</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due:</span>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }} title="From Date" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>-</span>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem' }} title="To Date" />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none' }}>
                        <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
                        Hide Completed
                    </label>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={handleExportPDF} className="btn-secondary" style={{ padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                        <button onClick={() => window.open('/calendar/onsite.ics?token=office365sync', '_blank')} className="btn-secondary" style={{ padding: '0.5rem', background: 'var(--primary)', color: 'white' }} title="Download Onsite Schedule (Office 365 ICS)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </button>
                    </div>


                    <button onClick={() => navigate('/portal/tasks/new')} className="btn btn-primary">
                        + New Task
                    </button>
                </div>
            </div>

            {viewMode === 'bulk' ? (
                <BulkEditTable 
                    bulkTasks={bulkTasks} 
                    users={users} 
                    handleBulkChange={handleBulkChange}
                    isSavingBulk={isSavingBulk}
                    onSave={handleSaveBulk}
                    onCancel={() => setViewMode('list')}
                />
            ) : viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>Description {sortField === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('project_id')} style={{ cursor: 'pointer' }}>Project {sortField === 'project_id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Time (Act/Est)</th>
                                <th onClick={() => handleSort('task_type')} style={{ cursor: 'pointer' }}>Type {sortField === 'task_type' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>Priority {sortField === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('assigned_to')} style={{ cursor: 'pointer' }}>Assigned To {sortField === 'assigned_to' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('start_date')} style={{ cursor: 'pointer' }}>Start Date {sortField === 'start_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>Progress {sortField === 'progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTasks.map(task => (
                                <tr key={task.id} onClick={() => navigate(`/portal/tasks/edit/${task.id}`)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>
                                            <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{task.id}</span>
                                            {task.description ? (task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description) : '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>
                                            {task.project ? (
                                                <>
                                                    <span style={{ fontWeight: '500' }}>[{task.project.project_unique_id || `P-${task.project.id}`}] {task.project.name}</span>
                                                    {task.project.customer && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>👤 {task.project.customer.name}</span>}
                                                    {task.milestone && <span style={{ color: '#fd7e14', fontSize: '0.75rem' }}>✨ {task.milestone.name || `Milestone ${task.milestone.milestone_number}`}</span>}
                                                </>
                                            ) : '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {(task.total_hours_spent || 0).toFixed(1)} / {task.estimated_effort} hrs
                                        </div>
                                    </td>
                                    <td><span className="badge">{task.task_type}</span></td>
                                    <td>
                                        <span className="status-badge" style={{
                                            backgroundColor: getPriorityColor(task.priority) + '20',
                                            color: getPriorityColor(task.priority),
                                            borderColor: getPriorityColor(task.priority)
                                        }}>
                                            {task.priority || 'Medium'}
                                        </span>
                                    </td>
                                    <td>{task.task_type === 'FIXED' ? 'Global' : (task.assigned_to ? task.assigned_to.username : '-')}</td>
                                    <td style={{ fontWeight: task.start_date ? '500' : 'normal' }}>
                                        {task.start_date ? new Date(task.start_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ color: getDueDateColor(task.due_date), fontWeight: task.due_date ? '500' : 'normal' }}>
                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                                            <select 
                                                value={task.progress}
                                                onChange={(e) => { e.stopPropagation(); handleProgressUpdate(task.id, parseInt(e.target.value)); }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', cursor: 'pointer', width: '100%' }}
                                            >
                                                {[0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map(val => (
                                                    <option key={val} value={val}>{val}%</option>
                                                ))}
                                            </select>
                                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ width: `${task.progress}%`, background: getProgressColor(task.progress), height: '100%' }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{
                                            backgroundColor: getStatusColor(task.status) + '20',
                                            color: getStatusColor(task.status)
                                        }}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button title="Log Time/Notes" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); setQuickLogTask(task); }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </button>
                                            <button title="Download PDF" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => handleDownloadSinglePDF(e, task.id)}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            </button>
                                            <button title="Edit Task" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); navigate(`/portal/tasks/edit/${task.id}`); }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            {(!task.notes || task.notes.length === 0) && (
                                                <button title="Delete Task" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => handleDelete(e, task.id)}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {quickLogTask && (
                <QuickLogModal 
                    task={quickLogTask} 
                    onClose={() => setQuickLogTask(null)} 
                    onSave={handleSaveQuickLog} 
                />
            )}
        </div>
    );
};

const BulkEditTable = ({ bulkTasks, users, handleBulkChange, isSavingBulk, onSave, onCancel }) => {
    const dirtyCount = bulkTasks.filter(t => t.isDirty).length;
    
    return (
        <div className="card" style={{ overflowX: 'auto', paddingBottom: '3rem' }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Bulk Edit Mode: {bulkTasks.length} Tasks</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: dirtyCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {dirtyCount} unsaved changes
                    </span>
                    <button onClick={onCancel} className="btn-secondary" disabled={isSavingBulk}>Cancel</button>
                    <button onClick={onSave} className="btn-primary" disabled={isSavingBulk || dirtyCount === 0}>
                        {isSavingBulk ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
            <table className="data-table" style={{ minWidth: '1200px' }}>
                <thead>
                    <tr>
                        <th style={{ width: '4%' }}>ID</th>
                        <th style={{ width: '20%' }}>Description</th>
                        <th style={{ width: '12%' }}>Type</th>
                        <th style={{ width: '10%' }}>Priority</th>
                        <th style={{ width: '12%' }}>Assigned To</th>
                        <th style={{ width: '10%' }}>Start Date</th>
                        <th style={{ width: '10%' }}>Due Date</th>
                        <th style={{ width: '6%' }}>Est Hrs</th>
                        <th style={{ width: '6%' }}>Util %</th>
                        <th style={{ width: '10%' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {bulkTasks.map(task => (
                        <tr key={task.id} style={{ background: task.isDirty ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>#{task.id}</td>
                            <td>
                                <input 
                                    type="text" 
                                    value={task.description || ''} 
                                    onChange={(e) => handleBulkChange(task.id, 'description', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <select 
                                    value={task.task_type || 'Engineering'} 
                                    onChange={(e) => handleBulkChange(task.id, 'task_type', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    {["Admin", "Design", "Documentation", "Engineering", "FAT", "LAB", "Learning", "Onsite", "Ordering", "Other", "PM", "PTO", "FIXED", "Panel Building", "Planning", "Programming", "SAT", "Shipping", "Support", "Testing", "Training"].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <select 
                                    value={task.priority || 'Medium'} 
                                    onChange={(e) => handleBulkChange(task.id, 'priority', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    {["Low", "Medium", "High", "Critical"].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                {task.task_type === 'FIXED' ? (
                                    <div style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--primary)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>Global</div>
                                ) : (
                                    <select 
                                        value={task.assigned_to_id || ''} 
                                        onChange={(e) => handleBulkChange(task.id, 'assigned_to_id', e.target.value)}
                                        style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                    >
                                        <option value="">{task.task_type === 'FIXED' ? 'Global (All Staff)' : 'Unassigned'}</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                )}
                            </td>
                            <td>
                                <input 
                                    type="date" 
                                    value={task.start_date || ''} 
                                    onChange={(e) => handleBulkChange(task.id, 'start_date', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="date" 
                                    value={task.due_date || ''} 
                                    onChange={(e) => handleBulkChange(task.id, 'due_date', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.5"
                                    value={task.estimated_effort === null ? '' : task.estimated_effort} 
                                    onChange={(e) => handleBulkChange(task.id, 'estimated_effort', e.target.value)}
                                    style={{ width: '100%', padding: '0.2rem', fontSize: '0.85rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={task.estimated_utilization === null ? '' : task.estimated_utilization} 
                                    onChange={(e) => handleBulkChange(task.id, 'estimated_utilization', e.target.value)}
                                    style={{ width: '100%', padding: '0.2rem', fontSize: '0.85rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                />
                            </td>
                            <td>
                                <select 
                                    value={task.status || 'Open'} 
                                    onChange={(e) => handleBulkChange(task.id, 'status', e.target.value)}
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}
                                >
                                    {["Open", "In Progress", "Pending Approval", "Completed"].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                    {bulkTasks.length === 0 && (
                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No tasks found matching current filters.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const QuickLogModal = ({ task, onClose, onSave }) => {
    const [hours, setHours] = useState('');
    const [note, setNote] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [eventType, setEventType] = useState('Other');
    const [workLocation, setWorkLocation] = useState(localStorage.getItem('globalWorkLocation') || 'Office');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(task.id, parseFloat(hours || 0), note, eventDate, startTime, eventType, workLocation);
        setSaving(false);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" onClick={e => e.stopPropagation()} style={{ width: '450px', cursor: 'default', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Quick Log: Task #{task.id}</h3>
                <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{task.description}</p>
                
                <form onSubmit={submit}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Date</label>
                            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Start Time</label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} />
                        </div>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Hours Spent</label>
                        <input type="number" step="0.25" min="0" value={hours} onChange={e => setHours(e.target.value)} required autoFocus style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Event Type</label>
                        <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }}>
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
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Work Location</label>
                        <select value={workLocation} onChange={e => setWorkLocation(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }}>
                            <option value="Office">Office</option>
                            <option value="Home">Home</option>
                            <option value="Field">Field</option>
                            <option value="Travel">Travel</option>
                            <option value="Training">Training</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>Event / Note</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} required rows="3" placeholder="What did you work on?" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '0.5rem 1.5rem' }}>
                            {saving ? 'Saving...' : 'Log Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Open': return '#3b82f6'; // Blue
        case 'In Progress': return '#eab308'; // Yellow
        case 'Pending Approval': return '#f97316'; // Orange
        case 'Completed': return '#22c55e'; // Green
        default: return '#64748b';
    }
};

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'Low': return '#0ea5e9'; // Sky Blue
        case 'Medium': return '#eab308'; // Yellow
        case 'High': return '#f97316'; // Orange
        case 'Critical': return '#ef4444'; // Red
        default: return '#64748b'; // Grey
    }
};

const getProgressColor = (progress) => {
    if (progress >= 100) return '#22c55e';
    if (progress > 50) return '#3b82f6';
    return '#f59e0b';
};

const getDueDateColor = (dueDateStr) => {
    if (!dueDateStr) return 'var(--text-muted)';
    const due = new Date(dueDateStr);
    const today = new Date();
    // Strip time for accurate day comparison
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#ef4444'; // Red (Overdue)
    if (diffDays <= 5) return '#eab308'; // Yellow (Due Soon)
    return '#22c55e'; // Green (More than 5 days)
};

export default TaskList;
