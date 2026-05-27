import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const MilestoneForm = ({ isOpen, onClose, project, milestone, onSave }) => {
    const [formData, setFormData] = useState({
        milestone_number: '',
        name: '',
        description: '',
        start_date: '',
        due_date: '',
        cost: 0,
        progress: 0,
        owner_id: '',
        is_completed: false,
        milestone_po: '',
        milestone_type: 'Other',
        line_item_name: '',
        
        budget_hours: '',
        design_ifr_hours: '',
        design_ifc_hours: '',
        design_asbuilt_hours: '',
        hardware_expense_budget: '',
        hardware_shipping_budget: '',
        hardware_other_expense_budget: '',
        onsite_travel_expense: '',
        onsite_num_trips: '',
        onsite_num_flights: '',
        remote_plc_hours: '',
        remote_hmi_hours: '',
        remote_fat_hours: '',
        is_global_bucket: false,
        global_access_level: 'ALL',
        recurring_invoice_frequency: '',
        next_invoice_date: '',
        recurring_invoice_percentage: '',
        lead_id: ''
    });
    const [users, setUsers] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load Users and Leads
            const fetchData = async () => {
                try {
                    const [userData, leadsData] = await Promise.all([
                        api.get('/users/'),
                        api.get('/leads/')
                    ]);
                    setUsers(userData);
                    setLeads(leadsData);
                } catch (e) {
                    console.error("Failed to load users or leads", e);
                }
            };
            fetchData();

            if (milestone) {
                setFormData({
                    milestone_number: milestone.milestone_number ?? '',
                    name: milestone.name,
                    description: milestone.description || '',
                    start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '',
                    due_date: milestone.due_date ? milestone.due_date.split('T')[0] : '',
                    cost: milestone.cost || 0,
                    progress: milestone.progress || 0,
                    owner_id: milestone.owner_id || '',
                    lead_id: milestone.lead_id || '',
                    is_completed: milestone.is_completed,
                    milestone_po: milestone.milestone_po || '',
                    milestone_type: milestone.milestone_type || 'Other',
                    line_item_name: milestone.line_item_name || '',
                    budget_hours: milestone.budget_hours || '',
                    design_ifr_hours: milestone.design_ifr_hours || '',
                    design_ifc_hours: milestone.design_ifc_hours || '',
                    design_asbuilt_hours: milestone.design_asbuilt_hours || '',
                    hardware_expense_budget: milestone.hardware_expense_budget || '',
                    hardware_shipping_budget: milestone.hardware_shipping_budget || '',
                    hardware_other_expense_budget: milestone.hardware_other_expense_budget || '',
                    onsite_travel_expense: milestone.onsite_travel_expense || '',
                    onsite_num_trips: milestone.onsite_num_trips || '',
                    onsite_num_flights: milestone.onsite_num_flights || '',
                    remote_plc_hours: milestone.remote_plc_hours || '',
                    remote_hmi_hours: milestone.remote_hmi_hours || '',
                    remote_fat_hours: milestone.remote_fat_hours || '',
                    is_global_bucket: milestone.is_global_bucket || false,
                    global_access_level: milestone.global_access_level || 'ALL',
                    recurring_invoice_frequency: milestone.recurring_invoice_frequency || '',
                    next_invoice_date: milestone.next_invoice_date ? milestone.next_invoice_date.split('T')[0] : '',
                    recurring_invoice_percentage: milestone.recurring_invoice_percentage || ''
                });
            } else {
                // Reset form
                setFormData({
                    milestone_number: '',
                    name: '',
                    description: '',
                    start_date: '',
                    due_date: '',
                    cost: 0,
                    progress: 0,
                    owner_id: '',
                    lead_id: '',
                    is_completed: false,
                    milestone_po: '',
                    milestone_type: 'Other',
                    line_item_name: '',
                    budget_hours: '',
                    design_ifr_hours: '',
                    design_ifc_hours: '',
                    design_asbuilt_hours: '',
                    hardware_expense_budget: '',
                    hardware_shipping_budget: '',
                    hardware_other_expense_budget: '',
                    onsite_travel_expense: '',
                    onsite_num_trips: '',
                    onsite_num_flights: '',
                    remote_plc_hours: '',
                    remote_hmi_hours: '',
                    remote_fat_hours: '',
                    is_global_bucket: false,
                    global_access_level: 'ALL',
                    recurring_invoice_frequency: '',
                    next_invoice_date: '',
                    recurring_invoice_percentage: ''
                });
            }
        }
    }, [isOpen, milestone]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreateTask = async () => {
        if (!milestone) return;
        if (!window.confirm("Create a new task from this milestone?")) return;
        
        setLoading(true);
        try {
            const validTaskTypes = [
                "Engineering", "Programming", "Onsite", "Documentation", "Support", 
                "Design", "Planning", "Training", "Learning", "Ordering", 
                "Panel Building", "Shipping", "Admin", "PM", "FAT", "SAT", "Testing", "Other", "FIXED"
            ];
            let mappedType = "Other";
            if (validTaskTypes.includes(formData.milestone_type)) {
                mappedType = formData.milestone_type;
            }

            const taskPayload = {
                description: formData.name,
                task_type: mappedType,
                status: "In Progress",
                priority: "Low",
                start_date: new Date().toISOString(),
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
                estimated_effort: 1.0,
                assigned_to_id: formData.owner_id ? parseInt(formData.owner_id) : null,
                project_id: project.id,
                milestone_id: milestone.id
            };
            
            await api.post('/tasks/', taskPayload);
            alert("Task created successfully!");
        } catch (err) {
            console.error("Failed to create task", err);
            alert("Failed to create task from milestone.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                milestone_number: formData.milestone_number !== '' ? parseInt(formData.milestone_number) : null,
                cost: formData.cost ? parseFloat(formData.cost) : 0,
                progress: formData.progress ? parseInt(formData.progress) : 0,
                owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
                lead_id: formData.lead_id ? parseInt(formData.lead_id) : null,
                start_date: formData.start_date ? formData.start_date : null,
                due_date: formData.due_date ? formData.due_date : null,
                
                budget_hours: formData.budget_hours ? parseFloat(formData.budget_hours) : null,
                design_ifr_hours: formData.design_ifr_hours ? parseFloat(formData.design_ifr_hours) : null,
                design_ifc_hours: formData.design_ifc_hours ? parseFloat(formData.design_ifc_hours) : null,
                design_asbuilt_hours: formData.design_asbuilt_hours ? parseFloat(formData.design_asbuilt_hours) : null,
                hardware_expense_budget: formData.hardware_expense_budget ? parseFloat(formData.hardware_expense_budget) : null,
                hardware_shipping_budget: formData.hardware_shipping_budget ? parseFloat(formData.hardware_shipping_budget) : null,
                hardware_other_expense_budget: formData.hardware_other_expense_budget ? parseFloat(formData.hardware_other_expense_budget) : null,
                onsite_travel_expense: formData.onsite_travel_expense ? parseFloat(formData.onsite_travel_expense) : null,
                onsite_num_trips: formData.onsite_num_trips ? parseInt(formData.onsite_num_trips) : null,
                onsite_num_flights: formData.onsite_num_flights ? parseInt(formData.onsite_num_flights) : null,
                remote_plc_hours: formData.remote_plc_hours ? parseFloat(formData.remote_plc_hours) : null,
                remote_hmi_hours: formData.remote_hmi_hours ? parseFloat(formData.remote_hmi_hours) : null,
                remote_fat_hours: formData.remote_fat_hours ? parseFloat(formData.remote_fat_hours) : null,
                is_global_bucket: formData.is_global_bucket,
                global_access_level: formData.global_access_level || 'ALL',
                recurring_invoice_frequency: formData.recurring_invoice_frequency || null,
                next_invoice_date: formData.next_invoice_date || null,
                recurring_invoice_percentage: formData.recurring_invoice_percentage ? parseFloat(formData.recurring_invoice_percentage) : null
            };

            if (milestone) {
                await api.put(`/milestones/${milestone.id}`, payload);
            } else {
                await api.post(`/projects/${project.id}/milestones/`, payload);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error("Failed to save milestone", err);
            
            // Intercept Force Complete Requirements
            if (err.response?.data?.detail?.includes("FORCE_COMPLETE_REQUIRED")) {
                alert("Warning: All tasks must be closed before the milestone can be closed.");
                return;
            }

            alert("Failed to save milestone: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ margin: 0 }}>{milestone ? 'Edit Milestone' : 'New Milestone'}</h2>
                        {milestone && milestone.lead_id && (
                            <a href={`/portal/leads/edit/${milestone.lead_id}`} style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Linked Lead #{milestone.lead_id} ↗
                            </a>
                        )}
                    </div>
                    <button onClick={onClose} className="close-modal">&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Num (#)</label>
                                <input type="number" name="milestone_number" value={formData.milestone_number} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Custom Invoice Line Item</label>
                            <input type="text" name="line_item_name" value={formData.line_item_name || ''} onChange={handleChange} placeholder="Overrides default invoice formatting for strict client requirements." />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Due Date</label>
                                <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Cost ($)</label>
                                <input type="number" name="cost" value={formData.cost} onChange={handleChange} min="0" step="0.01" />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Owner</label>
                                <select name="owner_id" value={formData.owner_id} onChange={handleChange}>
                                    <option value="">Select Owner</option>
                                    {users.filter(u => u.is_employee).map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Linked Lead</label>
                                <select name="lead_id" value={formData.lead_id} onChange={handleChange}>
                                    <option value="">- No Link -</option>
                                    {leads.map(l => <option key={l.id} value={l.id}>L-{l.id} {l.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Progress ({formData.progress}%)</label>
                            <input type="range" name="progress" min="0" max="100" value={formData.progress} onChange={handleChange} style={{ width: '100%' }} />
                        </div>

                        <div className="form-group">
                            <label>Milestone Type</label>
                            <select name="milestone_type" value={formData.milestone_type} onChange={handleChange}>
                                <option value="Design">Design</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Remote">Remote</option>
                                <option value="Onsite">Onsite</option>
                                <option value="PM">PM</option>
                                <option value="Support">Support</option>
                                <option value="Operations">Operations</option>
                                <option value="Internal">Internal</option>
                                <option value="Contingency">Contingency</option>
                                <option value="FIXED">FIXED</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Dynamic Milestone Type Budget Fields */}
                        {formData.milestone_type === 'Design' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Total Hours</label><input type="number" name="budget_hours" value={formData.budget_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>IFR Hours</label><input type="number" name="design_ifr_hours" value={formData.design_ifr_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>IFC Hours</label><input type="number" name="design_ifc_hours" value={formData.design_ifc_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>AsBuilt Hours</label><input type="number" name="design_asbuilt_hours" value={formData.design_asbuilt_hours} onChange={handleChange} min="0" step="0.5" /></div>
                            </div>
                        )}
                        {formData.milestone_type === 'Hardware' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Labor Hours</label><input type="number" name="budget_hours" value={formData.budget_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Hdwre Exp ($)</label><input type="number" name="hardware_expense_budget" value={formData.hardware_expense_budget} onChange={handleChange} min="0" step="0.01" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Ship Exp ($)</label><input type="number" name="hardware_shipping_budget" value={formData.hardware_shipping_budget} onChange={handleChange} min="0" step="0.01" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Other Exp ($)</label><input type="number" name="hardware_other_expense_budget" value={formData.hardware_other_expense_budget} onChange={handleChange} min="0" step="0.01" /></div>
                            </div>
                        )}
                        {formData.milestone_type === 'Onsite' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Field Hours</label><input type="number" name="budget_hours" value={formData.budget_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Travel Exp ($)</label><input type="number" name="onsite_travel_expense" value={formData.onsite_travel_expense} onChange={handleChange} min="0" step="0.01" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label># of Trips</label><input type="number" name="onsite_num_trips" value={formData.onsite_num_trips} onChange={handleChange} min="0" step="1" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label># of Flights</label><input type="number" name="onsite_num_flights" value={formData.onsite_num_flights} onChange={handleChange} min="0" step="1" /></div>
                            </div>
                        )}
                        {formData.milestone_type === 'Remote' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Total Hours</label><input type="number" name="budget_hours" value={formData.budget_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>PLC Hrs</label><input type="number" name="remote_plc_hours" value={formData.remote_plc_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>HMI Hrs</label><input type="number" name="remote_hmi_hours" value={formData.remote_hmi_hours} onChange={handleChange} min="0" step="0.5" /></div>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>FAT Hrs</label><input type="number" name="remote_fat_hours" value={formData.remote_fat_hours} onChange={handleChange} min="0" step="0.5" /></div>
                            </div>
                        )}
                        {['PM', 'Contingency', 'FIXED', 'Other', 'Support', 'Operations', 'Internal'].includes(formData.milestone_type) && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}><label>Total Budgeted Hours</label><input type="number" name="budget_hours" value={formData.budget_hours} onChange={handleChange} min="0" step="0.5" /></div>
                            </div>
                        )}
                        
                        <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        name="is_global_bucket"
                                        checked={formData.is_global_bucket || false}
                                        onChange={handleChange}
                                        style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                                    />
                                    Is Global Bucket? (Allows time entry without fixed tasks)
                                </label>
                            </div>
                            {formData.is_global_bucket && (
                                <div className="form-group">
                                    <label>Global Access Level</label>
                                    <select name="global_access_level" value={formData.global_access_level} onChange={handleChange}>
                                        <option value="ALL">All Employees</option>
                                        <option value="MANAGEMENT">Management Only</option>
                                        <option value="FINANCE_ADMIN">Finance & Admin Only</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {!project?.use_project_billing_schedule && (
                            <div style={{ padding: '1rem', borderLeft: '3px solid var(--primary)', background: 'var(--bg-secondary)', marginBottom: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Milestone Billing Schedule</h4>
                                <div className="form-group">
                                    <label>Invoice Frequency</label>
                                    <select name="recurring_invoice_frequency" value={formData.recurring_invoice_frequency || ''} onChange={handleChange}>
                                        <option value="">None (Standard % Billing)</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="SEMI_ANNUAL">Semi-Annual</option>
                                        <option value="ANNUAL">Annual</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group mb-0">
                                        <label>Next Invoice Date</label>
                                        <input type="date" name="next_invoice_date" value={formData.next_invoice_date || ''} onChange={handleChange} />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label>Billing % per Invoice</label>
                                        <input type="number" name="recurring_invoice_percentage" value={formData.recurring_invoice_percentage} onChange={handleChange} min="0" max="100" step="0.1" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>
                                <input type="checkbox" name="is_completed" checked={formData.is_completed} onChange={handleChange} style={{ width: 'auto', marginRight: '0.5rem' }} />
                                Mark as Completed
                            </label>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'space-between', display: 'flex' }}>
                            <div>
                                {milestone && (
                                    <button type="button" onClick={handleCreateTask} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} disabled={loading}>
                                        Create Task
                                    </button>
                                )}
                            </div>
                            <div>
                                <button type="button" onClick={onClose} className="btn-secondary" style={{ marginRight: '0.5rem' }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Milestone'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MilestoneForm;
