import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import MilestoneForm from './MilestoneForm';

const MilestoneList = ({ projectId, project }) => {
    const [milestones, setMilestones] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [sortField, setSortField] = useState('milestone_number');
    const [sortOrder, setSortOrder] = useState('asc');
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [editBuffer, setEditBuffer] = useState({});
    const [savingBulk, setSavingBulk] = useState(false);

    const fetchMilestones = async () => {
        try {
            const data = await api.get(`/projects/${projectId}/milestones/`);
            setMilestones(data);
        } catch (err) {
            console.error("Failed to load milestones", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const usersData = await api.get('/users/');
                setUsers(usersData);
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitial();
        fetchMilestones();
    }, [projectId]);

    const handleCreate = () => {
        setEditingMilestone(null);
        setIsFormOpen(true);
    };

    const handleEdit = (milestone) => {
        setEditingMilestone(milestone);
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this milestone?")) return;
        try {
            await api.delete(`/milestones/${id}`);
            fetchMilestones();
        } catch (err) {
            console.error("Failed to delete milestone", err);
            alert("Failed to delete milestone");
        }
    };

    const handleSave = () => {
        fetchMilestones();
        setIsFormOpen(false);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const toggleBulkEdit = () => {
        if (!isBulkEditing) {
            setIsBulkEditing(true);
            setEditBuffer({});
        } else {
            setIsBulkEditing(false);
            setEditBuffer({});
        }
    };

    const handleBulkChange = (id, field, value) => {
        setEditBuffer(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    const handleBulkSave = async () => {
        setSavingBulk(true);
        try {
            const updates = Object.keys(editBuffer).map(id => ({
                id: parseInt(id),
                ...editBuffer[id]
            }));
            if (updates.length > 0) {
                await Promise.all(updates.map(u => {
                    const { id, ...data } = u;
                    return api.put(`/milestones/${id}`, data);
                }));
                await fetchMilestones();
            }
            setIsBulkEditing(false);
            setEditBuffer({});
        } catch (err) {
            console.error("Failed to save bulk edits", err);
            alert("Failed to save bulk edits.");
        } finally {
            setSavingBulk(false);
        }
    };

    const sortedMilestones = [...milestones].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Derived
        if (sortField === 'owner') {
            aValue = a.owner?.username || '';
            bValue = b.owner?.username || '';
        } else if (sortField === 'status') {
            aValue = !!a.invoice_id ? 'Billed' : (a.is_completed ? 'Done' : 'In Progress');
            bValue = !!b.invoice_id ? 'Billed' : (b.is_completed ? 'Done' : 'In Progress');
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading) return <div>Loading Milestones...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>Milestones</h3>
                    <button
                        onClick={toggleBulkEdit}
                        style={{
                            background: isBulkEditing ? 'var(--primary)' : 'transparent',
                            color: isBulkEditing ? 'white' : 'var(--text-muted)',
                            padding: '0.25rem 0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                        }}
                        title="Bulk Edit Mode"
                        disabled={savingBulk}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isBulkEditing && (
                        <>
                            <button onClick={toggleBulkEdit} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} disabled={savingBulk}>Cancel</button>
                            <button onClick={handleBulkSave} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#10b981', borderColor: '#10b981' }} disabled={savingBulk || Object.keys(editBuffer).length === 0}>
                                {savingBulk ? 'Saving...' : `Save All Changes`}
                            </button>
                        </>
                    )}
                    <button onClick={handleCreate} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} disabled={isBulkEditing || savingBulk}>+ Add Milestone</button>
                </div>
            </div>

            {milestones.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No milestones yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('milestone_number')} style={{ cursor: 'pointer', width: '200px' }}>Name {sortField === 'milestone_number' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Type</th>
                                <th onClick={() => handleSort('owner')} style={{ cursor: 'pointer' }}>Owner {sortField === 'owner' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('start_date')} style={{ cursor: 'pointer' }}>Start Date {sortField === 'start_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>Due Date {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('budget_hours')} style={{ cursor: 'pointer' }}>Budget Hrs {sortField === 'budget_hours' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th style={{ width: '130px' }}>Progress</th>
                                <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>Cost {sortField === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMilestones.map((m) => {
                                const isFullyBilled = (m.cost > 0 && (m.remaining_amount <= 0.01));
                                const isPartiallyBilled = ((m.total_billed || 0) > 0 && !isFullyBilled);

                                return (
                                    <Fragment key={m.id}>
                                        <tr style={{ background: editBuffer[m.id] ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}>
                                            <td className="font-medium">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {isBulkEditing ? (
                                                        <input 
                                                            type="number" 
                                                            value={editBuffer[m.id]?.milestone_number !== undefined ? editBuffer[m.id].milestone_number : (m.milestone_number || 0)} 
                                                            onChange={(e) => handleBulkChange(m.id, 'milestone_number', parseInt(e.target.value) || 0)}
                                                            style={{ width: '50px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                        />
                                                    ) : (
                                                        <span>#{m.milestone_number}</span>
                                                    )}
                                                    {isBulkEditing ? (
                                                        <input 
                                                            type="text" 
                                                            value={editBuffer[m.id]?.name !== undefined ? editBuffer[m.id].name : m.name} 
                                                            onChange={(e) => handleBulkChange(m.id, 'name', e.target.value)}
                                                            style={{ flex: 1, minWidth: '100px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                        />
                                                    ) : (
                                                        <span>{m.name}</span>
                                                    )}
                                                </div>
                                                {m.lead_id && (
                                                    <div style={{ marginTop: '4px' }}>
                                                        <a href={`/portal/leads/edit/${m.lead_id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', background: 'var(--bg-dark)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', display: 'inline-block' }}>
                                                            Linked Lead #{m.lead_id} ↗
                                                        </a>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <select value={editBuffer[m.id]?.milestone_type !== undefined ? editBuffer[m.id].milestone_type : (m.milestone_type || 'Other')} onChange={e => handleBulkChange(m.id, 'milestone_type', e.target.value)} style={{ width: '90px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                        <option value="Design">Design</option><option value="Hardware">Hardware</option><option value="Remote">Remote</option><option value="Onsite">Onsite</option><option value="PM">PM</option><option value="Support">Support</option><option value="Operations">Operations</option><option value="Internal">Internal</option><option value="Contingency">Contingency</option><option value="FIXED">FIXED</option><option value="Other">Other</option>
                                                    </select>
                                                ) : (m.milestone_type || '-')}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <select value={editBuffer[m.id]?.owner_id !== undefined ? (editBuffer[m.id].owner_id || '') : (m.owner_id || '')} onChange={e => handleBulkChange(m.id, 'owner_id', parseInt(e.target.value) || null)} style={{ width: '100px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                                        <option value="">- Owner -</option>
                                                        {users.filter(u => u.is_employee).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                                    </select>
                                                ) : (m.owner ? m.owner.username : '-')}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <input type="date" value={editBuffer[m.id]?.start_date !== undefined ? editBuffer[m.id].start_date?.split('T')[0] : (m.start_date?.split('T')[0] || '')} onChange={e => handleBulkChange(m.id, 'start_date', e.target.value || null)} style={{ width: '110px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                                ) : (m.start_date ? new Date(m.start_date).toLocaleDateString() : '-')}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <input type="date" value={editBuffer[m.id]?.due_date !== undefined ? editBuffer[m.id].due_date?.split('T')[0] : (m.due_date?.split('T')[0] || '')} onChange={e => handleBulkChange(m.id, 'due_date', e.target.value || null)} style={{ width: '110px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                                ) : (m.due_date ? (
                                                    <span style={{ fontWeight: '500', color: (() => {
                                                        const due = new Date(m.due_date); const now = new Date(); const dDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                                                        if (dDays > 7) return '#22c55e'; if (dDays <= 3 && dDays > 0) return '#eab308'; if (dDays <= 0) return '#ef4444'; return 'var(--text-main)';
                                                    })() }}>{new Date(m.due_date).toLocaleDateString()}</span>
                                                ) : '-')}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <input type="number" step="0.5" value={editBuffer[m.id]?.budget_hours !== undefined ? editBuffer[m.id].budget_hours : (m.budget_hours || '')} onChange={e => handleBulkChange(m.id, 'budget_hours', parseFloat(e.target.value) || 0)} style={{ width: '60px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                                ) : (m.budget_hours || '-')}
                                            </td>
                                            <td style={{ width: '130px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={editBuffer[m.id]?.progress !== undefined ? editBuffer[m.id].progress : (m.progress || 0)}
                                                        onChange={(e) => {
                                                            if (isBulkEditing) {
                                                                handleBulkChange(m.id, 'progress', parseInt(e.target.value));
                                                            } else {
                                                                setMilestones(prev => prev.map(im => im.id === m.id ? { ...im, progress: parseInt(e.target.value) } : im));
                                                            }
                                                        }}
                                                        onMouseUp={async (e) => {
                                                            if (isBulkEditing) return;
                                                            const newProgress = parseInt(e.target.value);
                                                            try { await api.put(`/milestones/${m.id}`, { progress: newProgress }); } catch (error) { fetchMilestones(); }
                                                        }}
                                                        onTouchEnd={async (e) => {
                                                            if (isBulkEditing) return;
                                                            const newProgress = parseInt(e.target.value);
                                                            try { await api.put(`/milestones/${m.id}`, { progress: newProgress }); } catch (error) { fetchMilestones(); }
                                                        }}
                                                        style={{ width: '70px', accentColor: (() => { const p = editBuffer[m.id]?.progress !== undefined ? editBuffer[m.id].progress : (m.progress || 0); if (p > 75) return '#22c55e'; if (p > 50) return '#eab308'; if (p > 25) return '#f97316'; return '#ef4444'; })(), cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '0.8em', fontWeight: 'bold', minWidth: '35px', textAlign: 'right', color: (() => { const p = editBuffer[m.id]?.progress !== undefined ? editBuffer[m.id].progress : (m.progress || 0); if (p > 75) return '#22c55e'; if (p > 50) return '#eab308'; if (p > 25) return '#f97316'; return '#ef4444'; })() }}>{editBuffer[m.id]?.progress !== undefined ? editBuffer[m.id].progress : (m.progress || 0)}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <input type="number" step="0.01" value={editBuffer[m.id]?.cost !== undefined ? editBuffer[m.id].cost : (m.cost || 0)} onChange={e => handleBulkChange(m.id, 'cost', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                                                ) : (
                                                    <>
                                                        <div style={{ fontSize: '0.9em' }}>${m.cost?.toLocaleString()}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Billed: ${(m.total_billed || 0).toLocaleString()}</div>
                                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '2px', borderRadius: '2px' }}>
                                                            <div style={{ width: `${Math.min(100, ((m.total_billed || 0) / (m.cost || 1)) * 100)}%`, height: '100%', background: isFullyBilled ? 'var(--success)' : 'var(--primary)', borderRadius: '2px' }}></div>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                {isBulkEditing ? (
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                        <input type="checkbox" checked={editBuffer[m.id]?.is_completed !== undefined ? editBuffer[m.id].is_completed : (m.is_completed || false)} onChange={e => handleBulkChange(m.id, 'is_completed', e.target.checked)} />
                                                        Done
                                                    </label>
                                                ) : (
                                                    isFullyBilled ? <span className="status-badge" style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' }}>Billed</span> :
                                                    isPartiallyBilled ? <span className="status-badge" style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)' }}>Partial</span> :
                                                    m.is_completed ? <span className="status-badge" style={{ color: 'var(--info)', background: 'rgba(59, 130, 246, 0.1)' }}>Done</span> :
                                                    <span className="status-badge" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>In Progress</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {m.audits && m.audits.length > 0 && m.audits.filter(a => a.action === 'Billed').map(a => (
                                                        a.invoice_id ? (
                                                            <Link key={a.id} to={`/portal/invoices/${a.invoice_id}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                                                {a.invoice_number} (${a.amount?.toLocaleString()})
                                                            </Link>
                                                        ) : (
                                                            <span key={a.id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {a.invoice_number} (${a.amount?.toLocaleString()}) (Deleted)
                                                            </span>
                                                        )
                                                    ))}

                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '0.25rem' }}>
                                                        <button onClick={() => handleEdit(m)} title="Edit Milestone" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                        {!isFullyBilled && !isPartiallyBilled &&
                                                            <button onClick={() => handleDelete(m.id)} title="Delete Milestone" style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        }
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {m.tasks && m.tasks.length > 0 && (
                                            <tr style={{ background: 'var(--bg-dark)' }}>
                                                <td colSpan="8" style={{ padding: '0.75rem 2rem', borderTop: 'none' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Associated Tasks:</div>
                                                    <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                                                        {m.tasks.map(t => {
                                                            const tHours = t.total_hours_spent || 0;
                                                            const tEst = t.estimated_effort || 0;
                                                            return (
                                                                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                    <div>
                                                                        <Link to={`/portal/tasks/edit/${t.id}`} style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}>{t.description}</Link>
                                                                        <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned: {t.task_type === 'FIXED' ? 'Global (All Staff)' : (t.assigned_to?.username || 'Unassigned')}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.8rem' }} className="status-badge">{t.status} ({t.progress}%)</span>
                                                                        <span style={{ fontSize: '0.8rem', minWidth: '90px', textAlign: 'right', fontWeight: 500 }}>
                                                                            {tHours} / {tEst > 0 ? tEst : '?'} hrs
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <MilestoneForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                project={project || { id: projectId }}
                milestone={editingMilestone}
                onSave={handleSave}
            />
        </div>
    );
};

export default MilestoneList;
