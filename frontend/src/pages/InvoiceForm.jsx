import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

const InvoiceForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const initialProjectId = queryParams.get('project_id') || '';

    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState(initialProjectId);
    const [milestones, setMilestones] = useState([]);
    const [selectedMilestones, setSelectedMilestones] = useState(new Set());
    const [billingDetails, setBillingDetails] = useState({}); // { [id]: { amount: 0, percentage: 0 } }
    const [loading, setLoading] = useState(false);
    const [fetchingMilestones, setFetchingMilestones] = useState(false);

    const [selectedProject, setSelectedProject] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Return all projects to ensure we can bill ongoing ones
                const data = await api.get('/projects/');
                setProjects(data);
            } catch (err) {
                console.error("Failed to fetch projects");
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        if (!projectId) {
            setMilestones([]);
            setSelectedProject(null);
            return;
        }

        const fetchProjectDetails = async () => {
            let proj = projects.find(p => p.id === parseInt(projectId));
            if (!proj) {
                try {
                    proj = await api.get(`/projects/${projectId}`);
                } catch (e) { console.error(e) }
            }
            setSelectedProject(proj);
        };
        fetchProjectDetails();

        const fetchMilestones = async () => {
            setFetchingMilestones(true);
            try {
                const data = await api.get(`/projects/${projectId}/milestones/`);
                // Filter only milestones with remaining balance
                let unbilled = data.filter(m => (m.remaining_amount === undefined || m.remaining_amount > 0.1));
                
                // Sort by project milestone_number natively
                unbilled.sort((a, b) => {
                    const diff = (a.milestone_number || 0) - (b.milestone_number || 0);
                    if (diff !== 0) return diff;
                    return (a.id || 0) - (b.id || 0); // fallback to ID
                });
                
                setMilestones(unbilled);
                setSelectedMilestones(new Set());
                setBillingDetails({});
            } catch (err) {
                console.error("Failed to fetch milestones");
            } finally {
                setFetchingMilestones(false);
            }
        };
        fetchMilestones();
    }, [projectId, projects]);

    const handleCheckboxChange = (m) => {
        const newSelected = new Set(selectedMilestones);

        // If unchecking
        if (newSelected.has(m.id)) {
            newSelected.delete(m.id);
            const newDetails = { ...billingDetails };
            delete newDetails[m.id];
            setBillingDetails(newDetails);
            setSelectedMilestones(newSelected);
            return;
        }

        // If checking
        if (selectedProject && !selectedProject.is_master_po) {
            let currentPO = null;
            if (newSelected.size > 0) {
                const firstId = Array.from(newSelected)[0];
                const firstM = milestones.find(mil => mil.id === firstId);
                if (firstM) currentPO = firstM.milestone_po;
            }

            if (newSelected.size > 0 && m.milestone_po !== currentPO) {
                alert(`Cannot bundle milestones with different POs.\nCurrent Batch PO: ${currentPO || 'None'}\nThis Milestone PO: ${m.milestone_po || 'None'}`);
                return;
            }
        }

        newSelected.add(m.id);

        // Init billing details with full remaining amount
        const remaining = m.remaining_amount !== undefined ? m.remaining_amount : (m.cost || 0);
        setBillingDetails(prev => ({
            ...prev,
            [m.id]: { amount: remaining, percentage: 100 } // Default to full remaining items which might be less than 100% of total cost generally, but 100% of 'remaining'
        }));

        setSelectedMilestones(newSelected);
    };

    const handleAmountChange = (e, m) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0;
        // Round input immediately to 2 decimals to avoid long float issues
        val = Math.round(val * 100) / 100;

        const remaining = m.remaining_amount !== undefined ? m.remaining_amount : (m.cost || 0);

        if (val > remaining) val = remaining;
        if (val < 0) val = 0;

        // Calculate percentage of REMAINING
        const pctBase = remaining;
        const pct = pctBase > 0 ? (val / pctBase) * 100 : 0;

        setBillingDetails(prev => ({
            ...prev,
            [m.id]: { ...prev[m.id], amount: val, percentage: pct }
        }));
    };

    const handlePercentChange = (e, m) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        if (val > 100) val = 100;
        if (val < 0) val = 0;

        const remaining = m.remaining_amount !== undefined ? m.remaining_amount : (m.cost || 0);
        let amount = (remaining * val) / 100;

        // Round calculated amount to 2 decimals
        amount = Math.round(amount * 100) / 100;

        setBillingDetails(prev => ({
            ...prev,
            [m.id]: { ...prev[m.id], percentage: val, amount: amount }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectId) return;

        setLoading(true);
        try {
            if (selectedMilestones.size > 0) {
                // Generate from Milestones
                const items = Array.from(selectedMilestones).map(id => ({
                    milestone_id: id,
                    amount: billingDetails[id]?.amount
                }));

                const payload = {
                    project_id: parseInt(projectId),
                    items: items,
                    invoice_number: 'AUTO',
                    issue_date: new Date().toISOString()
                };
                await api.post('/invoices/generate', payload);
            } else {
                // Create Empty Invoice
                await api.post('/invoices/', { project_id: parseInt(projectId) });
            }
            navigate('/portal/invoices');
        } catch (err) {
            console.error("Failed to create invoice", err);
            alert("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>New Invoice</h2>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Select Project</label>
                        {initialProjectId ? (
                            <div style={{ padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                {selectedProject ? `${selectedProject.name} (${selectedProject.project_unique_id})` : 'Loading Project...'}
                            </div>
                        ) : (
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                required
                            >
                                <option value="">-- Choose a Project --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.project_unique_id})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {projectId && (
                        <div style={{ marginTop: '2rem' }}>
                            <h3>Available Milestones</h3>
                            {fetchingMilestones ? (
                                <p>Loading milestones...</p>
                            ) : milestones.length === 0 ? (
                                <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                                    No billable milestones found for this project.
                                </div>
                            ) : (
                                <div className="grid-container" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                    {milestones.map(m => {
                                        const isSelected = selectedMilestones.has(m.id);
                                        const details = billingDetails[m.id] || { amount: 0, percentage: 0 };

                                        return (
                                            <div key={m.id}
                                                style={{
                                                    display: 'flex', flexDirection: 'column',
                                                    padding: '1rem', background: 'var(--bg-dark)',
                                                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => {
                                                    // Prevent click if targeting input
                                                    if (e.target.tagName !== 'INPUT') handleCheckboxChange(m);
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCheckboxChange(m)}
                                                        style={{ width: 'auto' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span className="font-medium">#{m.milestone_number} {m.name}</span>
                                                            {m.milestone_po && <span style={{ fontSize: '0.8rem', background: '#333', padding: '2px 6px', borderRadius: '4px' }}>PO: {m.milestone_po}</span>}
                                                            <span>${(m.cost || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                                            <span>Due: {m.due_date ? new Date(m.due_date).toLocaleDateString() : 'N/A'}</span>
                                                            <span>Remaining: ${(m.remaining_amount || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div style={{
                                                        marginTop: '1rem',
                                                        padding: '0.5rem',
                                                        borderTop: '1px solid var(--border)',
                                                        display: 'flex', gap: '1rem', alignItems: 'center'
                                                    }} onClick={e => e.stopPropagation()}>
                                                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                                            <label style={{ fontSize: '0.8rem' }}>Amount ($)</label>
                                                            <input
                                                                type="number"
                                                                value={details.amount}
                                                                onChange={(e) => handleAmountChange(e, m)}
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0, width: '100px' }}>
                                                            <label style={{ fontSize: '0.8rem' }}>% of Total</label>
                                                            <input
                                                                type="number"
                                                                value={Math.round(details.percentage)}
                                                                onChange={(e) => handlePercentChange(e, m)}
                                                                step="1"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={() => navigate('/portal/invoices')} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : (selectedMilestones.size > 0 ? `Generate Invoice ($${Array.from(selectedMilestones).reduce((sum, id) => sum + (billingDetails[id]?.amount || 0), 0).toLocaleString()})` : 'Create Empty Invoice')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceForm;
