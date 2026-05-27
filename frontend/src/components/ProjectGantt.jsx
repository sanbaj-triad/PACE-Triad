import React, { useState, useEffect, useRef } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LOGO_BASE64 } from '../utils/logoBase64';
import { useSystem } from '../context/SystemContext';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';

const CustomTaskListHeader = ({ headerHeight, fontFamily, fontSize }) => {
    return (
        <div style={{ height: headerHeight, fontFamily, fontSize, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb', borderTop: '1px solid transparent', fontWeight: '600', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ flex: 1, paddingLeft: '12px' }}>Task Name</div>
            <div style={{ width: '120px', borderLeft: '1px solid #e5e7eb', paddingLeft: '8px' }}>Resource</div>
        </div>
    );
};

const CustomTaskListTable = ({
    rowHeight,
    rowWidth,
    tasks,
    fontFamily,
    fontSize,
    locale,
    onExpanderClick,
}) => {
    return (
        <div style={{ fontFamily, fontSize, width: rowWidth, color: 'var(--text-main)' }}>
            {tasks.map(t => {
                let expanderSymbol = "";
                if (t.hideChildren === false) expanderSymbol = "▼";
                else if (t.hideChildren === true) expanderSymbol = "▶";

                const isProject = t.type === 'project';
                
                return (
                    <div 
                        key={t.id} 
                        style={{ height: rowHeight, width: rowWidth, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb', backgroundColor: isProject ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                    >
                        <div style={{ flex: 1, paddingLeft: isProject ? '12px' : '32px', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {expanderSymbol && (
                                <span 
                                    style={{ cursor: 'pointer', marginRight: '6px', fontSize: '10px', display: 'inline-flex', width: '12px', justifyContent: 'center' }} 
                                    onClick={() => onExpanderClick(t)}
                                >
                                    {expanderSymbol}
                                </span>
                            )}
                            <span title={t.name} style={{ fontWeight: isProject ? '600' : '400', color: isProject ? 'var(--primary)' : 'inherit' }}>{t.name}</span>
                        </div>
                        <div style={{ width: '120px', borderLeft: '1px solid #e5e7eb', paddingLeft: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9em', color: 'var(--text-muted)' }}>
                            {t.resource || ''}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ProjectGantt = ({ projectId, project, onProjectUpdate }) => {
    const { systemState } = useSystem();
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);
    const isManager = user?.direct_reports?.length > 0 || user?.role?.toLowerCase() === 'manager';
    const isPM = user?.role?.toLowerCase() === 'pm' || project?.pm_id === user?.id;
    const canEdit = true; // Relaxed restriction so the button appears

    const [tasks, setTasks] = useState([]);
    const [rawTasks, setRawTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(ViewMode.Day);
    const [exporting, setExporting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // We reference the div wrapping the Gantt chart for screenshots
    const ganttRef = useRef(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // Fetch tasks for the project
                const data = await api.get(`/tasks/?project_id=${projectId}`);
                setRawTasks(data);
                
                // Map tasks to Gantt format
                const ganttTasks = [];
                
                // Set to track milestone names that actually have assigned tasks
                const activeMilestoneGroups = new Set(data.filter(t => t.task_type !== 'FIXED').map(t => (t.milestone && t.milestone.name) ? t.milestone.name : 'ZZZ_Z_Unassigned_Tasks'));
                
                // Build a prefix map based on Milestone chronological order to group tasks sequentially
                const milestonePrefixes = {};
                if (project && project.milestones && Array.isArray(project.milestones)) {
                    const sortedM = [...project.milestones].sort((a,b) => {
                        const dA = new Date(a.start_date || a.created_at || a.due_date || 0);
                        const dB = new Date(b.start_date || b.created_at || b.due_date || 0);
                        return dA.getTime() - dB.getTime();
                    });
                    sortedM.forEach((m, idx) => {
                        milestonePrefixes[m.name] = String(idx + 1).padStart(3, '0') + "_" + m.name;
                    });
                }

                data.filter(t => t.task_type !== 'FIXED').forEach(task => {
                    // We need valid dates for the Gantt chart
                    let start = task.start_date ? new Date(task.start_date) : null;
                    let end = task.due_date ? new Date(task.due_date) : null;
                    
                    // Fallbacks if one date is missing
                    if (!start && end) {
                        start = new Date(end);
                        start.setDate(start.getDate() - 1); // Default to 1 day before due date
                    } else if (start && !end) {
                        end = new Date(start);
                        end.setDate(end.getDate() + 1); // Default to 1 day after start date
                    }
                    
                    if (start && end) {
                        // Ensure end is strictly after start for the library to render
                        if (end.getTime() <= start.getTime()) {
                            end.setDate(end.getDate() + 1);
                        }

                        // Determine task name + user assigned (requested feature)
                        let taskNameDesc = task.description || 'Untitled Task';
                        let assignedUser = '';
                        if (task.assigned_to && task.assigned_to.username) {
                            assignedUser = task.assigned_to.username;
                        } else if (task.assigned_to && task.assigned_to.email) {
                            assignedUser = task.assigned_to.email;
                        }

                        ganttTasks.push({
                            id: `Task-${task.id}`,
                            name: taskNameDesc,
                            resource: assignedUser,
                            type: 'task',
                            progress: Math.round(task.progress || 0),
                            start: start,
                            end: end,
                            task_category: (task.milestone && task.milestone.name) ? (milestonePrefixes[task.milestone.name] || task.milestone.name) : 'ZZZ_Z_Unassigned_Tasks',
                            typeWeight: 2,
                            styles: {
                                progressColor: 'var(--primary)',
                                progressSelectedColor: '#ff9e0f',
                            }
                        });
                    }
                });
                
                // Add dummy project bar for Project Due Date to force timeline stretch
                if (project && project.due_date) {
                    const projEnd = new Date(project.due_date);
                    // Ensure valid dates for the milestone
                    let dummyEnd = new Date(projEnd);
                    // Set a fallback start date if start_date is missing
                    const projStart = project.start_date 
                        ? new Date(project.start_date) 
                        : (project.created_at ? new Date(project.created_at) : new Date(projEnd.getTime() - 86400000 * 7));

                    if (dummyEnd.getTime() <= projStart.getTime()) {
                        dummyEnd.setDate(dummyEnd.getDate() + 1);
                    }
                    
                    let projPM = '';
                    if (project && project.pm_user) {
                        projPM = project.pm_user.username || project.pm_user.email || '';
                    }

                    ganttTasks.push({
                        id: `Project-Deadline-Virtual`,
                        name: '★ Project Timeline',
                        resource: projPM,
                        type: 'project',
                        progress: 0,
                        start: projStart,
                        end: dummyEnd,
                        task_category: '000_Project',
                        typeWeight: 0,
                        styles: {
                            progressColor: '#dc2626',
                            progressSelectedColor: '#ef4444',
                        }
                    });
                }
                
                // Add actual project milestones
                if (project && project.milestones && Array.isArray(project.milestones)) {
                    project.milestones.forEach((m) => {
                        if (m.due_date) {
                            const mEnd = new Date(m.due_date);
                            let dummyEnd = new Date(mEnd);
                            const mStart = m.start_date 
                                ? new Date(m.start_date)
                                : (m.created_at ? new Date(m.created_at) : new Date(mEnd.getTime() - 86400000 * 7));

                            if (dummyEnd.getTime() <= mStart.getTime()) {
                                dummyEnd.setDate(dummyEnd.getDate() + 1);
                            }
                            
                            const matchedCategory = activeMilestoneGroups.has(m.name) ? m.name : 'ZZZ_Y_Isolated_Milestones';
                            const finalCat = milestonePrefixes[m.name] || matchedCategory;
                            
                            let mOwner = '';
                            if (m.owner) {
                                mOwner = m.owner.username || m.owner.email || '';
                            }

                            ganttTasks.push({
                                id: `Milestone-${m.id}`,
                                name: `◆ ${m.name}`,
                                resource: mOwner,
                                type: 'task',
                                progress: m.status === 'completed' ? 100 : 0,
                                start: mStart,
                                end: dummyEnd,
                                task_category: finalCat,
                                typeWeight: 1,
                                hideChildren: false,
                                styles: {
                                    progressColor: '#3b82f6',
                                    progressSelectedColor: '#2563eb',
                                }
                            });
                        }
                    });
                }
                
                // Sort by Category, then Type (Task vs Milestone), then start date
                ganttTasks.sort((a, b) => {
                    // Force the virtual project timeline to the absolute top
                    if (a.id === 'Project-Deadline-Virtual') return -1;
                    if (b.id === 'Project-Deadline-Virtual') return 1;

                    // Group by chronological prefix map we built
                    if (a.task_category !== b.task_category) {
                        return a.task_category.localeCompare(b.task_category);
                    }
                    
                    // Inside the same group, ensure Milestone bar appears BEFORE nested Task bars
                    if (a.typeWeight !== b.typeWeight) {
                        return a.typeWeight - b.typeWeight;
                    }
                    
                    // Finally, chronological sort within tasks
                    return a.start.getTime() - b.start.getTime();
                });

                setTasks(ganttTasks);
            } catch (err) {
                console.error("Failed to fetch tasks for Gantt", err);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchTasks();
        }
    }, [projectId, project, refreshTrigger]);

    const handleTaskChange = async (task, children) => {
        if (!editMode) return;
        
        // Prevent Project virtual deadline from being modified
        if (task.id === 'Project-Deadline-Virtual') {
            alert("The Project Timeline bounds cannot be modified directly via Gantt. Edit the project settings.");
            setRefreshTrigger(prev => prev + 1);
            return;
        }

        const isMilestone = task.id.startsWith('Milestone-');
        const entityId = parseInt(task.id.replace('Milestone-', '').replace('Task-', ''), 10);
        
        let hasLoggedTime = false;
        
        if (isMilestone) {
            // Check if any tasks nested under this milestone have time logged
            const nestedTasks = rawTasks.filter(t => t.milestone_id === entityId);
            hasLoggedTime = nestedTasks.some(t => t.total_hours_spent > 0);
        } else {
            // Check if this task specifically has time logged
            const rawTask = rawTasks.find(t => t.id === entityId);
            if (rawTask && rawTask.total_hours_spent > 0) hasLoggedTime = true;
        }

        // Check if start date was shifted
        const oldGanttTask = tasks.find(t => t.id === task.id);
        const startChanged = oldGanttTask && task.start.getTime() !== oldGanttTask.start.getTime();

        if (hasLoggedTime && startChanged) {
            alert(isMilestone 
                ? "Time has already been logged for tasks inside this Milestone. You cannot modify the underlying Start Date."
                : "Time has been billed to this specific Task. The Start Date is permanently locked.");
            setRefreshTrigger(prev => prev + 1);
            return;
        }

        // Validate End Date against Project
        if (project && project.due_date) {
            const globalProjEnd = new Date(project.due_date);
            // Allow an artificial 24 hour buffer overlap due to library midnight-clipping
            if (task.end.getTime() > (globalProjEnd.getTime() + 86400000)) {
                alert("The End Date cannot exceed the global Project Due Date.");
                setRefreshTrigger(prev => prev + 1);
                return;
            }
        }
        
        // Validate Task against parent Milestone
        if (!isMilestone) {
            const rawTask = rawTasks.find(t => t.id === entityId);
            if (rawTask && rawTask.milestone_id) {
                const parentMilestone = project?.milestones?.find(m => m.id === rawTask.milestone_id);
                if (parentMilestone && parentMilestone.due_date) {
                    const mEnd = new Date(parentMilestone.due_date);
                    if (task.end.getTime() > (mEnd.getTime() + 86400000)) {
                        alert(`Task cannot exceed its parent Milestone due date (${mEnd.toLocaleDateString()}).`);
                        setRefreshTrigger(prev => prev + 1);
                        return;
                    }
                }
            }
        }

        // Optimistically apply bounds locally
        setTasks(tasks.map(t => (t.id === task.id ? task : t)));

        try {
            // Fire API to permanently lock these values into the backend
            const isoStart = task.start.toISOString().split('T')[0] + 'T00:00:00.000Z';
            const isoEnd = task.end.toISOString().split('T')[0] + 'T23:59:59.000Z';
            
            if (isMilestone) {
                await api.put(`/milestones/${entityId}`, { start_date: isoStart, due_date: isoEnd });
                
                // Cascade exactly to all nested tasks using the raw milestone offset!
                const startDiffMs = oldGanttTask ? (task.start.getTime() - oldGanttTask.start.getTime()) : 0;
                
                if (startDiffMs !== 0) {
                    const cascadeTasks = rawTasks.filter(t => t.milestone_id === entityId);
                    
                    for (const nt of cascadeTasks) {
                        try {
                            const nStart = new Date(nt.start_date || nt.created_at || Date.now());
                            const nEnd = new Date(nt.due_date || nt.created_at || Date.now());
                            
                            nStart.setTime(nStart.getTime() + startDiffMs);
                            nEnd.setTime(nEnd.getTime() + startDiffMs);
                            
                            const tIsoStart = nStart.toISOString().split('T')[0] + 'T00:00:00.000Z';
                            const tIsoEnd = nEnd.toISOString().split('T')[0] + 'T23:59:59.000Z';
                            
                            await api.put(`/tasks/${nt.id}`, { start_date: tIsoStart, due_date: tIsoEnd });
                        } catch (e) {
                            console.error(`Failed cascading to task ${nt.id}`, e);
                        }
                    }
                }
            } else {
                await api.put(`/tasks/${entityId}`, { start_date: isoStart, due_date: isoEnd });
            }
        } catch (err) {
            console.error("Gantt boundary sync failed", err);
            alert("Failed to save resized bounds to the server.");
        } finally {
            // Re-sync explicitly to ensure pure representation
            if (onProjectUpdate) onProjectUpdate();
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const handleExportPDF = async (format = 'letter') => {
        if (!ganttRef.current || !project) return;
        setExporting(true);
        try {
            // 1. Conditionally determine orientation
            let pdfOrientation = 'portrait';
            let pdfFormat = 'letter';

            if (format === 'tabloid') {
                pdfOrientation = 'landscape';
                pdfFormat = 'tabloid'; 
            } else {
                pdfOrientation = 'portrait';
                pdfFormat = 'letter';
            }

            const pdf = new jsPDF({
                orientation: pdfOrientation,
                unit: 'pt',
                format: pdfFormat
            });

            const pdfWidth = pdf.internal.pageSize.getWidth(); // ~792
            const pdfHeight = pdf.internal.pageSize.getHeight(); // ~612

            // To capture the full scrollable width (e.g. up to April 30th if it is off-screen),
            // we must temporarily force the wrapper to be wide enough so html2canvas doesn't clip it.
            const svgs = ganttRef.current.querySelectorAll('svg');
            let maxSvgWidth = 0;
            svgs.forEach(s => {
                const w = s.getBoundingClientRect().width;
                if (w > maxSvgWidth) maxSvgWidth = w;
            });

            const originalWidth = ganttRef.current.style.width;
            const originalMaxWidth = ganttRef.current.style.maxWidth;
            const currentContainerWidth = ganttRef.current.getBoundingClientRect().width;

            if (maxSvgWidth > 0) {
                // Add ~320px for the left-side Task List panel since we widened it to 300px for the Resource column
                const neededWidth = maxSvgWidth + 320;
                
                // Only expand the container if the timeline is actually spilling off-screen.
                // If we forcefully SHRINK the bounding box on compact views (like Month/Week), 
                // the Gantt library's responsive flexbox engine might compress or hide the task list!
                if (neededWidth > currentContainerWidth) {
                    ganttRef.current.style.width = neededWidth + 'px';
                    ganttRef.current.style.maxWidth = 'none';
                }
            }

            // Temporarily ignore dark mode during PDF capture so the report is white/printable
            ganttRef.current.setAttribute('data-exporting', 'true');

            // Add a small delay for the browser to recalculate layout
            await new Promise(r => setTimeout(r, 200));

            // Capture the visual Gantt via html2canvas (scale 2 for high res print)
            const canvas = await html2canvas(ganttRef.current, {
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // Restore immediately
            ganttRef.current.removeAttribute('data-exporting');
            ganttRef.current.style.width = originalWidth;
            ganttRef.current.style.maxWidth = originalMaxWidth;

            const imgData = canvas.toDataURL('image/jpeg', 0.8);

            // Map chart width into PDF preserving aspect ratio at a readable scale
            const printScale = 0.75 / 2; 
            const renderWidth = canvas.width * printScale;
            const renderHeight = canvas.height * printScale;

            const margin = 40;
            const contentWidth = pdfWidth - (margin * 2);

            let xOffset = 0;
            let yOffset = 0;
            let pageNum = 1;

            // Header space requirements
            const headerBlockHeight = 180;  // Space needed for the full data header

            while (yOffset < renderHeight) {
                xOffset = 0;

                while (xOffset < renderWidth) {
                    if (pageNum > 1) {
                        pdf.addPage();
                    }

                    const currentHeaderOffset = headerBlockHeight;

                    // Draw the image slice. We use an alias 'GANTT_IMG' so it only embeds the image bytes into the PDF once!
                    pdf.addImage(
                        imgData, 
                        'JPEG', 
                        margin - xOffset, 
                        currentHeaderOffset - yOffset, 
                        renderWidth, 
                        renderHeight,
                        'GANTT_IMG',
                        'FAST'
                    );

                    // Mask off the top and margins so the image doesn't bleed into the header and page edges if the PDF viewer doesn't clip automatically
                    pdf.setFillColor(255, 255, 255);
                    // Top Mask
                    pdf.rect(0, 0, pdfWidth, currentHeaderOffset, 'F');
                    // Bottom Mask
                    pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
                    // Left Mask
                    pdf.rect(0, 0, margin, pdfHeight, 'F');
                    // Right Mask
                    pdf.rect(pdfWidth - margin, 0, margin, pdfHeight, 'F');

                    // Redraw the FULL header identical on every page so horizontal stitching aligns
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(16);
                    pdf.setTextColor(0,0,0);
                    pdf.text(`Project Timeline Report - ${project.project_unique_id} ${pageNum > 1 ? `(Page ${pageNum})` : ''}`, margin, margin);

                    // Add Logo to top right of header
                    const logoWidth = 100;
                    const logoHeight = 68;
                    // Because it's drawn on every loop iteration, we use an alias so jsPDF caches the byte string!
                    pdf.addImage(LOGO_BASE64, 'PNG', pdfWidth - margin - logoWidth, margin - 10, logoWidth, logoHeight);
                    
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.text(`Project Name: ${project.name || '-'}`, margin, 65);
                    pdf.text(`Customer Name: ${project.customer?.name || '-'}`, margin, 80);
                    pdf.text(`Site/Location: ${project.location?.name || project.location?.address || '-'}`, margin, 95);
                    pdf.text(`Type: ${project.project_type || '-'}`, margin, 110);
                    
                    const rightColX = pdfWidth / 2 + 20;
                    pdf.text(`Internal PM: ${project.pm_user?.username || '-'}`, rightColX, 65);
                    pdf.text(`Customer PM: ${project.customer_pm_user?.username || '-'}`, rightColX, 80);
                    pdf.text(`Due Date: ${project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}`, rightColX, 95);
                    pdf.text(`Status: ${project.status || '-'}`, rightColX, 110);
                    
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(margin, 175, pdfWidth - margin, 175);

                    // Footer note
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(`Generated on ${new Date().toLocaleString()} - Page ${pageNum} - PACE v${systemState?.app_version || '1.0.0'}`, margin, pdfHeight - 20);

                    xOffset += contentWidth;
                    pageNum++;
                }
                
                let heightUsed = (pdfHeight - headerBlockHeight - margin);
                yOffset += heightUsed;
            }

            // 4. Save
            pdf.save(`${project.project_unique_id}_Timeline_Report.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to export Gantt Report directly to PDF.");
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div>Loading timeline...</div>;

    if (tasks.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p>No task timeline data available. Ensure tasks have start and due dates.</p>
            </div>
        );
    }

    const displayTasks = tasks.map(t => ({
        ...t,
        isDisabled: !editMode
    }));

    return (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Project Timeline</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    
                    {canEdit && (
                        <button 
                            className={`btn ${editMode ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => setEditMode(!editMode)}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', marginRight: '0.5rem' }}
                            title="Allows dragging and resizing of timeline bounds"
                        >
                            {editMode ? 'Disable Editing' : 'Enable Editing'}
                        </button>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                        <button 
                            className="btn-primary" 
                            onClick={() => handleExportPDF('letter')} 
                            disabled={exporting}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: '#eab308' }}
                            title="Export 8.5x11 Portrait"
                        >
                            {exporting ? 'Generating...' : '⤓ Letter (8.5x11)'}
                        </button>
                        <button 
                            className="btn-primary" 
                            onClick={() => handleExportPDF('tabloid')} 
                            disabled={exporting}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: '#eab308' }}
                            title="Export 11x17 Landscape"
                        >
                            {exporting ? 'Generating...' : '⤓ Tabloid (11x17)'}
                        </button>
                    </div>
                    
                    <button 
                        className={`btn-secondary ${viewMode === ViewMode.Day ? 'active' : ''}`}
                        onClick={() => setViewMode(ViewMode.Day)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                        Day
                    </button>
                    <button 
                        className={`btn-secondary ${viewMode === ViewMode.Week ? 'active' : ''}`}
                        onClick={() => setViewMode(ViewMode.Week)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                        Week
                    </button>
                    <button 
                        className={`btn-secondary ${viewMode === ViewMode.Month ? 'active' : ''}`}
                        onClick={() => setViewMode(ViewMode.Month)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* We wrap the chart in a div specifically for screenshotting with html2canvas so that only the chart metrics are captured */}
            <div ref={ganttRef} className="gantt-wrapper" style={{ width: '100%', minHeight: '400px', backgroundColor: 'transparent', padding: '10px' }}>
                <Gantt
                    tasks={displayTasks}
                    viewMode={viewMode}
                    onDateChange={handleTaskChange}
                    listCellWidth="300px"
                    TaskListHeader={CustomTaskListHeader}
                    TaskListTable={CustomTaskListTable}
                    columnWidth={viewMode === ViewMode.Month ? 150 : 60}
                    preStepsCount={1}
                    postStepsCount={1}
                    barFill={60}
                    barCornerRadius={4}
                    rowHeight={40}
                />
            </div>
        </div>
    );
};

export default ProjectGantt;
