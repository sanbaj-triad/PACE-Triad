import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './AiCommandBar.css';

const AiCommandBar = () => {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Dropdown Data
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        if (draft) {
             Promise.all([
                 api.get('/customers/'),
                 api.get('/users/'),
                 api.get('/locations/')
             ]).then(([c, u, l]) => {
                 setCustomers(c || []);
                 setUsers(u || []);
                 setLocations(l || []);
             }).catch(console.error);
        }
    }, [draft]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!prompt.trim()) return;
        
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/ai/generate-draft', {
                prompt: prompt
            });
            setDraft(response);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to generate AI draft.");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (key, value) => {
        setDraft(prev => ({
            ...prev,
            draft_data: {
                ...prev.draft_data,
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            let endpoint = "";
            let payload = { ...draft.draft_data };
            
            if (draft.intent === "Project") {
                endpoint = "/projects/";
            } else if (draft.intent === "Lead") {
                endpoint = "/leads/";
            } else if (draft.intent === "Invoice") {
                endpoint = "/invoices/";
            } else if (draft.intent === "Task") {
                // Task routes typically require project_id etc
                if(!payload.project_id) {
                    throw new Error("Missing Project ID. AI could not guess it.");
                }
                endpoint = "/tasks/";
            } else if (draft.intent === "User") {
                endpoint = "/users/";
            } else {
                throw new Error("Unknown intent: " + draft.intent);
            }
            
            // Clean empty strings out of the payload globally so FastAPI parsing doesn't crash on Optional ints/floats
            Object.keys(payload).forEach(key => {
                if (payload[key] === "" || (key.endsWith('_id') && (payload[key] === 0 || payload[key] === "0"))) {
                    payload[key] = null;
                } else if (typeof payload[key] === 'string' && payload[key].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    // Convert MM/DD/YYYY to YYYY-MM-DD
                    const parts = payload[key].split('/');
                    payload[key] = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
            });

            await api.post(endpoint, payload);
            
            setPrompt("");
            setDraft(null);
            alert(`AI successfully created a new ${draft.intent}!`);
            window.location.reload(); 
        } catch(err) {
            console.error(err);
            setError(err.message || err.response?.data?.detail || "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ai-cmd-container">
            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                <input 
                    className="ai-cmd-input"
                    type="text" 
                    placeholder="AI: 'Create a lead for John Doe...'" 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !prompt} className="ai-cmd-btn">
                    {loading ? "..." : "✨"}
                </button>
            </form>
            {error && !draft && <div style={{position: 'absolute', top: '100%', left: '0.5rem', color:'var(--danger)', fontSize: '0.8rem', marginTop: '4px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--danger)'}}>{String(error)}</div>}
            {draft && (
                <div className="ai-draft-modal-overlay">
                    <div className="ai-draft-modal-content">
                        <h3>Review AI Draft: {draft.intent} </h3>
                        <p style={{fontStyle:'italic', color: 'var(--text-muted)'}}>{draft.explanation}</p>
                        
                        {error && <div style={{color:'var(--danger)', margin:'1rem 0'}}>{String(error)}</div>}
                        
                        <div className="ai-draft-fields">
                            {Object.entries(draft.draft_data).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.8rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                        {key.replace('_', ' ')}
                                        {draft.display_names && draft.display_names[key] ? ` (${draft.display_names[key]})` : ''}
                                    </label>
                                    {key === 'customer_id' ? (
                                        <select 
                                            style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                            value={val || ""}
                                            onChange={e => handleFieldChange(key, parseInt(e.target.value) || "")}
                                        >
                                            <option value="">-- Select Customer --</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    ) : key === 'location_id' ? (
                                        <select 
                                            style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                            value={val || ""}
                                            onChange={e => handleFieldChange(key, parseInt(e.target.value) || "")}
                                        >
                                            <option value="">-- All Sites / No Specific Location --</option>
                                            {locations
                                                .filter(l => !draft.draft_data.customer_id || l.customer_id === parseInt(draft.draft_data.customer_id))
                                                .map(l => <option key={l.id} value={l.id}>{l.name} {l.customer_id ? '' : ''}</option>)
                                            }
                                        </select>
                                    ) : ['poc_id', 'customer_contact_id', 'assigned_to', 'manager_id', 'user_id', 'created_by_id', 'updated_by_id', 'employee_id'].includes(key) ? (
                                        <select 
                                            style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                            value={val || ""}
                                            onChange={e => handleFieldChange(key, parseInt(e.target.value) || "")}
                                        >
                                            <option value="">-- Select User --</option>
                                            {users
                                                .filter(u => key === 'customer_contact_id' ? (draft.draft_data.customer_id ? u.customer_id == parseInt(draft.draft_data.customer_id) : !u.is_employee) : true)
                                                .map(u => <option key={u.id} value={u.id}>{u.username} {u.first_name ? `(${u.first_name} ${u.last_name || ''})` : ''}</option>)
                                            }
                                        </select>
                                    ) : (
                                        <input 
                                            style={{ padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-dark)', color: 'var(--text-main)' }}
                                            type={key.includes('date') ? 'date' : 'text'} 
                                            value={val || ""} 
                                            onChange={e => handleFieldChange(key, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => setDraft(null)} className="btn-secondary" disabled={saving}>Cancel</button>
                            <button onClick={handleSave} className="btn-primary" disabled={saving}>
                                {saving ? "Saving..." : "Approve & Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiCommandBar;
