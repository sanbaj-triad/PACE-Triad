import os

jsx_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.jsx"
css_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.css"

with open(jsx_path, "r", encoding="utf-8") as f:
    jsx = f.read()

# 1. Inject Refs
if "const scrollRefTop = useRef(null);" not in jsx:
    jsx = jsx.replace("const chartRef = useRef(null);", 
"""const chartRef = useRef(null);
    const scrollRefTop = useRef(null);
    const scrollRefBottom = useRef(null);

    const handleScrollTop = (e) => {
        if (scrollRefBottom.current && e.target.scrollLeft !== scrollRefBottom.current.scrollLeft) {
            scrollRefBottom.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleScrollBottom = (e) => {
        if (scrollRefTop.current && e.target.scrollLeft !== scrollRefTop.current.scrollLeft) {
            scrollRefTop.current.scrollLeft = e.target.scrollLeft;
        }
    };""")

# 2. Inject usersWithEvents memo before "if(loading)"
events_memo = """
    const usersWithEvents = useMemo(() => {
        let targetUsers = users;
        if (filterUserId !== 'all') {
            targetUsers = users.filter(u => u.id === parseInt(filterUserId));
        }

        const allEvents = [];
        tasks.forEach(t => {
            if (t.events && t.events.length > 0) {
                t.events.forEach(ev => {
                    allEvents.push({
                        ...ev,
                        task_description: t.description,
                        task_id: t.id
                    });
                });
            }
        });

        allEvents.sort((a,b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

        return targetUsers.map(u => {
            const userEvents = allEvents.filter(ev => ev.user_id === u.id || (!ev.user_id && t.assigned_to_id === u.id));
            
            const lanes = [];
            userEvents.forEach(ev => {
                const evDate = new Date(ev.event_date);
                evDate.setMinutes(evDate.getMinutes() - evDate.getTimezoneOffset());
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
    }, [tasks, users, filterUserId]);
    
    const isEventInView = (ev) => {
        const evDate = new Date(ev.event_date);
        return evDate <= timelineEnd && evDate >= timelineStart;
    };
    
    const calculateEventStyles = (ev) => {
        const evDate = new Date(ev.event_date);
        evDate.setMinutes(evDate.getMinutes() - evDate.getTimezoneOffset());
        const visualMs = Math.max(evDate.getTime(), timelineStart.getTime());
        
        const leftOffset = Math.max(0, (visualMs - timelineStart.getTime()) / timelineTotalMs);
        const widthPercent = (1000 * 3600 * 24) / timelineTotalMs; // exactly 1 day wide

        return {
            left: `${leftOffset * 100}%`,
            width: `${widthPercent * 100}%`,
            top: `${(ev.lane || 0) * 36 + 5}px`
        };
    };
"""
if "const usersWithEvents = useMemo" not in jsx:
    jsx = jsx.replace("if(loading) return <div className=\"gantt-loading\">Loading Gantt Configuration...</div>;", 
                      events_memo + "\n    if(loading) return <div className=\"gantt-loading\">Loading Gantt Configuration...</div>;")

# 3. Add scrollRef to top chart and add bottom chart rendering
if "ref={scrollRefTop}" not in jsx:
    jsx = jsx.replace("<div className=\"gantt-chart\">", "<div className=\"gantt-chart\" ref={scrollRefTop} onScroll={handleScrollTop}>")

actuals_chart = """
            <h3 className="gantt-section-title">Actual Work (Logged Events)</h3>
            <div className="gantt-chart" ref={scrollRefBottom} onScroll={handleScrollBottom}>
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
                    {usersWithEvents.map(u => (
                        <div key={u.id} className="gantt-row">
                            <div className="gantt-row-label">
                                <div className="gantt-user-avatar" style={{ background: '#10b981' }}>{u.first_name ? u.first_name[0] : u.username[0]}</div>
                                <div className="gantt-user-info">
                                    <h4>{u.first_name || u.username}</h4>
                                    <span>Logs: {u.visibleEvents.length}</span>
                                </div>
                            </div>
                            <div className="gantt-row-timeline" style={{ minHeight: `${Math.max(60, u.maxLanes * 36 + 20)}px` }}>
                                {/* Grid backdrop */}
                                {generateTimeline.map((d, i) => (
                                    <div key={i} className={`gantt-grid-cell ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`} />
                                ))}

                                {/* Event overlays */}
                                {u.visibleEvents.filter(isEventInView).map(ev => {
                                    const styles = calculateEventStyles(ev);
                                    return (
                                        <div key={ev.id} className="gantt-event-bar" style={styles}>
                                            <div className="gantt-task-content">
                                                <span className="truncate">#{ev.task_id}: {ev.hours_spent}h</span>
                                                <div className="gantt-hover-details" style={{ borderColor: '#10b981' }}>
                                                    <strong>Task #{ev.task_id}</strong>
                                                    <p>{ev.task_description}</p>
                                                    <p>Time Logged: {ev.hours_spent} hours</p>
                                                    {ev.content && <p>Note: {ev.content}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    
                    {usersWithEvents.length === 0 && (
                        <div className="gantt-empty">No logged events for this timeframe.</div>
                    )}
                </div>
            </div>
"""

if "Actual Work (Logged Events)" not in jsx:
    jsx = jsx.replace("</div>\n        </div>\n    );\n}", "</div>\n" + actuals_chart + "        </div>\n    );\n}")

with open(jsx_path, "w", encoding="utf-8") as f:
    f.write(jsx)

# --- Add CSS ---
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

events_css = """
.gantt-section-title {
    margin: 2rem 0 1rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: -0.5px;
    padding: 0;
}

.gantt-event-bar {
    position: absolute;
    height: 30px;
    background: #10b981;
    border-radius: 6px;
    display: flex;
    align-items: center;
    color: white;
    font-size: 0.85rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    overflow: hidden;
    z-index: 5;
    white-space: nowrap;
    cursor: default;
    transition: all 0.2s;
}

.gantt-event-bar:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    z-index: 6;
}

.gantt-event-bar .gantt-task-content {
    cursor: default;
}
"""

if ".gantt-event-bar" not in css:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + events_css)

print("Actuals Gantt dual rendering injected successfully.")
