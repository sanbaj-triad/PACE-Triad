# custom python script to write out the fully refactored interactivity logic
import io

jsx_content = """import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../utils/api';
import './GanttBoard.css';
import { useNavigate } from 'react-router-dom';

export default function GanttBoard() {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('month'); // 'week' or 'month'
    const [baseDate, setBaseDate] = useState(new Date());

    const navigate = useNavigate();
    const chartRef = useRef(null);

    // Dynamic Drag context
    const [dragCtx, setDragCtx] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userData = await api.get('/users/');
            setUsers(Array.isArray(userData) ? userData.filter(u => u.is_employee) : []);

            const taskData = await api.get('/tasks/');
            setTasks(Array.isArray(taskData) ? taskData : []);
        } catch (error) {
            console.error('Failed to load Gantt data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Grid Setup
    const generateTimeline = useMemo(() => {
        const days = [];
        const start = new Date(baseDate);
        if (viewMode === 'week') {
            const day = start.getDay() || 7; 
            if(day !== 1) start.setHours(-24 * (day - 1));
            start.setHours(0,0,0,0);
            for(let i=0; i<7; i++) {
                const date = new Date(start);
                date.setDate(date.getDate() + i);
                days.push(date);
            }
        } else {
            start.setDate(1);
            start.setHours(0,0,0,0);
            const numDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
            for(let i=0; i<numDays; i++) {
                const date = new Date(start);
                date.setDate(date.getDate() + i);
                days.push(date);
            }
        }
        return days;
    }, [baseDate, viewMode]);

    const navigateDateOffset = (direction) => {
        const nd = new Date(baseDate);
        if (viewMode === 'week') {
            nd.setDate(nd.getDate() + (direction * 7));
        } else {
            nd.setMonth(nd.getMonth() + direction);
        }
        setBaseDate(nd);
    };

    const timelineStart = generateTimeline[0];
    const timelineEnd = generateTimeline[generateTimeline.length - 1];
    const timelineTotalMs = timelineEnd.getTime() - timelineStart.getTime() + (1000 * 3600 * 24);

    // --- Interaction Hooks ---
    useEffect(() => {
        if (!dragCtx) return;

        const handlePointerMove = (e) => {
            if (!chartRef.current) return;
            const timelineRect = chartRef.current.getBoundingClientRect();
            const msPerPixel = timelineTotalMs / timelineRect.width;

            const deltaX = e.clientX - dragCtx.startX;
            const deltaMs = deltaX * msPerPixel;
            
            // Snap to grid days
            const snapDays = Math.round(deltaMs / (1000 * 3600 * 24));
            const snapMs = snapDays * (1000 * 3600 * 24);

            setDragCtx(prev => {
                const draft = { ...prev, snapMs };

                if (prev.type === 'move') {
                    // Detect user row vertically dynamically based on element from point
                    const rows = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.classList.contains('gantt-row-timeline'));
                    if (rows.length > 0) {
                        const rowUserMatch = rows[0].getAttribute('data-user-id');
                        if (rowUserMatch) draft.currentUserId = parseInt(rowUserMatch);
                    }
                }
                return draft;
            });
        };

        const executeDrop = async (ctx) => {
            const snapMs = ctx.snapMs || 0;
            let newStartMs = ctx.originalStart;
            let newEndMs = ctx.originalEnd;

            if (ctx.type === 'move') {
                newStartMs += snapMs;
                newEndMs += snapMs;
            } else if (ctx.type === 'resize-left') {
                newStartMs += snapMs;
                if (newStartMs > newEndMs) newStartMs = newEndMs;
            } else if (ctx.type === 'resize-right') {
                newEndMs += snapMs;
                if (newEndMs < newStartMs) newEndMs = newStartMs;
            }

            // ISO string coercion
            const newStartD = new Date(newStartMs);
            const newEndD = new Date(newEndMs);
            // fix timezone drift
            newStartD.setMinutes(newStartD.getMinutes() - newStartD.getTimezoneOffset());
            newEndD.setMinutes(newEndD.getMinutes() - newEndD.getTimezoneOffset());

            const newStartCode = newStartD.toISOString().split('T')[0];
            const newEndCode = newEndD.toISOString().split('T')[0];
            
            if (newStartMs === ctx.originalStart && newEndMs === ctx.originalEnd && ctx.currentUserId === ctx.originalUserId) {
                return; // no change
            }

            // --- ALLOCATION VALIDATION ALGORITHM (<= 100%) ---
            const targetUserId = ctx.currentUserId;
            const draftTask = { ...ctx.task, start_date: newStartCode, due_date: newEndCode, assigned_to_id: targetUserId };
            const otherTasks = tasks.filter(t => t.id !== draftTask.id && t.assigned_to_id === targetUserId && t.status !== 'Completed');

            let failedDay = null;
            let failedUtil = 0;

            for (let t = newStartMs; t <= newEndMs; t += (1000 * 3600 * 24)) {
                let dayUtil = draftTask.estimated_utilization || 0;
                
                otherTasks.forEach(ot => {
                    const ots = new Date(ot.start_date).getTime();
                    // offset to end of day to include the bounds
                    const ote = new Date(ot.due_date).getTime() + (1000 * 3600 * 24) - 1;
                    if (t >= ots && t <= ote) {
                        dayUtil += (ot.estimated_utilization || 0);
                    }
                });

                if (dayUtil > 100) {
                    failedDay = new Date(t);
                    failedUtil = dayUtil;
                    break;
                }
            }

            if (failedDay) {
                alert(`Allocation Denied! Utilization would exceed 100% on ${failedDay.toLocaleDateString()} (Total Allocation: ${failedUtil}%). Bouncing back.`);
                return; // Auto-reverts visually since state untouched
            }

            // Validation passed! Optimistic local update
            setTasks(prev => prev.map(t => t.id === draftTask.id ? draftTask : t));

            try {
                // To avoid sending unnecessary read-only fields that crash the backend, build a clean payload from the draftTask.
                const cleanPayload = {
                    title: draftTask.title,
                    description: draftTask.description,
                    task_type: draftTask.task_type,
                    status: draftTask.status,
                    priority: draftTask.priority,
                    start_date: draftTask.start_date,
                    due_date: draftTask.due_date,
                    estimated_effort: draftTask.estimated_effort,
                    estimated_utilization: draftTask.estimated_utilization,
                    progress: draftTask.progress,
                    assigned_to_id: draftTask.assigned_to_id,
                    project_id: draftTask.project_id,
                    milestone_id: draftTask.milestone_id
                };
                await api.put(`/tasks/${draftTask.id}`, cleanPayload);
            } catch(err) {
                console.error("Drop failed", err);
                alert("Failed to save changes gracefully on the server. Reverting.");
                fetchData(); // Safety reload
            }
        };

        const handlePointerUp = async (e) => {
            setDragCtx(prev => {
                // Must evaluate from the latest state inside the updater function
                if(prev) executeDrop(prev);
                return null;
            });
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragCtx, tasks, timelineTotalMs]);


    // Derived visualization
    const usersWithTasks = useMemo(() => {
        let activeTasks = tasks;
        
        // Dynamically apply ghost drag transforms to tasks for live visualization
        if (dragCtx) {
            const snapMs = dragCtx.snapMs || 0;
            activeTasks = tasks.map(t => {
                if(t.id === dragCtx.task.id) {
                    let newStartMs = dragCtx.originalStart;
                    let newEndMs = dragCtx.originalEnd;
                    if (dragCtx.type === 'move') {
                        newStartMs += snapMs;
                        newEndMs += snapMs;
                    } else if (dragCtx.type === 'resize-left') {
                        newStartMs += snapMs;
                        if (newStartMs > newEndMs) newStartMs = newEndMs;
                    } else if (dragCtx.type === 'resize-right') {
                        newEndMs += snapMs;
                        if (newEndMs < newStartMs) newEndMs = newStartMs;
                    }

                    // For visual conversion to standard Date parsing map:
                    const newStartD = new Date(newStartMs);
                    const newEndD = new Date(newEndMs);
                    newStartD.setMinutes(newStartD.getMinutes() - newStartD.getTimezoneOffset());
                    newEndD.setMinutes(newEndD.getMinutes() - newEndD.getTimezoneOffset());

                    return { 
                        ...t, 
                        start_date: newStartD.toISOString().split('T')[0],
                        due_date: newEndD.toISOString().split('T')[0],
                        assigned_to_id: dragCtx.currentUserId 
                    };
                }
                return t;
            });
        }

        return users.map(u => ({
            ...u,
            visibleTasks: activeTasks.filter(t => t.assigned_to_id === u.id && t.start_date && t.due_date && t.status !== 'Completed')
        })).filter(u => u.visibleTasks.length > 0);
    }, [tasks, users, dragCtx]);


    if(loading) return <div className="gantt-loading">Loading Gantt Configuration...</div>;

    const isTaskInView = (task) => {
        const tStart = new Date(task.start_date);
        const tEnd = new Date(task.due_date);
        return tStart <= timelineEnd && tEnd >= timelineStart;
    };

    const calculateTaskStyles = (task) => {
        const start = new Date(task.start_date);
        const end = new Date(task.due_date);
        
        let visualStartMs = Math.max(start.getTime(), timelineStart.getTime());
        let visualEndMs = Math.min(end.getTime(), timelineEnd.getTime());

        const leftOffset = Math.max(0, (visualStartMs - timelineStart.getTime()) / timelineTotalMs);
        const widthPercent = Math.max(0.01, (visualEndMs - visualStartMs + (1000 * 3600 * 24)) / timelineTotalMs);

        return {
            left: `${leftOffset * 100}%`,
            width: `${widthPercent * 100}%`,
        };
    };

    return (
        <div className={`Math-GanttWrapper gantt-wrapper ${dragCtx ? 'is-dragging' : ''}`}>
            <header className="gantt-header">
                <div className="gantt-title">
                    <h2>Resource Mapping</h2>
                    <span className="gantt-badge">Interactive Timeline</span>
                </div>
                <div className="gantt-controls">
                    <button onClick={() => navigateDateOffset(-1)} className="btn btn-secondary">{'<'}</button>
                    <div className="gantt-date-display">
                        {viewMode === 'month' 
                            ? timelineStart.toLocaleString('default', { month: 'long', year: 'numeric' }) 
                            : `Week of ${timelineStart.toLocaleDateString()}`
                        }
                    </div>
                    <button onClick={() => navigateDateOffset(1)} className="btn btn-secondary">{'>'}</button>
                    <div className="gantt-mode-toggle">
                        <button className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('week')}>Week</button>
                        <button className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('month')}>Month</button>
                    </div>
                </div>
            </header>

            <div className="gantt-chart">
                <div className="gantt-grid-header">
                    <div className="gantt-spacer">Employees</div>
                    <div className="gantt-timeline-header">
                        {generateTimeline.map((date, i) => (
                            <div key={i} className={`gantt-day-tick ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`}>
                                <span>{viewMode === 'month' ? date.getDate() : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="gantt-body">
                    {usersWithTasks.map(u => (
                        <div key={u.id} className="gantt-row">
                            <div className="gantt-row-label">
                                <div className="gantt-user-avatar">{u.first_name ? u.first_name[0] : u.username[0]}</div>
                                <div className="gantt-user-info">
                                    <h4>{u.first_name || u.username}</h4>
                                    <span>{u.title || "Employee"}</span>
                                </div>
                            </div>
                            <div className="gantt-row-timeline" data-user-id={u.id} ref={chartRef}>
                                {/* Grid backdrop */}
                                {generateTimeline.map((d, i) => (
                                    <div key={i} className={`gantt-grid-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`} />
                                ))}

                                {/* Task overlays */}
                                {u.visibleTasks.filter(isTaskInView).map(task => {
                                    const styles = calculateTaskStyles(task);
                                    const isDraggingThis = dragCtx && dragCtx.task.id === task.id;
                                    return (
                                        <div 
                                            key={task.id} 
                                            className={`gantt-task-bar ${isDraggingThis ? 'dragging' : ''}`} 
                                            style={styles}
                                            onPointerDown={(e) => handlePointerDown(e, task, 'move', u.id)}
                                        >
                                            <div 
                                                className="gantt-resize-handle left" 
                                                onPointerDown={(e) => handlePointerDown(e, task, 'resize-left', u.id)}
                                            />
                                            
                                            <div className="gantt-task-content" onClick={() => !dragCtx && navigate(`/portal/tasks/edit/${task.id}`)}>
                                                <span className="truncate">{task.description}</span>
                                                <div className="gantt-hover-details">
                                                    <strong>{task.description}</strong>
                                                    <p>Effort: {task.estimated_effort} hrs</p>
                                                    <p>Util: {task.estimated_utilization}%</p>
                                                    <p>Logged: {task.total_hours_spent} hrs</p>
                                                </div>
                                            </div>
                                            
                                            {/* Sub-visualizing events */}
                                            {task.events && task.events.length > 0 && (
                                                <div className="gantt-events-track">
                                                    {task.events.map(ev => {
                                                        const evDate = new Date(ev.event_date);
                                                        if(evDate < timelineStart || evDate > timelineEnd) return null;
                                                        
                                                        const ts = new Date(task.start_date);
                                                        const te = new Date(task.due_date);
                                                        const durMs = te.getTime() - ts.getTime();
                                                        
                                                        if(durMs <= 0) return null;
                                                        const relativeLeft = ((evDate.getTime() - ts.getTime()) / durMs) * 100;
                                                        
                                                        return (
                                                            <div 
                                                                key={ev.id} 
                                                                className="gantt-event-blip"
                                                                style={{ left: `${Math.max(0, Math.min(100, relativeLeft))}%` }}
                                                                title={`Logged ${ev.hours_spent}hrs on ${evDate.toLocaleDateString()}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div 
                                                className="gantt-resize-handle right" 
                                                onPointerDown={(e) => handlePointerDown(e, task, 'resize-right', u.id)}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    
                    {usersWithTasks.length === 0 && (
                        <div className="gantt-empty">No active tasks aligned with this timeframe.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
"""

with io.open('c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/GanttBoard.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx_content)

print("Generated.")
