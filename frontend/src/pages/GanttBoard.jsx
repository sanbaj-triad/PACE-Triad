import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../utils/api';
import './GanttBoard.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';
import useSessionState from '../hooks/useSessionState';
import { getNestedTeamIds } from '../utils/hierarchy';

const getWeekNumber = (d, startDayOfWeek = 1) => {
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let startD = new Date(d.getFullYear(), 0, 1);
    while (startD.getDay() !== startDayOfWeek) {
        startD.setDate(startD.getDate() - 1);
    }
    // Use Math.round to gracefully ignore Daylight Saving Time +/- 1 hour drift
    const diffDays = Math.round((target - startD) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
};
export default function GanttBoard() {
    const [tasks, setTasks] = useState([]);
    const [globalEvents, setGlobalEvents] = useState([]);
    
    // Priority color mapping with solid dim matches for high contrast white text
    const getPriorityColors = (priority) => {
        switch (priority) {
            case 'Critical': return { main: '#ef4444', dim: '#b91c1c' }; // Red
            case 'High': return { main: '#f59e0b', dim: '#b45309' };     // Amber
            case 'Low': return { main: '#9ca3af', dim: '#6b7280' };      // Gray
            case 'Medium':
            default: return { main: '#3b82f6', dim: '#1d4ed8' };         // Blue
        }
    };
    
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useSessionState('gantt_viewMode', 'month'); // 'week' or 'month'
    const [showPopups, setShowPopups] = useSessionState('gantt_showPopups', true);
    const [editMode, setEditMode] = useSessionState('gantt_editMode', false);
    
    // Dynamic tooltip bounds logic
    const [hoverTooltip, setHoverTooltip] = useState({ visible: false, x: 0, y: 0, topPosition: 0, content: null });

    const handleMouseEnterTooltip = (e, contentHtml) => {
        if (!showPopups) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8,
            topPosition: rect.top,
            content: contentHtml
        });
    };

    const handleMouseLeaveTooltip = () => {
        setHoverTooltip(prev => ({ ...prev, visible: false }));
    };
    const [baseDateStr, setBaseDateStr] = useSessionState('gantt_baseDate', new Date().toISOString());
    const baseDate = useMemo(() => new Date(baseDateStr), [baseDateStr]);

    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);
    const isManager = user?.direct_reports?.length > 0;
    const [filterUserId, setFilterUserId] = useSessionState('gantt_filterUserId', 'all');

    const fullUser = users.find(u => u.id === user?.id) || user;
    const targetLoc = locations.find(l => l.id === fullUser?.location_id);
    const locName = fullUser?.location?.name || targetLoc?.name || '';
    const userStartDayOfWeek = locName.toLowerCase().includes('asia') ? 0 : 1;

    useEffect(() => {
        if (!isFinancial && !isManager && user) {
            setFilterUserId(user.id.toString());
        }
    }, [isFinancial, isManager, user]);

    const navigate = useNavigate();
    const chartRef = useRef(null);
    const scrollRefTop = useRef(null);
    const scrollRefBottom = useRef(null);

    const handleScrollTop = (e) => {
        if (scrollRefBottom.current && e.target.scrollLeft !== scrollRefBottom.current.scrollLeft) {
            scrollRefBottom.current.scrollLeft = e.target.scrollLeft;
        }
        sessionStorage.setItem('gantt_scrollLeft', e.target.scrollLeft);
    };

    const handleScrollBottom = (e) => {
        if (scrollRefTop.current && e.target.scrollLeft !== scrollRefTop.current.scrollLeft) {
            scrollRefTop.current.scrollLeft = e.target.scrollLeft;
        }
        sessionStorage.setItem('gantt_scrollLeft', e.target.scrollLeft);
    };

    // Dynamic Drag context
    const [dragCtx, setDragCtx] = useState(null);

    // Auto-Generate Logged Events Context
    const [autoGenDate, setAutoGenDate] = useState('');
    const [autoGenUser, setAutoGenUser] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const [autoGenDrafts, setAutoGenDrafts] = useState(null);

    // Context cloning & editing
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetType: null, targetData: null });
    const [hoursEditModal, setHoursEditModal] = useState({ visible: false, event: null, newHours: '' });
    const [utilizationEditModal, setUtilizationEditModal] = useState({ visible: false, task: null, newUtil: '' });

    const handleContextMenuClick = (e, type, data) => {
        if (editMode && type === 'task') return; // in edit mode tasks are exclusively for dragging
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            targetType: type,
            targetData: data
        });
    };

    const closeContextMenu = () => {
        if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
    };

    const executeCloneTask = async () => {
        const task = contextMenu.targetData;
        if (!task) return;
        try {
            const payload = {
                description: task.description,
                task_type: task.task_type,
                status: task.status,
                priority: task.priority,
                start_date: task.start_date,
                due_date: task.due_date,
                estimated_effort: task.estimated_effort,
                estimated_utilization: task.estimated_utilization,
                progress: task.progress,
                assigned_to_id: task.assigned_to_id,
                project_id: task.project_id,
                milestone_id: task.milestone_id
            };
            await api.post('/tasks/', payload);
            closeContextMenu();
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to clone task");
        }
    };

    const executeCloneEvent = async () => {
        const event = contextMenu.targetData;
        if (!event) return;
        try {
            const isVirtual = typeof event.task_id === 'string' && event.task_id.startsWith('m-');
            
            const payload = {
                content: event.content || '',
                event_date: event.event_date,
                start_time: event.start_time || null,
                end_time: event.end_time || null,
                hours_spent: parseFloat(event.hours_spent) || 0,
                user_id: event.user_id,
                event_type: event.event_type || 'Other',
                work_location: event.work_location || 'Office',
                task_id: isVirtual ? null : event.task_id,
                milestone_id: event.milestone_id || null
            };

            if (isVirtual || (!event.task_id && event.milestone_id)) {
                payload.task_id = null;
                await api.post('/events', payload);
            } else {
                await api.post(`/tasks/${event.task_id}/events`, payload);
            }
            closeContextMenu();
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to clone event");
        }
    };

    const executeEditHours = async () => {
        if (!hoursEditModal.event || !hoursEditModal.newHours) return;
        try {
            const ev = hoursEditModal.event;
            const payload = {
                content: ev.content || '',
                event_date: ev.event_date,
                start_time: ev.start_time || null,
                end_time: ev.end_time || null,
                hours_spent: parseFloat(hoursEditModal.newHours) || ev.hours_spent,
                event_type: ev.event_type || 'Other',
                work_location: ev.work_location || 'Office'
            };
            await api.put(`/task-events/${ev.id}`, payload);
            setHoursEditModal({ visible: false, event: null, newHours: '' });
            fetchData();
        } catch(err) {
            console.error(err);
            alert("Failed to update hours");
        }
    };

    const executeEditUtilization = async () => {
        if (!utilizationEditModal.task || !utilizationEditModal.newUtil) return;
        try {
            const task = utilizationEditModal.task;
            const payload = {
                description: task.description,
                task_type: task.task_type,
                status: task.status,
                priority: task.priority,
                start_date: task.start_date,
                due_date: task.due_date,
                estimated_effort: task.estimated_effort,
                estimated_utilization: parseFloat(utilizationEditModal.newUtil) || 0,
                progress: task.progress,
                assigned_to_id: task.assigned_to_id,
                project_id: task.project_id,
                milestone_id: task.milestone_id
            };
            await api.put(`/tasks/${task.id}`, payload);
            setUtilizationEditModal({ visible: false, task: null, newUtil: '' });
            fetchData();
        } catch(err) {
            console.error(err);
            alert("Failed to update utilization");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const locData = await api.get('/locations/');
            setLocations(Array.isArray(locData) ? locData : []);

            const userData = await api.get('/users/');
            setUsers(Array.isArray(userData) ? userData.filter(u => u.is_employee) : []);

            const taskData = await api.get('/tasks/?limit=5000');
            setTasks(Array.isArray(taskData) ? taskData : []);

            const eventsData = await api.get('/task-events/');
            setGlobalEvents(Array.isArray(eventsData) ? eventsData : []);
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
            // Strip the exact local date components to avoid ALL hour/timezone jumping
            let startD = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            
            // Exactly identical to Timesheet.jsx proven while loop
            while (startD.getDay() !== userStartDayOfWeek) {
                startD.setDate(startD.getDate() - 1);
            }
            
            for(let i=0; i<7; i++) {
                const date = new Date(startD);
                date.setDate(date.getDate() + i);
                days.push(date);
            }
        } else {
            start.setDate(1);
            start.setHours(0,0,0,0);
            const numDaysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
            
            const startWithBuffer = new Date(start);
            startWithBuffer.setDate(startWithBuffer.getDate() - 15);

            for(let i=0; i < (numDaysInMonth + 30); i++) {
                const date = new Date(startWithBuffer);
                date.setDate(date.getDate() + i);
                days.push(date);
            }
        }
        return days;
    }, [baseDate, viewMode, userStartDayOfWeek]);

    const generateTimelineStrs = useMemo(() => {
        const pad = n => n.toString().padStart(2,'0');
        return generateTimeline.map(d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
    }, [generateTimeline]);

    const navigateDateOffset = (direction) => {
        sessionStorage.removeItem('gantt_scrollLeft');
        const nd = new Date(baseDate);
        if (viewMode === 'week') {
            nd.setDate(nd.getDate() + (direction * 7));
        } else {
            nd.setDate(1);
            nd.setMonth(nd.getMonth() + direction);
        }
        setBaseDateStr(nd.toISOString());
    };

    useEffect(() => {
        if (!loading && scrollRefTop.current) {
            const timer = setTimeout(() => {
                const savedScroll = sessionStorage.getItem('gantt_scrollLeft');
                if (savedScroll !== null) {
                    if (scrollRefTop.current) scrollRefTop.current.scrollLeft = parseFloat(savedScroll);
                    if (scrollRefBottom.current) scrollRefBottom.current.scrollLeft = parseFloat(savedScroll);
                } else if (viewMode === 'month') {
                    const targetEl = scrollRefTop.current.querySelector('[data-is-month-start="true"]');
                    const timelineEl = scrollRefTop.current.querySelector('.gantt-timeline-header');
                    if (targetEl && timelineEl) {
                        const scrollAmount = targetEl.getBoundingClientRect().left - timelineEl.getBoundingClientRect().left;
                        if (scrollRefTop.current) scrollRefTop.current.scrollLeft = Math.max(0, scrollAmount - 50);
                        if (scrollRefBottom.current) scrollRefBottom.current.scrollLeft = Math.max(0, scrollAmount - 50);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [generateTimeline, viewMode, loading]);

    useEffect(() => {
        if (generateTimeline && generateTimeline.length > 0) {
            const pad = n => n.toString().padStart(2,'0');
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            
            // Try to default to today if in range, bounds check
            const inRange = generateTimeline.some(d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === todayStr);
            if (inRange && !autoGenDate) {
                setAutoGenDate(todayStr);
            } else if (!autoGenDate || !generateTimeline.some(d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === autoGenDate)) {
                const first = generateTimeline[0];
                setAutoGenDate(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(first.getDate())}`);
            }
        }
    }, [generateTimeline, autoGenDate]);

    const handleAutoGenerateHours = async () => {
        if (!autoGenDate) return;
        setIsGenerating(true);
        try {
            const targetMs = new Date(`${autoGenDate}T12:00:00`).getTime();
            const tasksToLog = [];
            
            // Accumulate across currently visible users and tasks
            usersWithTasks.forEach(u => {
                if (autoGenUser !== 'all' && u.id !== Number(autoGenUser)) return; // Filter strictly to Target User
                
                u.visibleTasks.forEach(task => {
                    const status = task.status || '';
                    if (status === 'Completed') return; // Skip completed tasks

                    const startMs = new Date(task.start_date).getTime();
                    // End of day
                    const endMs = new Date(task.due_date).getTime() + (24 * 3600 * 1000) - 1; 

                    if (targetMs >= startMs && targetMs <= endMs) {
                        const util = task.estimated_utilization || 0;
                        if (util <= 0) return; // Skip 0% tasks completely

                        // Deduplication: Has the user already auto-generated or manually placed an event today on this task?
                        const hasEvent = task.events && task.events.some(e => e.event_date && e.event_date.startsWith(autoGenDate));
                        if (!hasEvent) {
                            let calculatedHours = 8 * (util / 100);
                            
                            tasksToLog.push({
                                task_id: task.id,
                                task_description: task.description,
                                assignee_name: u.first_name || u.username,
                                assignee_initial: (u.first_name ? u.first_name[0] : u.username[0]).toUpperCase(),
                                hours: calculatedHours.toFixed(1),
                                content: '', // Empty note by default as requested
                                user_id: u.id
                            });
                        }
                    }
                });
            });

            if (tasksToLog.length === 0) {
                alert("No scheduled tasks found for this date without prior logged time!");
                setIsGenerating(false);
                return;
            }

            // Open the Review Modal instead of blind posting
            setAutoGenDrafts(tasksToLog);
        } catch (err) {
            console.error(err);
            alert("Error drafting hours");
        }
        setIsGenerating(false);
    };

    const submitAutoGeneratedHours = async () => {
        if (!autoGenDrafts || autoGenDrafts.length === 0) return;
        setIsGenerating(true);
        try {
            const promises = autoGenDrafts.map(t => api.post(`/tasks/${t.task_id}/events`, {
                event_date: autoGenDate,
                hours_spent: parseFloat(t.hours),
                content: t.content,
                user_id: t.user_id
            }));
            await Promise.all(promises);
            setAutoGenDrafts(null);
            fetchData();
        } catch(err) {
            console.error(err);
            alert("Error committing hours to database.");
        }
        setIsGenerating(false);
    };

    const handlePointerDown = (e, task, type, userId) => {
        if (!editMode) return;
        e.stopPropagation();
        e.preventDefault();
        
        const isEvent = type === 'move-event';
        
        // Disallow moving the entire task or resizing the start date if work has already been logged.
        if (!isEvent && (type === 'move' || type === 'resize-left')) {
            if (task.events && task.events.length > 0) {
                alert("Tasks with logged time entries cannot be moved or have their start dates altered. You may only extend the due date.");
                return;
            }
        }
        
        let start, end;
        if (isEvent) {
            const tempEv = task.event_date.split('T')[0].split('-');
            start = new Date(tempEv[0], tempEv[1] - 1, tempEv[2]);
            end = new Date(tempEv[0], tempEv[1] - 1, tempEv[2]);
        } else {
            const tempSt = task.start_date.split('T')[0].split('-');
            const tempEnd = task.due_date.split('T')[0].split('-');
            start = new Date(tempSt[0], tempSt[1] - 1, tempSt[2]);
            end = new Date(tempEnd[0], tempEnd[1] - 1, tempEnd[2]);
        }
        
        let visualStartMs = Math.max(start.getTime(), timelineStart.getTime());
        let visualEndMs = Math.min(end.getTime(), timelineEnd.getTime());

        setDragCtx({
            task: { ...task },
            originalStart: start.getTime(),
            originalEnd: end.getTime(),
            visualStartMs,
            visualEndMs,
            startX: e.clientX,
            originalUserId: userId,
            currentUserId: userId,
            type // 'move', 'resize-left', 'resize-right', 'move-event'
        });
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

            if (ctx.type === 'move' || ctx.type === 'move-event') {
                newStartMs += snapMs;
                newEndMs += snapMs;
            } else if (ctx.type === 'resize-left') {
                newStartMs = ctx.visualStartMs + snapMs;
                if (newStartMs > ctx.originalEnd) newStartMs = ctx.originalEnd;
            } else if (ctx.type === 'resize-right') {
                newEndMs = ctx.visualEndMs + snapMs;
                if (newEndMs < ctx.originalStart) newEndMs = ctx.originalStart;
            }

            const newStartD = new Date(newStartMs);
            const newEndD = new Date(newEndMs);
            const pad = n => n.toString().padStart(2, '0');
            const newStartCode = `${newStartD.getFullYear()}-${pad(newStartD.getMonth()+1)}-${pad(newStartD.getDate())}`;
            const newEndCode = `${newEndD.getFullYear()}-${pad(newEndD.getMonth()+1)}-${pad(newEndD.getDate())}`;
            
            if (newStartMs === ctx.originalStart && newEndMs === ctx.originalEnd && ctx.currentUserId === ctx.originalUserId) {
                return; // no change
            }

            const targetUserId = ctx.currentUserId;

            if (ctx.type === 'move-event') {
                // Future Date Validation
                const todayRaw = new Date();
                const pad2 = n => n.toString().padStart(2, '0');
                const todayCode = `${todayRaw.getFullYear()}-${pad2(todayRaw.getMonth()+1)}-${pad2(todayRaw.getDate())}`;
                
                if (newStartCode > todayCode) {
                    alert('Action Denied! Time entries cannot be logged or dragged into future dates.');
                    return; // Short circuit prevents the PUT call, causing the drag UI to snap back natively
                }

                const draftEvent = { ...ctx.task, event_date: newStartCode, user_id: targetUserId };
                try {
                    const cleanPayload = {
                        content: draftEvent.content || '',
                        event_date: draftEvent.event_date,
                        start_time: draftEvent.start_time || null,
                        hours_spent: parseFloat(draftEvent.hours_spent) || 0,
                        user_id: draftEvent.user_id,
                        event_type: draftEvent.event_type || 'Other',
                        work_location: draftEvent.work_location || 'Office'
                    };
                    await api.put(`/task-events/${draftEvent.id}`, cleanPayload);
                    fetchData();
                } catch(err) {
                    console.error("Event Drop failed", err);
                    alert("Failed to save event changes gracefully on the server. Reverting.");
                    fetchData();
                }
                return; // early return so it doesn't run the TASK saving logic below!
            }

            // --- MILESTONE BOUNDARY VALIDATION ---
            if (ctx.task.milestone && ctx.task.milestone.due_date) {
                const mDate = new Date(ctx.task.milestone.due_date);
                // mDate.setMinutes(mDate.getMinutes() - mDate.getTimezoneOffset()); // Some environments pass clean ISO. Let's just use substring.
                const mDateCode = ctx.task.milestone.due_date.substring(0, 10);
                
                if (newEndCode > mDateCode) {
                    alert(`Action Denied! Task due date cannot be moved past its linked Milestone due date (${mDateCode}). Bouncing back.`);
                    return;
                }
            }

            // --- ALLOCATION VALIDATION REMOVED ---
            // Replaced by soft warnings on the main page view
            const draftTask = { ...ctx.task, start_date: newStartCode, due_date: newEndCode, assigned_to_id: targetUserId };

            // Validation passed! Optimistic local update
            setTasks(prev => prev.map(t => t.id === draftTask.id ? draftTask : t));

            try {
                // To avoid sending unnecessary read-only fields that crash the backend, build a clean payload from the draftTask.
                const cleanPayload = {
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
                        newStartMs = dragCtx.originalStart + snapMs;
                        newEndMs = dragCtx.originalEnd + snapMs;
                    } else if (dragCtx.type === 'resize-left') {
                        newStartMs = dragCtx.visualStartMs + snapMs;
                        if (newStartMs > dragCtx.originalEnd) newStartMs = dragCtx.originalEnd;
                    } else if (dragCtx.type === 'resize-right') {
                        newEndMs = dragCtx.visualEndMs + snapMs;
                        if (newEndMs < dragCtx.originalStart) newEndMs = dragCtx.originalStart;
                    }

                    // For visual conversion to standard Date parsing map:
                    const newStartD = new Date(newStartMs);
                    const newEndD = new Date(newEndMs);
                    const pad = n => n.toString().padStart(2, '0');

                    return { 
                        ...t, 
                        start_date: `${newStartD.getFullYear()}-${pad(newStartD.getMonth()+1)}-${pad(newStartD.getDate())}`,
                        due_date: `${newEndD.getFullYear()}-${pad(newEndD.getMonth()+1)}-${pad(newEndD.getDate())}`,
                        assigned_to_id: dragCtx.currentUserId 
                    };
                }
                return t;
            });
        }

        // Sort activeTasks so the lane algo works predictably left-to-right
        const sortedActive = [...activeTasks].sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

        const nestedTeamIds = getNestedTeamIds(users, user?.id);

        let targetUsers = users;
        if (filterUserId !== 'all') {
            targetUsers = users.filter(u => u.id === parseInt(filterUserId));
        } else if (!isFinancial && isManager) {
            targetUsers = users.filter(u => u.id === user?.id || nestedTeamIds.includes(u.id));
        } else if (!isFinancial && !isManager) {
            targetUsers = users.filter(u => u.id === user?.id);
        }

        return targetUsers.map(u => {
            const grouped = sortedActive.filter(t => t.assigned_to_id === u.id && t.start_date && t.due_date && t.status !== 'Completed' && t.task_type !== 'FIXED');
            const lanes = [];
            grouped.forEach(t => {
                const ts = new Date(t.start_date).getTime();
                const te = new Date(t.due_date).getTime();
                let placed = false;
                for(let i=0; i<lanes.length; i++) {
                    if (ts > lanes[i]) {
                        t.lane = i;
                        lanes[i] = te;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    t.lane = lanes.length;
                    lanes.push(te);
                }
            });

            return {
                ...u,
                visibleTasks: grouped,
                maxLanes: lanes.length === 0 ? 1 : lanes.length
            };
        }); // REMOVED filter(u => u.visibleTasks.length > 0);
    }, [tasks, users, dragCtx, filterUserId]);


    // Identify over-utilized users inside the current timeline to show warnings
    const overutilizedAlerts = useMemo(() => {
        let alerts = [];
        if (!timelineStart || !timelineEnd || tasks.length === 0) return alerts;

        const activeTasks = tasks.filter(t => t.start_date && t.due_date && t.status !== 'Completed' && t.assigned_to_id);
        const daysMs = generateTimeline.map(d => d.getTime());

        const nestedTeamIds = getNestedTeamIds(users, user?.id);

        let targetUsers = users;
        if (filterUserId !== 'all') {
            targetUsers = users.filter(u => u.id === parseInt(filterUserId));
        } else if (!isFinancial && isManager) {
            targetUsers = users.filter(u => u.id === user?.id || nestedTeamIds.includes(u.id));
        } else if (!isFinancial && !isManager) {
            targetUsers = users.filter(u => u.id === user?.id);
        }

        targetUsers.forEach(u => {
            const userTasks = activeTasks.filter(t => t.assigned_to_id === u.id);
            if (userTasks.length === 0) return;

            let warningDays = [];

            daysMs.forEach(dayMs => {
                let dayUtil = 0;
                userTasks.forEach(task => {
                    const tStart = new Date(task.start_date).getTime();
                    // Local start of day to end of day
                    const tEnd = new Date(task.due_date).getTime() + (1000 * 3600 * 24) - 1;
                    if (dayMs >= tStart && dayMs <= tEnd) {
                        dayUtil += (task.estimated_utilization || 0);
                    }
                });
                
                if (dayUtil > 100) {
                    warningDays.push({ date: new Date(dayMs), util: dayUtil });
                }
            });

            if (warningDays.length > 0) {
                let groupedStr = warningDays.length > 3 
                    ? `${warningDays.length} days (peak ${Math.max(...warningDays.map(d=>d.util))}%)` 
                    : warningDays.map(d => d.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})).join(', ');
                
                alerts.push(`${u.first_name || u.username} is over-utilized at ${Math.max(...warningDays.map(d=>d.util))}% on ${groupedStr}.`);
            }
        });

        return alerts;
    }, [tasks, filterUserId, generateTimeline, timelineStart, timelineEnd]);

    
    const usersWithEvents = useMemo(() => {
        const nestedTeamIds = getNestedTeamIds(users, user?.id);
        
        let targetUsers = users;
        if (filterUserId !== 'all') {
            targetUsers = users.filter(u => u.id === parseInt(filterUserId));
        } else if (!isFinancial && isManager) {
            targetUsers = users.filter(u => u.id === user?.id || nestedTeamIds.includes(u.id));
        } else if (!isFinancial && !isManager) {
            targetUsers = users.filter(u => u.id === user?.id);
        }

        const allEvents = [];
        tasks.forEach(t => {
            if (t.events && t.events.length > 0) {
                t.events.forEach(ev => {
                    allEvents.push({
                        ...ev,
                        task_description: t.description,
                        task_id: t.id,
                        fallback_user_id: t.assigned_to_id
                    });
                });
            }
        });
        
        // Merge in explicitly fetched standalone events for Virtual Tasks
        globalEvents.forEach(ev => {
            if (!allEvents.some(e => e.id === ev.id)) {
                allEvents.push({
                    ...ev,
                    task_description: ev.task_title || (ev.project_name ? `[Virtual] ${ev.project_name}` : "Virtual Bucket Log"),
                    task_id: ev.task_id || `m-${ev.milestone_id}`,
                    fallback_user_id: ev.user_id
                });
            }
        });

        allEvents.sort((a,b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

        return targetUsers.map(u => {
            const userEvents = allEvents.filter(ev => ev.user_id === u.id || (!ev.user_id && ev.fallback_user_id === u.id));
            
            const lanes = [];
            userEvents.forEach(ev => {
                const parts = ev.event_date.split('T')[0].split('-');
                const evDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const evMs = evDate.getTime();
                
                let placed = false;
                for(let i=0; i<lanes.length; i++) {
                    if (evMs > lanes[i]) {
                        ev.lane = i;
                        lanes[i] = evMs; 
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    ev.lane = lanes.length;
                    lanes.push(evMs);
                }
            });

            return {
                ...u,
                visibleEvents: userEvents,
                maxLanes: Math.max(1, lanes.length)
            };
        }).filter(u => u.visibleEvents.length > 0);
    }, [tasks, users, filterUserId, globalEvents]);
    
    const isEventInView = (ev) => {
        const ep = ev.event_date.split('T')[0].split('-');
        const evDate = new Date(ep[0], ep[1] - 1, ep[2]);
        return evDate <= timelineEnd && evDate >= timelineStart;
    };
    
    const calculateEventStyles = (ev) => {
        const dateStr = ev.event_date.split('T')[0];
        let startIdx = generateTimelineStrs.findIndex(s => s >= dateStr);
        // If it starts before the timeline
        if (startIdx === -1 || generateTimelineStrs[generateTimelineStrs.length-1] < dateStr) {
            startIdx = 0; // clipped
        }
        // Exact match
        if(generateTimelineStrs.includes(dateStr)) {
            startIdx = generateTimelineStrs.indexOf(dateStr);
        }
        
        const leftOffset = startIdx / generateTimeline.length;
        const widthPercent = 1 / generateTimeline.length;

        return {
            left: `${leftOffset * 100}%`,
            width: `${widthPercent * 100}%`,
            top: `${(ev.lane || 0) * 36 + 5}px`
        };
    };

    if(loading) return <div className="gantt-loading">Loading Gantt Configuration...</div>;

    const isTaskInView = (task) => {
        const sp = task.start_date.split('T')[0].split('-');
        const ep = task.due_date.split('T')[0].split('-');
        const tStart = new Date(sp[0], sp[1] - 1, sp[2]);
        const tEnd = new Date(ep[0], ep[1] - 1, ep[2]);
        return tStart <= timelineEnd && tEnd >= timelineStart;
    };

    const calculateTaskStyles = (task) => {
        const tsStr = task.start_date.split('T')[0];
        const teStr = task.due_date.split('T')[0];

        // Find boundary indices logically via string matching to prevent fractional day drops
        let startIdx = generateTimelineStrs.findIndex(s => s >= tsStr);
        if (startIdx === -1) startIdx = 0;
        
        let endIdx = -1;
        for(let i = generateTimelineStrs.length - 1; i >= 0; i--) {
            if (generateTimelineStrs[i] <= teStr) {
                endIdx = i;
                break;
            }
        }
        if (endIdx === -1) endIdx = generateTimelineStrs.length - 1;
        
        const leftOffset = startIdx / generateTimeline.length;
        const widthPercent = Math.max(0.01, (endIdx - startIdx + 1) / generateTimeline.length);

        return {
            left: `${leftOffset * 100}%`,
            width: `${widthPercent * 100}%`,
            top: `${(task.lane || 0) * 36 + 5}px`
        };
    };

    return (
        <div className={`Math-GanttWrapper gantt-wrapper ${dragCtx ? 'is-dragging' : ''}`} onClick={closeContextMenu}>
            {contextMenu.visible && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        top: contextMenu.y, 
                        left: contextMenu.x, 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '6px', 
                        padding: '0.5rem', 
                        zIndex: 9999,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.targetType === 'task' && (
                        <>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>Task Options</div>
                            <button className="btn-secondary" style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }} onClick={() => { closeContextMenu(); navigate(`/portal/tasks/edit/${contextMenu.targetData.id}`); }}>
                                ✏️ Edit Task Details
                            </button>
                            <button className="btn-secondary" style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }} onClick={executeCloneTask}>
                                📄 Clone Task
                            </button>
                            <button className="btn-secondary" style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }} onClick={() => {
                                setUtilizationEditModal({ visible: true, task: contextMenu.targetData, newUtil: (contextMenu.targetData.estimated_utilization || 0).toString() });
                                closeContextMenu();
                            }}>
                                📊 Edit Utilization
                            </button>
                        </>
                    )}
                    {contextMenu.targetType === 'event' && (
                        <>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>Time Entry: {contextMenu.targetData.status || 'Draft'}</div>
                            {['Submitted', 'Approved', 'Locked'].includes(contextMenu.targetData.status) && !isFinancial ? (
                                <div style={{ fontSize: '0.8rem', color: '#ef4444', padding: '0.25rem' }}>View Only (Locked)</div>
                            ) : (
                                <>
                                    <button className="btn-secondary" style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }} onClick={executeCloneEvent}>
                                        📄 Clone Event
                                    </button>
                                    <button className="btn-secondary" style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }} onClick={() => {
                                        setHoursEditModal({ visible: true, event: contextMenu.targetData, newHours: contextMenu.targetData.hours_spent.toString() });
                                        closeContextMenu();
                                    }}>
                                        ⏱ Edit Hours
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {hoursEditModal.visible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', width: '300px' }}>
                        <h3 style={{ marginTop: 0 }}>Edit Logged Hours</h3>
                        <div className="form-group" style={{ margin: '1rem 0' }}>
                            <label>Hours Spent</label>
                            <input 
                                type="number" 
                                min="0.25" step="0.25"
                                value={hoursEditModal.newHours} 
                                onChange={e => setHoursEditModal({ ...hoursEditModal, newHours: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn-secondary" onClick={() => setHoursEditModal({ visible: false, event: null, newHours: '' })}>Cancel</button>
                            <button className="btn-primary" onClick={executeEditHours}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {utilizationEditModal.visible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', width: '300px' }}>
                        <h3 style={{ marginTop: 0 }}>Edit Daily Utilization %</h3>
                        <div className="form-group" style={{ margin: '1rem 0' }}>
                            <label>Utilization % (e.g., 50 for half-day)</label>
                            <input 
                                type="number" 
                                min="0" max="100" step="5"
                                value={utilizationEditModal.newUtil} 
                                onChange={e => setUtilizationEditModal({ ...utilizationEditModal, newUtil: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn-secondary" onClick={() => setUtilizationEditModal({ visible: false, task: null, newUtil: '' })}>Cancel</button>
                            <button className="btn-primary" onClick={executeEditUtilization}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="gantt-header">
                <div className="gantt-title">
                    <h2>Resource Mapping</h2>
                    <span className="gantt-badge">Interactive Timeline</span>
                </div>
                <div className="gantt-controls">
                    <button onClick={() => navigateDateOffset(-1)} className="btn btn-secondary">{'<'}</button>
                    <div className="gantt-date-display">
                        {viewMode === 'month' 
                            ? baseDate.toLocaleString('default', { month: 'long', year: 'numeric' }) 
                            : `Week of ${timelineStart.toLocaleDateString()}`
                        }
                    </div>
                    <button onClick={() => navigateDateOffset(1)} className="btn btn-secondary">{'>'}</button>
                    {(isFinancial || isManager) && (
                        <select 
                            value={filterUserId} 
                            onChange={(e) => setFilterUserId(e.target.value)}
                            style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.4rem 0.5rem', borderRadius: '6px', marginRight: '0.5rem', cursor: 'pointer' }}
                        >
                            <option value="all">{isFinancial ? 'All Employees' : 'My Entire Team & Me'}</option>
                            <option value={user?.id.toString()}>Assigned to Me</option>
                            {users.filter(u => isFinancial || getNestedTeamIds(users, user?.id).includes(u.id)).map(u => (
                                <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                            ))}
                        </select>
                    )}
                    <div className="gantt-mode-toggle" style={{ marginRight: '0.5rem' }}>
                        <button className={`btn ${showPopups ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowPopups(!showPopups)}>
                            {showPopups ? 'Popups: ON' : 'Popups: OFF'}
                        </button>
                    </div>
                    <div className="gantt-mode-toggle" style={{ marginRight: '0.5rem' }}>
                        <button className={`btn ${editMode ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setEditMode(!editMode)}>
                            {editMode ? 'Edit Mode: ON' : 'Edit Mode: OFF'}
                        </button>
                    </div>
                    <div className="gantt-mode-toggle">
                        <button className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('week')}>Week</button>
                        <button className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('month')}>Month</button>
                    </div>
                </div>
            </header>

            {overutilizedAlerts.length > 0 && (
                <div className="gantt-utilization-warning" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.75rem', margin: '1rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <strong>⚠️ Over-Utilization Detected:</strong>
                    <ul style={{ margin: '0.25rem 0 0 1.5rem', padding: 0 }}>
                        {overutilizedAlerts.map((alert, idx) => (
                            <li key={idx}>{alert}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="gantt-split-layout" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-panel)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                {/* LEFT PANE */}
                <div className="gantt-pane-left" style={{ width: '250px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', zIndex: 10 }}>
                    <div style={{ height: '53px', display: 'flex', alignItems: 'center', padding: '0 1rem', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--text-muted)' }}>
                        Employees
                    </div>
                    <div>
                        {usersWithTasks.map(u => (
                            <div key={u.id} className="gantt-row" style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', minHeight: `${Math.max(90, u.maxLanes * 36 + 50)}px` }}>
                                <div className="gantt-user-avatar">{u.first_name ? u.first_name[0] : u.username[0]}</div>
                                <div className="gantt-user-info" style={{ marginLeft: '1rem' }}>
                                    <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', color: 'var(--text-main)' }}>{u.first_name || u.username}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.title || "Employee"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT PANE */}
                <div className="gantt-chart" ref={scrollRefTop} onScroll={handleScrollTop} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: 'var(--bg-panel)' }}>
                    <div className="gantt-grid-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                        <div className="gantt-timeline-header" style={{ minWidth: `${generateTimeline.length * 65}px` }}>
                            {generateTimeline.map((date, i) => (
                                <div key={i} data-is-month-start={date.getDate() === 1 && date.getMonth() === new Date(baseDate).getMonth() ? "true" : "false"} className={`gantt-day-tick ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', padding: '4px 0' }}>
                                    <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>[Wk {getWeekNumber(date, userStartDayOfWeek)}]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{date.getDate()}</span>
                                    <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="gantt-body">
                        {usersWithTasks.map(u => (
                            <div key={u.id} className="gantt-row" style={{ minHeight: `${Math.max(90, u.maxLanes * 36 + 50)}px` }}>
                                <div className="gantt-row-timeline" data-user-id={u.id} ref={chartRef} style={{ minWidth: `${generateTimeline.length * 65}px` }}>
                                    {/* Grid backdrop */}
                                    {generateTimeline.map((d, i) => (
                                        <div key={i} className={`gantt-grid-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`} />
                                    ))}

                                    {/* Task overlays */}
                                    {u.visibleTasks.filter(isTaskInView).map(task => {
                                        const styles = calculateTaskStyles(task);
                                        const isDraggingThis = dragCtx && dragCtx.task.id === task.id;
                                        
                                        const prio = getPriorityColors(task.priority);
                                        const progress = task.progress || 0;

                                        return (
                                            <div 
                                                key={task.id} 
                                                className={`gantt-task-bar ${isDraggingThis ? 'dragging' : ''} ${!editMode ? 'read-only' : ''}`} 
                                                style={{ 
                                                    ...styles, 
                                                    cursor: editMode ? 'grab' : 'default',
                                                    background: `linear-gradient(90deg, ${prio.main} ${progress}%, ${prio.dim} ${progress}%)`,
                                                    borderColor: prio.main
                                                }}
                                                onPointerDown={(e) => handlePointerDown(e, task, 'move', u.id)}
                                                onMouseEnter={(e) => handleMouseEnterTooltip(e, (
                                                    <>
                                                        <strong>{task.description}</strong>
                                                        <div style={{ margin: '4px 0', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                                            <p><strong>Priority:</strong> {task.priority || 'Medium'}</p>
                                                            <p><strong>Progress:</strong> {progress}% Complete</p>
                                                        </div>
                                                        {(task.project || task.milestone) && (
                                                            <div style={{ margin: '4px 0', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                                                {task.project && <p><strong>Project:</strong> {task.project.name}</p>}
                                                                {task.milestone && (
                                                                    <>
                                                                        <p><strong>Milestone:</strong> {task.milestone.name}</p>
                                                                        <p><strong>M. Deadline:</strong> {task.milestone.due_date ? task.milestone.due_date.substring(0, 10) : 'None'}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p>Effort: {task.estimated_effort} hrs</p>
                                                        <p>Util: {task.estimated_utilization}%</p>
                                                        <p>Logged: {task.total_hours_spent} hrs</p>
                                                    </>
                                                ))}
                                                onMouseLeave={handleMouseLeaveTooltip}
                                            >
                                                {editMode && (
                                                    <div 
                                                        className="gantt-resize-handle left" 
                                                        onPointerDown={(e) => handlePointerDown(e, task, 'resize-left', u.id)}
                                                    />
                                                )}
                                                
                                                <div className="gantt-task-content" 
                                                     onContextMenu={(e) => handleContextMenuClick(e, 'task', task)} 
                                                     onDoubleClick={() => !dragCtx && navigate(`/portal/tasks/edit/${task.id}`)} 
                                                     style={{ cursor: editMode ? 'grab' : 'pointer', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                    <span className="truncate">{task.description} ({task.estimated_utilization || 0}%)</span>
                                                </div>
                                                
                                                {/* Sub-visualizing events */}
                                                {task.events && task.events.length > 0 && (
                                                    <div className="gantt-events-track">
                                                        {(() => {
                                                            const tsStr = task.start_date.split('T')[0];
                                                            const teStr = task.due_date.split('T')[0];

                                                            let startIdx = generateTimelineStrs.findIndex(s => s >= tsStr);
                                                            if (startIdx === -1) startIdx = 0;
                                                            
                                                            let endIdx = -1;
                                                            for(let i = generateTimelineStrs.length - 1; i >= 0; i--) {
                                                                if (generateTimelineStrs[i] <= teStr) {
                                                                    endIdx = i;
                                                                    break;
                                                                }
                                                            }
                                                            if (endIdx === -1) endIdx = generateTimelineStrs.length - 1;
                                                            
                                                            const opticalSpan = (endIdx - startIdx) + 1;
                                                            if (opticalSpan <= 0) return null;
                                                            
                                                            // Completely bypass positioning math and inherently let Flexbox align them 1:1 with optical columns
                                                            return Array.from({ length: opticalSpan }).map((_, i) => {
                                                                const dayStr = generateTimelineStrs[startIdx + i];
                                                                const dayEvents = task.events.filter(ev => ev.event_date.startsWith(dayStr));
                                                                const hasEvent = dayEvents.length > 0;
                                                                
                                                                return (
                                                                    <div key={i} style={{ flex: 1, position: 'relative', height: '100%' }}>
                                                                        {hasEvent && (
                                                                            <div 
                                                                                className="gantt-event-blip"
                                                                                title={`Logged ${dayEvents.reduce((acc, ev) => acc + parseFloat(ev.hours_spent || 0), 0)}hrs on ${dayStr}`}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                )}

                                                {editMode && (
                                                    <div 
                                                        className="gantt-resize-handle right" 
                                                        onPointerDown={(e) => handlePointerDown(e, task, 'resize-right', u.id)}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* Footer overlay within relative timeline */}
                                    <div className="gantt-timeline-footer" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', display: 'flex', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)', zIndex: 4 }}>
                                    {generateTimeline.map((date, i) => {
                                        const dayUtil = u.visibleTasks
                                            .filter(task => {
                                                if (!task.start_date || !task.due_date) return false;
                                                const sp = task.start_date.split('T')[0].split('-');
                                                const ep = task.due_date.split('T')[0].split('-');
                                                const tStart = new Date(sp[0], sp[1] - 1, sp[2]);
                                                const tEnd = new Date(ep[0], ep[1] - 1, ep[2]);
                                                return date >= tStart && date <= tEnd;
                                            })
                                            .reduce((acc, task) => acc + (parseFloat(task.estimated_utilization)||0), 0);

                                        let color = 'transparent';
                                        let bg = '';
                                        if (dayUtil >= 100) {
                                            color = '#ef4444';
                                            bg = 'rgba(239, 68, 68, 0.1)';
                                        } else if (dayUtil >= 80) {
                                            color = '#f59e0b';
                                            bg = 'rgba(245, 158, 11, 0.1)';
                                        } else if (dayUtil > 0) {
                                            color = '#10b981';
                                            bg = 'rgba(16, 185, 129, 0.05)';
                                        }

                                        return (
                                            <div key={i} className={`gantt-grid-cell ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: color, background: bg }}>
                                                {dayUtil > 0 ? `${dayUtil}%` : ''}
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {usersWithTasks.length === 0 && (
                            <div className="gantt-empty">No active tasks aligned with this timeframe.</div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.5rem' }}>
                <h3 className="gantt-section-title" style={{ margin: 0 }}>Actual Work (Logged Events)</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-panel)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>Auto-Log:</span>
                    {isFinancial && (
                        <select 
                            value={autoGenUser} 
                            onChange={(e) => setAutoGenUser(e.target.value)}
                            style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.4rem 0.5rem', borderRadius: '6px', outline: 'none', cursor: 'pointer', maxWidth: '140px' }}
                        >
                            <option value="all">All Globals</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                            ))}
                        </select>
                    )}
                    <select 
                        value={autoGenDate} 
                        onChange={(e) => setAutoGenDate(e.target.value)}
                        style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.4rem 0.5rem', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
                    >
                        {generateTimeline && generateTimeline.map((date, i) => {
                            const pad = n => n.toString().padStart(2,'0');
                            const ds = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                            return (
                                <option key={i} value={ds}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </option>
                            );
                        })}
                    </select>
                    <button 
                        onClick={handleAutoGenerateHours}
                        disabled={isGenerating}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
                        title="Auto-generate hours for the selected date based on utilization % assigned to tasks."
                    >
                        {isGenerating ? 'Generating...' : 'Fill Auto Hours'}
                    </button>
                </div>
            </div>
            <div className="gantt-split-layout" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-panel)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                {/* LEFT PANE */}
                <div className="gantt-pane-left" style={{ width: '250px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', zIndex: 10 }}>
                    <div style={{ height: '53px', display: 'flex', alignItems: 'center', padding: '0 1rem', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--text-muted)' }}>
                        Employees
                    </div>
                    <div>
                        {usersWithEvents.map(u => {
                            const userTotalHours = u.visibleEvents.filter(isEventInView).reduce((acc, ev) => acc + (parseFloat(ev.hours_spent)||0), 0);
                            return (
                                <div key={u.id} className="gantt-row" style={{ display: 'flex', flexDirection: 'column', padding: '0', borderRight: '1px solid var(--border)', background: 'var(--bg-panel)', minHeight: `${Math.max(90, u.maxLanes * 36 + 50)}px` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', flex: 1 }}>
                                        <div className="gantt-user-avatar" style={{ background: '#10b981' }}>{u.first_name ? u.first_name[0] : u.username[0]}</div>
                                        <div className="gantt-user-info" style={{ marginLeft: '1rem' }}>
                                            <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', color: 'var(--text-main)' }}>{u.first_name || u.username}</h4>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logs: {u.visibleEvents.length}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 1rem', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                        <strong>Period Total:</strong> <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>{userTotalHours.toFixed(2)}h</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT PANE */}
                <div className="gantt-chart" ref={scrollRefBottom} onScroll={handleScrollBottom} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: 'var(--bg-panel)' }}>
                    <div className="gantt-grid-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                        <div className="gantt-timeline-header" style={{ minWidth: `${generateTimeline.length * 65}px` }}>
                            {generateTimeline.map((date, i) => (
                                <div key={i} data-is-month-start={date.getDate() === 1 && date.getMonth() === new Date(baseDate).getMonth() ? "true" : "false"} className={`gantt-day-tick ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2', padding: '4px 0' }}>
                                    <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>[Wk {getWeekNumber(date, userStartDayOfWeek)}]</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{date.getDate()}</span>
                                    <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="gantt-body">
                        {usersWithEvents.map(u => (
                            <div key={u.id} className="gantt-row" style={{ minHeight: `${Math.max(90, u.maxLanes * 36 + 50)}px` }}>
                                <div className="gantt-row-timeline" style={{ minWidth: `${generateTimeline.length * 65}px` }}>
                                    {/* Grid backdrop */}
                                    {generateTimeline.map((d, i) => {
                                        const pad = n => n.toString().padStart(2,'0');
                                        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                                        const dayEvents = u.visibleEvents.filter(ev => ev.event_date && ev.event_date.startsWith(dateStr));
                                        const totalHours = dayEvents.reduce((acc, ev) => acc + parseFloat(ev.hours_spent || 0), 0);
                                        
                                        const minReqHours = u.region === 'Triad Asia' ? 5 : 7;
                                        const isUnderHours = totalHours > 0 && totalHours < minReqHours;
                                        
                                        return (
                                            <div 
                                                key={i} 
                                                className={`gantt-grid-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`}
                                                style={{
                                                    background: isUnderHours ? 'rgba(239, 68, 68, 0.15)' : '',
                                                    borderRight: isUnderHours ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                                                    borderLeft: isUnderHours ? '1px solid rgba(239, 68, 68, 0.4)' : 'none'
                                                }}
                                                title={isUnderHours ? `Incomplete Logging: ${totalHours.toFixed(2)}h total (Min ${minReqHours}h req)` : ''}
                                            />
                                        );
                                    })}

                                    {/* Event overlays */}
                                    {u.visibleEvents.filter(isEventInView).map(ev => {
                                        const styles = calculateEventStyles(ev);
                                        return (
                                            <div 
                                                key={ev.id} 
                                                className={`gantt-event-bar ${dragCtx && dragCtx.task.id === ev.id && dragCtx.type === 'move-event' ? 'dragging' : ''}`} 
                                                style={{ ...styles, cursor: editMode ? 'grab' : 'default' }}
                                                onPointerDown={(e) => handlePointerDown(e, ev, 'move-event', u.id)}
                                                onMouseEnter={(e) => handleMouseEnterTooltip(e, (
                                                    <div style={{ borderColor: '#10b981' }}>
                                                        <strong>Task #{ev.task_id}</strong>
                                                        <p>{ev.task_description}</p>
                                                        <p>Time Logged: {ev.hours_spent} hours</p>
                                                        {ev.content && <p>Note: {ev.content}</p>}
                                                    </div>
                                                ))}
                                                onMouseLeave={handleMouseLeaveTooltip}
                                            >
                                                <div className="gantt-task-content" 
                                                     onContextMenu={(e) => handleContextMenuClick(e, 'event', ev)}
                                                     onDoubleClick={() => navigate(`/portal/tasks/edit/${ev.task_id}`)} 
                                                     style={{ cursor: editMode ? 'grab' : 'pointer' }}>
                                                    <span className="truncate">{ev.hours_spent}h</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                
                                    {/* Footer overlay within relative timeline */}
                                    <div className="gantt-timeline-footer" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', display: 'flex', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)', zIndex: 4 }}>
                                    {generateTimeline.map((date, i) => {
                                        const dayTotal = u.visibleEvents
                                            .filter(ev => {
                                                const ep = ev.event_date.split('T')[0].split('-');
                                                const evD = new Date(ep[0], ep[1] - 1, ep[2]);
                                                return evD.getFullYear() === date.getFullYear() && evD.getMonth() === date.getMonth() && evD.getDate() === date.getDate();
                                            })
                                            .reduce((acc, ev) => acc + (parseFloat(ev.hours_spent)||0), 0);

                                        return (
                                            <div key={i} className={`gantt-grid-cell ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', color: dayTotal > 0 ? '#10b981' : 'transparent', background: dayTotal > 0 ? 'rgba(16, 185, 129, 0.05)' : '' }}>
                                                {dayTotal > 0 ? `${dayTotal.toFixed(2)}h` : ''}
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {usersWithEvents.length === 0 && (
                            <div className="gantt-empty">No logged events for this timeframe.</div>
                        )}
                    </div>
                </div>
            </div>

            {autoGenDrafts && (
                <div className="modal-overlay" onPointerDown={() => setAutoGenDrafts(null)} style={{ zIndex: 99999 }}>
                    <div 
                        className="modal" 
                        onPointerDown={e => e.stopPropagation()} 
                        style={{ maxWidth: '850px' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitAutoGeneratedHours();
                        }}
                    >
                        <div className="modal-header">
                            <h2>Review Auto-Generated Hours</h2>
                            <button className="close-modal" onClick={() => setAutoGenDrafts(null)}>&times;</button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Target Date: <strong style={{color: 'var(--text-main)'}}>{autoGenDate}</strong>. 
                            The following hours have been drafted based on active task utilization. 
                            Modify them manually if needed before saving. Press <strong>Enter</strong> to commit.
                        </p>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', background: 'var(--bg-dark)' }}>
                            {autoGenDrafts.map((draft, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 150px) 200px 80px 1fr', gap: '1rem', alignItems: 'center', padding: '0.75rem', borderBottom: idx < autoGenDrafts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {isFinancial ? (
                                            <select 
                                                value={draft.user_id}
                                                onChange={(e) => {
                                                    const newDrafts = [...autoGenDrafts];
                                                    newDrafts[idx].user_id = Number(e.target.value);
                                                    setAutoGenDrafts(newDrafts);
                                                }}
                                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                                            >
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.first_name || user?.username}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <strong style={{ fontSize: '0.85rem' }} className="truncate">P-{draft.task_id}</strong>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate">{draft.task_description}</span>
                                    </div>
                                    <div>
                                        <input 
                                            type="number" 
                                            step="0.5" 
                                            min="0"
                                            value={draft.hours}
                                            onChange={(e) => {
                                                const newDrafts = [...autoGenDrafts];
                                                newDrafts[idx].hours = e.target.value;
                                                setAutoGenDrafts(newDrafts);
                                            }}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)', textAlign: 'center' }}
                                        />
                                    </div>
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Optional note..."
                                            value={draft.content}
                                            onChange={(e) => {
                                                const newDrafts = [...autoGenDrafts];
                                                newDrafts[idx].content = e.target.value;
                                                setAutoGenDrafts(newDrafts);
                                            }}
                                            style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAutoGenDrafts(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={submitAutoGeneratedHours} disabled={isGenerating}>
                                {isGenerating ? 'Saving...' : 'Confirm & Save All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {hoverTooltip.visible && hoverTooltip.content && (
                <div className="fixed-gantt-tooltip" style={{
                    left: `${Math.min(Math.max(hoverTooltip.x, 150), window.innerWidth - 150)}px`,
                    top: hoverTooltip.y > window.innerHeight - 200 ? 'auto' : `${hoverTooltip.y}px`,
                    bottom: hoverTooltip.y > window.innerHeight - 200 ? `${(window.innerHeight - hoverTooltip.topPosition + 12)}px` : 'auto',
                    transform: 'translateX(-50%)'
                }}>
                    {hoverTooltip.content}
                </div>
            )}
        </div>
    );
}
