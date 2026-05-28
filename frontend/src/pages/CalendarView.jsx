import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { log, showToast } from '../utils/logger';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';
import './CalendarView.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarView() {
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);

    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(isFinancial ? '' : String(user?.id || ''));
    const [selectedTypes, setSelectedTypes] = useState(isFinancial ? ['lead', 'project', 'milestone', 'invoice', 'task', 'pto'] : ['project', 'milestone', 'task', 'pto']);
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/users/').then(res => {
            const employees = res.filter(u => u.is_employee);
            employees.sort((a, b) => {
                const nameA = (a.first_name || a.username || '').toLowerCase();
                const nameB = (b.first_name || b.username || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            setUsers(employees);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (!isFinancial && user?.id) {
            setSelectedUser(String(user.id));
            // Keep types as their state allows toggling now
        }
    }, [isFinancial, user]);

    useEffect(() => {
        const fetchEvents = async () => {
            if (selectedTypes.length === 0) {
                setEvents([]);
                return;
            }
            let url = `/calendar/events?types=${selectedTypes.join(',')}`;
            if (selectedUser) url += `&user_id=${selectedUser}`;
            
            try {
                const data = await api.get(url);
                const formatted = data.map(e => ({
                    ...e,
                    start: new Date(e.start),
                    end: new Date(e.end)
                }));
                setEvents(formatted);
            } catch (err) {
                log.error('CalendarView', 'Failed to load calendar events', err);
                showToast('Failed to load calendar events.');
            }
        };
        fetchEvents();
    }, [selectedUser, selectedTypes]);

    const handleSelectEvent = (event) => {
        const type = event.type.toLowerCase();
        const id = event.item_id;
        
        // Dynamic navigation mapping
        if (type === 'project') navigate(`/portal/projects/${id}`);
        else if (type === 'invoice') navigate(`/portal/invoices/${id}`);
        else if (type === 'task') navigate(`/portal/tasks?id=${id}`);
        else if (type === 'lead') navigate(`/portal/leads/edit/${id}`);
        else if (type === 'milestone') navigate(`/portal/milestones`);
        else if (type === 'pto') navigate(`/portal/pto`);
    };

    const toggleType = (type) => {
        setSelectedTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const eventStyleGetter = (event) => {
        let backgroundColor = '#60a5fa'; // Default blue-400
        switch (event.type.toLowerCase()) {
            case 'lead': backgroundColor = '#fbbf24'; break;      // amber-400
            case 'project': backgroundColor = '#60a5fa'; break;   // blue-400
            case 'milestone': backgroundColor = '#a78bfa'; break; // violet-400
            case 'invoice': backgroundColor = '#f87171'; break;   // red-400
            case 'task': backgroundColor = '#4ade80'; break;      // green-400
            case 'pto': backgroundColor = '#38bdf8'; break;       // sky-400
            default: break;
        }

        // Faded style for completed/paid
        if (['Paid', 'Completed', 'Sent'].includes(event.status)) {
            backgroundColor += 'b3'; // 70% opacity hex
        }

        // Visually map "estimated utilization" thickness
        let borderBottom = '0px';
        if (event.type.toLowerCase() === 'task') {
            const util = event.utilization || 0;
            // 0% = 1px thin line, +2px for every 10% 
            const thickness = 1 + (Math.floor(util / 10) * 2); 
            borderBottom = `${thickness}px solid rgba(255, 255, 255, 0.65)`;
        }

        return { 
            style: { 
                backgroundColor, 
                borderRadius: '4px', 
                color: 'white', 
                border: '0px',
                borderBottom,
                fontSize: '0.8rem',
                padding: '2px 4px'
            } 
        };
    };

    const getPrintTitle = () => {
        try {
            switch (view) {
                case 'month':
                    return `Month: ${format(date, 'MMMM yyyy')}`;
                case 'week':
                    return `Week: ${format(startOfWeek(date), 'MMM d, yyyy')} - ${format(endOfWeek(date), 'MMM d, yyyy')}`;
                case 'day':
                    return `Day: ${format(date, 'MMMM d, yyyy')}`;
                case 'agenda':
                    return `Agenda (Starting ${format(date, 'MMMM d, yyyy')})`;
                default:
                    return '';
            }
        } catch (e) {
            return '';
        }
    };

    const [lastActiveView, setLastActiveView] = useState('month');

    // Filter Legend UI map
    const legendItems = [
        { type: 'lead', color: '#fbbf24' },
        { type: 'project', color: '#60a5fa' },
        { type: 'milestone', color: '#a78bfa' },
        { type: 'invoice', color: '#f87171' },
        { type: 'task', color: '#4ade80' },
        { type: 'pto', color: '#38bdf8' }
    ];

    return (
        <div className="dashboard-container" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-header" style={{ marginBottom: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                <h2>Global Calendar</h2>
                
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                    
                    {/* User Filter */}
                    {isFinancial && (
                        <select 
                            value={selectedUser} 
                            onChange={e => setSelectedUser(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                        >
                            <option value="">All Assigned Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name || u.username}</option>
                            ))}
                        </select>
                    )}

                    {/* Interactive Types Legend */}
                    <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        {legendItems.filter(item => isFinancial || ['project', 'milestone', 'task', 'pto'].includes(item.type)).map(item => (
                            <label key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedTypes.includes(item.type)}
                                    onChange={() => toggleType(item.type)}
                                    style={{ accentColor: item.color }}
                                />
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }}></span>
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </label>
                        ))}
                    </div>
                    
                    {/* Print to PDF Button */}
                    <div style={{ marginLeft: 'auto' }}>
                        <button onClick={() => window.print()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
                                <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
                            </svg>
                            Print to PDF
                        </button>
                    </div>

                </div>
            </div>

            <div className="calendar-container" style={{ flex: 1, background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: '600px' }}>
                <div className="print-only-header" style={{ display: 'none', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #ccc' }}>
                    <h2 style={{ margin: '0 0 5px 0', color: 'black' }}>TSE PACE - Calendar Report</h2>
                    <h3 style={{ margin: '0', color: '#555' }}>{getPrintTitle()}</h3>
                </div>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    components={{
                        agenda: {
                            event: ({ event }) => (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{event.title}</div>
                                        {event.project_name && (
                                            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                Project: {event.project_name} #{event.project_number}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', textAlign: 'right' }}>
                                        <strong>Owner:</strong> {event.assigned_to || 'Unassigned'}
                                    </div>
                                </div>
                            )
                        }
                    }}
                    views={['month', 'week', 'day', 'agenda']}
                    view={view}
                    length={lastActiveView === 'month' ? 31 : (lastActiveView === 'week' ? 7 : 1)}
                    onView={(newView) => {
                        setView(newView);
                        if (newView !== 'agenda') setLastActiveView(newView);
                    }}
                    date={date}
                    onNavigate={setDate}
                    popup
                    tooltipAccessor={e => {
                        let headline = e.title;
                        if (e.type === 'Task') {
                            const taskType = e.task_type ? e.task_type.toUpperCase() : 'TASK';
                            const uName = e.assigned_to && e.assigned_to !== 'Unassigned' ? e.assigned_to : '';
                            const pId = e.project_number ? `[${e.project_number}]` : '[N/A]';
                            const pName = e.project_name || e.title.replace(/^\[.*?\]\s*/, '');
                            headline = `${taskType} ${uName ? `(${uName}) ` : ''}${pId} ${pName}`.trim();
                        }

                        let tt = `${headline}\nStatus: ${e.status}`;
                        if (e.milestone_name) tt += `\nMilestone: ${e.milestone_name}`;
                        
                        if (e.type === 'Task') {
                            tt += `\nHours: ${e.logged_hours || 0} spent / ${e.budget_hours || 0} estimated`;
                        } else if (e.assigned_to && e.assigned_to !== 'Unassigned') {
                            tt += `\nAssigned: ${e.assigned_to}`;
                        }
                        
                        return tt;
                    }}
                />
            </div>
        </div>
    );
}
