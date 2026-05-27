import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const SmartCloneWizard = ({ isOpen, onClose, defaultLeadId = null, defaultTemplateId = null }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    
    // Selection state
    const [leads, setLeads] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedLeadId, setSelectedLeadId] = useState(defaultLeadId || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId || '');
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [aiDraft, setAiDraft] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && step === 1) {
            // Load base lookup data
            api.get('/leads/').then(setLeads).catch(console.error);
            api.get('/projects/').then(setProjects).catch(console.error);
        }
    }, [isOpen, step]);

    useEffect(() => {
        if (defaultLeadId) setSelectedLeadId(defaultLeadId);
        if (defaultTemplateId) setSelectedTemplateId(defaultTemplateId);
    }, [defaultLeadId, defaultTemplateId]);

    const handleGenerateDraft = async () => {
        if (!selectedLeadId || !selectedTemplateId) {
            setError("Please select both a Lead and a Template Project.");
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const data = await api.post('/ai/generate-smart-clone', {
                lead_id: parseInt(selectedLeadId),
                template_project_id: parseInt(selectedTemplateId)
            });
            
            // Clean up temporary IDs (add if missing)
            data.milestones = data.milestones || [];
            data.milestones.forEach((m, i) => {
                if (!m.temp_id) m.temp_id = `m_${i}`;
                m.tasks = m.tasks || [];
                m.tasks.forEach((t, j) => {
                    if (!t.temp_id) t.temp_id = `t_${i}_${j}`;
                });
            });
            
            setAiDraft(data);
            setStep(2);
        } catch (err) {
            console.error("AI Draft Generation failed", err);
            setError(err.response?.data?.detail || "AI failed to generate a draft structure. Ensure API key is valid.");
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.post('/projects/smart-clone-execute', aiDraft);
            alert("Smart Clone Successfully Initialized!");
            onClose();
            navigate(`/portal/projects/${result.id}`);
        } catch (err) {
            console.error("Execution failed", err);
            setError(err.response?.data?.detail || "Failed to execute clone sequence.");
            setLoading(false);
        }
    };

    // Deep update helper
    const updateDraftField = (field, value) => {
        setAiDraft(prev => ({ ...prev, [field]: value }));
    };

    const updateMilestone = (mIndex, field, value) => {
        const updated = { ...aiDraft };
        updated.milestones[mIndex][field] = value;
        setAiDraft(updated);
    };

    const updateTask = (mIndex, tIndex, field, value) => {
        const updated = { ...aiDraft };
        updated.milestones[mIndex].tasks[tIndex][field] = value;
        setAiDraft(updated);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                    <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🚀 AI Smart Clone Wizard
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Dynamically merge Lead requirements into an existing Template Structure.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-primary)' }}>
                    {error && (
                        <div style={{ padding: '1rem', background: 'var(--danger-light, #fee2e2)', color: 'var(--danger, #ef4444)', border: '1px solid var(--danger, #ef4444)', borderRadius: '8px', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h3 style={{ marginTop: 0 }}>Step 1: AI Parameters</h3>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Target Lead (The Context)</label>
                                <select className="form-input" value={selectedLeadId} onChange={e => setSelectedLeadId(e.target.value)}>
                                    <option value="">-- Select a Lead --</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} - Est. ${l.estimated_value}</option>
                                    ))}
                                </select>
                                <small style={{ color: 'var(--text-muted)' }}>The AI will extract budget, timeline, and descriptive context from this lead.</small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label>Template Project (The Blueprint)</label>
                                <select className="form-input" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                                    <option value="">-- Select a Project Template --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.project_unique_id} : {p.name}</option>
                                    ))}
                                </select>
                                <small style={{ color: 'var(--text-muted)' }}>The AI will copy this project's structural milestones and tasks, adjusting them to fit the Lead.</small>
                            </div>

                            <button 
                                className="btn-primary" 
                                style={{ width: '100%', padding: '0.75rem', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                onClick={handleGenerateDraft}
                                disabled={loading}
                            >
                                {loading ? '🧠 Architecting via AI...' : 'Generate Project Structure'}
                            </button>
                        </div>
                    )}

                    {step === 2 && aiDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Dashboard / Header Config */}
                            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Project Name</label>
                                    <input type="text" className="form-input" value={aiDraft.name} onChange={e => updateDraftField('name', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Total Budget Constraint ($)</label>
                                    <input type="number" className="form-input" value={aiDraft.budget} onChange={e => updateDraftField('budget', parseFloat(e.target.value))} />
                                </div>
                                <div className="form-group">
                                    <label>Project Due Date</label>
                                    <input type="date" className="form-input" value={aiDraft.due_date ? aiDraft.due_date.split('T')[0] : ''} onChange={e => updateDraftField('due_date', e.target.value)} />
                                </div>
                            </div>

                            {/* Milestones and Tasks Tree */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>Milestones & Task Structure</h3>
                                
                                {aiDraft.milestones.map((m, mIdx) => (
                                    <div key={m.temp_id} style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                        {/* Milestone Header */}
                                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 'bold', width: '40px', textAlign: 'center', color: 'var(--primary)', background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px' }}>
                                                M{mIdx + 1}
                                            </div>
                                            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                                <input type="text" className="form-input" value={m.name} onChange={e => updateMilestone(mIdx, 'name', e.target.value)} style={{ fontWeight: '600' }} />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Cost ($):</span>
                                                    <input type="number" className="form-input" value={m.cost} onChange={e => updateMilestone(mIdx, 'cost', parseFloat(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Task List */}
                                        <div style={{ padding: '1rem' }}>
                                            <table className="data-table" style={{ background: 'transparent' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '40%' }}>Task Description</th>
                                                        <th>Est. Hours</th>
                                                        <th>Start Date</th>
                                                        <th>Due Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {m.tasks.map((t, tIdx) => (
                                                        <tr key={t.temp_id}>
                                                            <td>
                                                                <input type="text" className="form-input" value={t.description} onChange={e => updateTask(mIdx, tIdx, 'description', e.target.value)} />
                                                            </td>
                                                            <td>
                                                                <input type="number" className="form-input" value={t.estimated_effort || 0} onChange={e => updateTask(mIdx, tIdx, 'estimated_effort', parseFloat(e.target.value))} />
                                                            </td>
                                                            <td>
                                                                <input type="date" className="form-input" value={t.start_date ? t.start_date.split('T')[0] : ''} onChange={e => updateTask(mIdx, tIdx, 'start_date', e.target.value)} />
                                                            </td>
                                                            <td>
                                                                <input type="date" className="form-input" value={t.due_date ? t.due_date.split('T')[0] : ''} onChange={e => updateTask(mIdx, tIdx, 'due_date', e.target.value)} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {m.tasks.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks assigned.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                {aiDraft.milestones.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                                        No Milestones drafted.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 2 && (
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Budget Allocated: </span>
                            <strong style={{ color: (aiDraft?.milestones.reduce((acc, m) => acc + (m.cost || 0), 0) !== aiDraft?.budget) ? 'var(--danger, #ef4444)' : 'var(--success, #22c55e)' }}>
                                ${aiDraft?.milestones.reduce((acc, m) => acc + (m.cost || 0), 0).toLocaleString()} / ${aiDraft?.budget?.toLocaleString()}
                            </strong>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-secondary" onClick={() => setStep(1)} disabled={loading}>&larr; Back to Config</button>
                            <button className="btn-primary" onClick={handleExecute} disabled={loading} style={{ minWidth: '150px' }}>
                                {loading ? 'Initializing...' : 'Finalize & Build Project'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartCloneWizard;
