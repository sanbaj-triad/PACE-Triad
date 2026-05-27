import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';

export default function ExpenseForm({ projectId: initialProjectId, expense: editExpense, onSave, onCancel }) {
    const params = useParams();
    const navigate = useNavigate();
    
    const id = editExpense ? editExpense.id : params.id;
    const isEdit = Boolean(id);
    const isEmbedded = Boolean(initialProjectId) || Boolean(onSave) || Boolean(editExpense);
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    
    const [formData, setFormData] = useState({
        expense_type: 'Hardware',
        date_time: new Date().toISOString().slice(0,16),
        amount: '',
        merchant_name: '',
        billable: true,
        project_id: initialProjectId || '',
        milestone_id: '',
        user_id: '',
        notes: ''
    });

    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [parsingAI, setParsingAI] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (!initialProjectId) {
                    const projData = await api.get('/projects/');
                    setProjects(projData);
                }
                const usersData = await api.get('/users/');
                setUsers(usersData);

                if (editExpense) {
                    setFormData(prev => ({
                        ...prev,
                        expense_type: editExpense.expense_type,
                        date_time: editExpense.date_time ? editExpense.date_time.slice(0,16) : new Date().toISOString().slice(0,16),
                        amount: editExpense.amount ? parseFloat(editExpense.amount).toFixed(2) : '',
                        merchant_name: editExpense.merchant_name || '',
                        billable: editExpense.billable,
                        project_id: editExpense.project_id,
                        milestone_id: editExpense.milestone_id || '',
                        user_id: editExpense.user_id || '',
                        notes: editExpense.notes || ''
                    }));
                    if (editExpense.project_id) {
                        fetchMilestones(editExpense.project_id);
                    }
                } else if (isEdit && !editExpense) {
                    // Placeholder if they route directly to edit URI in future updates
                } else {
                    if (initialProjectId) {
                        fetchMilestones(initialProjectId);
                    }
                    setFormData(prev => ({
                        ...prev,
                        user_id: currentUser.id || ''
                    }));
                }
            } catch (err) {
                console.error("Failed to load initial form data", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, initialProjectId, isEdit, editExpense]);

    const fetchMilestones = async (pid) => {
        try {
            const data = await api.get(`/projects/${pid}`);
            setMilestones(data.milestones || []);
        } catch (err) {
            console.error("Failed to fetch project details for milestones", err);
        }
    };

    const handleProjectChange = (e) => {
        const pid = e.target.value;
        setFormData({ ...formData, project_id: pid, milestone_id: '' });
        if (pid) fetchMilestones(pid);
        else setMilestones([]);
    };

    const handleDownload = async (attachment) => {
        try {
            const response = await fetch(`/attachments/${attachment.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch file");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', attachment.filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch(err) {
            console.error("Download failed", err);
            alert("Failed to download file.");
        }
    };

    const handleFileUploadChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadFile(file);

        if (file.type.startsWith('image/')) {
            setParsingAI(true);
            const scanData = new FormData();
            scanData.append('file', file);
            
            try {
                const result = await api.post('/expenses/parse-receipt', scanData);
                setFormData(prev => ({
                    ...prev,
                    amount: result.amount ? parseFloat(result.amount).toFixed(2) : prev.amount,
                    merchant_name: result.merchant_name || prev.merchant_name,
                    date_time: result.date_time ? result.date_time.slice(0, 16) : prev.date_time,
                    notes: result.notes || prev.notes,
                    expense_type: result.expense_type || prev.expense_type
                }));
            } catch (err) {
                console.error("Failed to parse receipt with AI", err);
                const msg = err.response?.data?.detail || err.message;
                if (!msg.includes('image files')) {
                     alert("AI Scan Notice: " + msg);
                }
            } finally {
                setParsingAI(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                expense_type: formData.expense_type,
                date_time: formData.date_time,
                amount: parseFloat(formData.amount) || 0,
                merchant_name: formData.merchant_name,
                billable: formData.billable,
                milestone_id: formData.milestone_id ? parseInt(formData.milestone_id) : null,
                user_id: formData.user_id ? parseInt(formData.user_id) : null,
                notes: formData.notes
            };

            const targetProjectId = formData.project_id;
            if (!targetProjectId) {
                alert("Please select a project.");
                setSaving(false);
                return;
            }

            let newExpense;
            if (isEdit) {
                newExpense = await api.put(`/expenses/${id}`, payload);
            } else {
                newExpense = await api.post(`/projects/${targetProjectId}/expenses`, payload);
            }

            // Upload Attachment if attached
            if (uploadFile) {
                const formFile = new FormData();
                formFile.append('file', uploadFile);
                await api.post(`/expenses/${newExpense.id}/attachments`, formFile);
            }

            if (onSave) {
                onSave(newExpense);
            } else {
                navigate('/portal/expenses');
            }
        } catch (err) {
            console.error("Failed to save expense", err);
            alert("Error: " + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading form...</div>;

    const isLocked = editExpense && (editExpense.status === 'Locked' || editExpense.status === 'Approved');

    return (
        <div className={isEmbedded ? "" : "card mx-auto"} style={{ maxWidth: isEmbedded ? '100%' : '600px', padding: isEmbedded ? 0 : '2rem' }}>
            {!isEmbedded && <h2>{isEdit ? 'Edit Expense' : 'Log New Expense'}</h2>}
            
            {!isEdit && (
                <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '1px dashed #a855f7', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            <h3 style={{ margin: 0, color: '#9333ea', fontSize: '1.1rem' }}>AI Receipt Scanner ✨</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Upload a photo of your receipt to instantly pre-fill this form!</p>
                        
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <input 
                                type="file" 
                                onChange={handleFileUploadChange}
                                style={{ width: '100%', maxWidth: '250px' }}
                                id="ai-scanner-input"
                            />
                            {parsingAI && <span style={{ color: '#a855f7', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                                Parsing...
                            </span>}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: isEmbedded ? 0 : '1rem' }}>
                {isLocked && (
                    <div style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                        This expense has been approved and is locked from further edits.
                    </div>
                )}
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!initialProjectId && (
                    <div className="form-group">
                        <label>Project *</label>
                        <select 
                            className="form-input" 
                            value={formData.project_id} 
                            onChange={handleProjectChange}
                            required
                            disabled={isEdit}
                        >
                            <option value="">-- Select Project --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.project_unique_id})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Expense Type</label>
                        <select 
                            className="form-input" 
                            value={formData.expense_type} 
                            onChange={e => setFormData({...formData, expense_type: e.target.value})}
                            required
                        >
                            <option value="Hardware">Hardware</option>
                            <option value="T&E">T&E (General)</option>
                            <option value="Meal">Meal</option>
                            <option value="Parking">Parking</option>
                            <option value="Hotel">Hotel</option>
                            <option value="Flight">Flight</option>
                            <option value="Car Rental">Car Rental</option>
                            <option value="Shipping">Shipping</option>
                            <option value="Software">Software</option>
                            <option value="Contractor">Contractor</option>
                            <option value="Tools">Tools</option>
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Date & Time</label>
                        <input 
                            type="datetime-local" 
                            className="form-input" 
                            value={formData.date_time} 
                            onChange={e => setFormData({...formData, date_time: e.target.value})}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Merchant Name</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        value={formData.merchant_name} 
                        onChange={e => setFormData({...formData, merchant_name: e.target.value})}
                        placeholder="e.g. Delta Airlines, Home Depot"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Amount ($)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            className="form-input" 
                            value={formData.amount} 
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                            onBlur={e => {
                                if (e.target.value) {
                                    setFormData({...formData, amount: parseFloat(e.target.value).toFixed(2)});
                                }
                            }}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Milestone (Optional)</label>
                        <select 
                            className="form-input" 
                            value={formData.milestone_id} 
                            onChange={e => setFormData({...formData, milestone_id: e.target.value})}
                        >
                            <option value="">-- No Milestone --</option>
                            {milestones.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Assigned User</label>
                        <select 
                            className="form-input" 
                            value={formData.user_id} 
                            onChange={e => setFormData({...formData, user_id: e.target.value})}
                            disabled={currentUser.role !== 'admin' && currentUser.role !== 'manager'}
                        >
                            <option value="">-- Unassigned --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                        <input 
                            type="checkbox" 
                            id="billableCheck"
                            checked={formData.billable}
                            onChange={e => setFormData({...formData, billable: e.target.checked})}
                        />
                        <label htmlFor="billableCheck" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>Is this expense billable to the client?</label>
                    </div>
                </div>

                <div className="form-group">
                    <label>Receipt / Attachment (Optional)</label>
                    {editExpense?.attachments && editExpense.attachments.length > 0 && (
                        <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {editExpense.attachments.map(att => (
                                <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(att); }} style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                        {att.filename}
                                    </a>
                                    <button 
                                        type="button" 
                                        onClick={async () => {
                                            if(!confirm('Delete this attachment?')) return;
                                            try {
                                                await api.delete(`/attachments/${att.id}`);
                                                if(onSave) onSave(); // Trigger prop refresh to bubble state update
                                            } catch(err) { alert('Failed to delete attachment: ' + err.message); }
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
                                        title="Delete Attachment"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input 
                            type="file" 
                            className="form-input" 
                            onChange={handleFileUploadChange}
                            style={{ padding: '0.5rem', flex: 1 }}
                        />
                        {parsingAI && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✨ Analyzing...</span>}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Uploading an image will automatically try to prefill form fields with AI OCR.</small>
                </div>

                <div className="form-group">
                    <label>Notes / Description</label>
                    <textarea 
                        className="form-input" 
                        rows="3"
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        placeholder="Details about this expense..."
                    ></textarea>
                </div>
                </fieldset>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => onCancel ? onCancel() : navigate(-1)}
                    >
                        {isLocked ? 'Close' : 'Cancel'}
                    </button>
                    {!isLocked && (
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Expense'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
