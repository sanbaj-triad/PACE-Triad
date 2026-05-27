import io

file_path = "c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/TaskFormV2.jsx"
with io.open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_block = """            {isEdit && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border)' }}>
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
                </div>
            )}
"""

# Lines are 0-indexed, so line 506 is index 505. Line 567 is index 566.
# We replace lines 505 to 567 with new_block.
out_lines = lines[:505] + [new_block] + lines[568:]

with io.open(file_path, "w", encoding="utf-8") as f:
    f.writelines(out_lines)

print("Repaired.")
