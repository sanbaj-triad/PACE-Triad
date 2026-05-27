import re

file_path = "c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/TaskFormV2.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# State replacements
text = text.replace("const [notes, setNotes] = useState([]);", "const [events, setEvents] = useState([]);")
text = text.replace("const [newNote, setNewNote] = useState('');", "const [newEventContent, setNewEventContent] = useState('');\n    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);\n    const [eventStartTime, setEventStartTime] = useState('');")
text = text.replace("const [noteHours, setNoteHours] = useState('');", "const [eventHours, setEventHours] = useState('');")

# Fetch logic
text = text.replace("setNotes(taskData.notes || []);", "setEvents(taskData.events || []);")

# Handlers mapping
text = text.replace("const handleNoteSubmit = async (e) => {", "const handleEventSubmit = async (e) => {")
text = text.replace("if (!newNote.trim()) return;", "if (!newEventContent.trim()) return;")
text = text.replace("const hours = parseFloat(noteHours) || 0;", "const hours = parseFloat(eventHours) || 0;\n            // Calculate end time if start time and hours exist\n            let endTime = null;\n            if (eventStartTime && hours > 0) {\n                const [h, m] = eventStartTime.split(':').map(Number);\n                const d = new Date();\n                d.setHours(h, m, 0);\n                d.setMinutes(d.getMinutes() + (hours * 60));\n                endTime = d.toTimeString().substring(0, 5);\n            }")
text = text.replace("await api.post(`/tasks/${id}/notes`, {", "await api.post(`/tasks/${id}/events`, {")
text = text.replace("content: newNote,", "content: newEventContent,\n                event_date: eventDate || new Date().toISOString().split('T')[0],\n                start_time: eventStartTime || null,\n                end_time: endTime,")
text = text.replace("setNewNote('');", "setNewEventContent('');\n            setEventStartTime('');")
text = text.replace("setNoteHours('');", "setEventHours('');")
text = text.replace("Failed to add note", "Failed to add event")
text = text.replace("new note and updated totals", "new event and updated totals")

text = text.replace("const handleNoteUpdate = async (noteId, content, hours) => {", "const handleEventUpdate = async (eventId, content, hours, date, start_time, end_time) => {")
text = text.replace("await api.put(`/task-notes/${noteId}`, { content, hours_spent: parseFloat(hours) || 0 }, config);", "await api.put(`/task-events/${eventId}`, { content, hours_spent: parseFloat(hours) || 0, event_date: date, start_time, end_time }, config);")
text = text.replace("Failed to update note", "Failed to update event")

text = text.replace("const handleNoteDelete = async (noteId) => {", "const handleEventDelete = async (eventId) => {")
text = text.replace("Are you sure you want to delete this note?", "Are you sure you want to delete this event?")
text = text.replace("await api.delete(`/task-notes/${noteId}`, config);", "await api.delete(`/task-events/${eventId}`, config);")
text = text.replace("Failed to delete note", "Failed to delete event")

text = text.replace("<h3>Notes & History</h3>", "<h3>Events & Time Log</h3>")

note_ui_block = """                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Events & Time Log
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                            <textarea
                                placeholder="Add a new event or time entry..."
                                value={newEventContent}
                                onChange={(e) => setNewEventContent(e.target.value)}
                                className="form-input"
                                style={{
                                    flex: 1,
                                    resize: 'vertical',
                                    background: 'var(--bg-dark)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--border)',
                                    fontSize: '1rem',
                                    padding: '1rem'
                                }}
                                rows={3}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="form-input"
                                    title="Event Date"
                                    style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="time"
                                        value={eventStartTime}
                                        onChange={(e) => setEventStartTime(e.target.value)}
                                        className="form-input"
                                        title="Start Time"
                                        style={{ width: '50%', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Hrs"
                                        min="0"
                                        step="0.25"
                                        value={eventHours}
                                        onChange={(e) => setEventHours(e.target.value)}
                                        className="form-input"
                                        title="Time Spent (Hours)"
                                        style={{ width: '50%', background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem' }}
                                    />
                                </div>
                                <button onClick={handleEventSubmit} className="btn btn-secondary" disabled={!newEventContent.trim()}>
                                    Log Event
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {events.length === 0 && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No events logged yet.</div>}
                            {events.map(event => (
                                <EventItem
                                    key={event.id}
                                    eventObj={event}
                                    onUpdate={handleEventUpdate}
                                    onDelete={handleEventDelete}
                                    currentUserId={user ? user.id : null}
                                />
                            ))}
                        </div>
                    </div>"""

