import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

const LeadToMilestoneModal = ({ isOpen, onClose, lead, onSuccess }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(true);

    const [formData, setFormData] = useState({
        parent_project_id: '',
        name: '',
        description: '',
        cost: '',
        due_date: '',
        owner_id: '',
        milestone_type: ''
    });

    useEffect(() => {
        if (isOpen && lead) {
            setFormData({
                parent_project_id: '',
                name: lead.name || '',
                description: lead.description || '',
                cost: lead.estimated_value || '',
                due_date: lead.due_date ? lead.due_date.split('T')[0] : '',
                owner_id: lead.poc_id || '',
                milestone_type: lead.project_type || 'Other'
            });

            const fetchProjects = async () => {
                setFetchingProjects(true);
                try {
                    const data = await api.get('/projects/');
                    setProjects(data);
                } catch (err) {
                    console.error("Failed to fetch projects", err);
                } finally {
                    setFetchingProjects(false);
                }
            };
            fetchProjects();
        }
    }, [isOpen, lead]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (payload.parent_project_id) payload.parent_project_id = parseInt(payload.parent_project_id);
            if (payload.owner_id) payload.owner_id = parseInt(payload.owner_id);
            else payload.owner_id = null;
            if (payload.cost) payload.cost = parseFloat(payload.cost);
            else payload.cost = null;
            
            payload.due_date = payload.due_date || null;

            const res = await api.post(`/leads/${lead.id}/convert-to-milestone`, payload);
            if (onSuccess) onSuccess(res);
        } catch (err) {
            console.error("Failed to convert lead to milestone", err);
            alert(err.response?.data?.detail || "Failed to convert lead to milestone");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '8px',
                width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
            }} className="card">
                <h3 style={{ marginTop: 0 }}>Convert Lead to Milestone</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Convert "{lead?.name}" into a Milestone inside an existing Project.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Parent Project *</label>
                        <select 
                            name="parent_project_id" 
                            value={formData.parent_project_id} 
                            onChange={handleChange} 
                            required 
                            className="form-input"
                            disabled={fetchingProjects}
                        >
                            <option value="">-- Select Master Project --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>
                                    P-{p.id} {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Milestone Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Cost / Value ($)</label>
                        <input
                            type="number"
                            name="cost"
                            value={formData.cost}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="date"
                            name="due_date"
                            value={formData.due_date}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !formData.parent_project_id} className="btn btn-primary">
                            {loading ? "Converting..." : "Convert"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadToMilestoneModal;