# Replace the giant note UI block with regex
text = re.sub(
    r"<div style=\{\{ marginTop: '2rem', padding: '1\.5rem'.*?<h3>Notes & History</h3>.*?</div>\s*</div>\s*</div>\s*\)\}\s*</div>",
    note_ui_block + "\n            )}\n        </div>",
    text,
    flags=re.DOTALL
)

# And now replace the NoteItem component with EventItem component
event_item_block = """
// Sub-component for individual event to handle edit state
const EventItem = ({ eventObj, onUpdate, onDelete, currentUserId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(eventObj.content);
    const [editHours, setEditHours] = useState(eventObj.hours_spent);
    const [editDate, setEditDate] = useState(eventObj.event_date ? eventObj.event_date.split('T')[0] : '');
    const [editStartTime, setEditStartTime] = useState(eventObj.start_time ? eventObj.start_time.substring(0, 5) : '');

    useEffect(() => {
        setEditContent(eventObj.content);
        setEditHours(eventObj.hours_spent);
        setEditDate(eventObj.event_date ? eventObj.event_date.split('T')[0] : '');
        setEditStartTime(eventObj.start_time ? eventObj.start_time.substring(0, 5) : '');
    }, [eventObj]);

    const handleUpdate = () => {
        let endTime = null;
        if (editStartTime && parseFloat(editHours) > 0) {
            const [h, m] = editStartTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0);
            d.setMinutes(d.getMinutes() + (parseFloat(editHours) * 60));
            endTime = d.toTimeString().substring(0, 5);
        }
        onUpdate(eventObj.id, editContent, editHours, editDate, editStartTime, endTime);
        setIsEditing(false);
    };

    const showActions = (currentUserId && eventObj.user_id === currentUserId) || !eventObj.user_id;

    if (isEditing) {
        return (
            <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Edit Event Content:</label>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="form-input"
                        rows={3}
                        style={{
                            width: '100%',
                            background: 'var(--bg-dark)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            padding: '0.75rem',
                            resize: 'vertical'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Date:</label>
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Start Time:</label>
                        <input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Hours:</label>
                        <input type="number" step="0.25" value={editHours} onChange={e => setEditHours(e.target.value)} className="form-input" style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', padding: '0.5rem', width: '80px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancel</button>
                    <button onClick={handleUpdate} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Save</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.25rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{eventObj.user ? eventObj.user.username : 'Unknown'}</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>{new Date(eventObj.entry_date).toLocaleString()}</span>
                    {showActions && (
                        <>
                            <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px' }} title="Edit Event">✎</button>
                            <button onClick={() => onDelete(eventObj.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '4px' }} title="Delete Event">🗑</button>
                        </>
                    )}
                </div>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-main)' }}>{eventObj.content}</div>
            
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                    📅 {new Date(eventObj.event_date).toLocaleDateString()}
                </div>
                {eventObj.hours_spent > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', color: 'var(--primary)' }}>
                        ⏱ {eventObj.hours_spent} hrs
                        {eventObj.start_time && ` (${eventObj.start_time.substring(0, 5)} - ${eventObj.end_time ? eventObj.end_time.substring(0, 5) : '?'})`}
                    </div>
                )}
            </div>
        </div>
    );
};
"""

text = re.sub(
    r"// Sub-component for individual note to handle edit state.*?const NoteItem =.*?};",
    event_item_block,
    text,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Updated TaskFormV2.jsx")
