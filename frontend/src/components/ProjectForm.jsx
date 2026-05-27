import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ProjectForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = Boolean(id);
    // Parse query params for Lead Conversion
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const leadId = queryParams.get('leadId');
    const leadName = queryParams.get('name');
    const [hasInvoices, setHasInvoices] = useState(false);

    const [formData, setFormData] = useState({
        name: leadName || '',
        description: '',
        project_unique_id: '',
        customer_id: '',
        lead_id: leadId || null,
        status: 'active',
        budget: 0,
        start_date: '',
        priority: 'Medium',
        project_type: 'Other',
        customer_po: '',
        is_master_po: false,
        pm_id: '',
        customer_pm_id: '',
        location_id: '',
        is_virtual: false,
        use_project_billing_schedule: false,
        recurring_invoice_frequency: '',
        next_invoice_date: '',
        recurring_invoice_percentage: ''
    });

    const [customers, setCustomers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false); // Only for submit
    const [initialLoading, setInitialLoading] = useState(true);
    const [attachments, setAttachments] = useState([]);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Customers & Users
                const [custData, userData, leadsData] = await Promise.all([
                    api.get('/customers/'),
                    api.get('/users/'),
                    api.get('/leads/')
                ]);
                setCustomers(custData);
                setUsers(userData);
                setLeads(leadsData.filter(l => l.status !== 'Converted')); // Usually you only want active leads, or all if we're linking missing ones? We'll load all leads data so existing ones map correctly.
                setLeads(leadsData);

                // Fetch Project if Edit
                if (isEdit) {
                    const projectData = await api.get(`/projects/${id}`);
                    setFormData({
                        name: projectData.name,
                        description: projectData.description || '',
                        project_unique_id: projectData.project_unique_id,
                        customer_id: projectData.customer_id,
                        status: projectData.status,
                        budget: projectData.budget || 0,
                        start_date: projectData.start_date ? projectData.start_date.split('T')[0] : '',
                        due_date: projectData.due_date ? projectData.due_date.split('T')[0] : '',
                        priority: projectData.priority || 'Medium',
                        project_type: projectData.project_type || 'Engineering',
                        customer_po: projectData.customer_po || '',
                        is_master_po: projectData.is_master_po || false,
                        pm_id: projectData.pm_id || '',
                        customer_pm_id: projectData.customer_pm_id || '',
                        location_id: projectData.location_id || '',
                        lead_id: projectData.lead_id || '',
                        do_not_invoice: projectData.do_not_invoice || false,
                        is_virtual: projectData.is_virtual || false,
                        use_project_billing_schedule: projectData.use_project_billing_schedule || false,
                        recurring_invoice_frequency: projectData.recurring_invoice_frequency || '',
                        next_invoice_date: projectData.next_invoice_date ? projectData.next_invoice_date.split('T')[0] : '',
                        recurring_invoice_percentage: projectData.recurring_invoice_percentage || ''
                    });
                    if (projectData.invoices && projectData.invoices.length > 0) {
                        setHasInvoices(true);
                    }
                    setAttachments(projectData.attachments || []);
                } else if (leadId) {
                    // Fetch Lead Data for conversion pre-fill
                    try {
                        const lead = leadsData.find(l => l.id === parseInt(leadId));

                        if (lead) {
                            setFormData(prev => ({
                                ...prev,
                                name: lead.name || prev.name,
                                description: lead.description || prev.description,
                                customer_id: lead.customer_id || '',
                                location_id: lead.location_id || '',
                                get pm_id() { return lead.poc_id || '' }, // POC maps to Internal PM
                                budget: lead.estimated_value || 0,
                                start_date: lead.start_date ? lead.start_date.split('T')[0] : '',
                                due_date: lead.due_date ? lead.due_date.split('T')[0] : '',
                                project_type: lead.project_type || 'Other',
                                lead_id: lead.id
                            }));
                        }
                    } catch (error) {
                        console.error("Failed to load lead details", error);
                    }
                }
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setInitialLoading(false);
            }
        };
        loadData();
    }, [id, isEdit, leadId]);

    // Fetch Locations when Customer Changes
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const endpoint = formData.customer_id 
                    ? `/locations/?customer_id=${formData.customer_id}`
                    : `/locations/`;
                const data = await api.get(endpoint);
                setLocations(data);
            } catch (err) {
                console.error("Failed to fetch locations", err);
            }
        };
        fetchLocations();
    }, [formData.customer_id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user || !user.id) {
            alert("Error: User session not found. Please logout and login again.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                customer_id: parseInt(formData.customer_id),
                lead_id: formData.lead_id ? parseInt(formData.lead_id) : null,
                budget: formData.budget ? parseFloat(formData.budget) : 0,
                start_date: formData.start_date ? formData.start_date : null,
                due_date: formData.due_date ? formData.due_date : null,
                created_by: user.id,
                pm_id: formData.pm_id ? parseInt(formData.pm_id) : null,
                customer_pm_id: formData.customer_pm_id ? parseInt(formData.customer_pm_id) : null,
                location_id: formData.location_id ? parseInt(formData.location_id) : null,
                is_virtual: formData.is_virtual,
                use_project_billing_schedule: formData.use_project_billing_schedule,
                recurring_invoice_frequency: formData.recurring_invoice_frequency || null,
                next_invoice_date: formData.next_invoice_date || null,
                recurring_invoice_percentage: formData.recurring_invoice_percentage ? parseFloat(formData.recurring_invoice_percentage) : null
            };

            // Remove ID if it's auto-generated dummy text
            if (payload.project_unique_id === 'Auto-generated' || !payload.project_unique_id) {
                delete payload.project_unique_id;
            }

            console.log("Submitting Payload:", payload);

            if (isEdit) {
                await api.put(`/projects/${id}`, payload);
            } else {
                await api.post('/projects/', payload);
            }
            navigate('/portal/projects');
        } catch (err) {
            console.error("Failed to save project", err);
            
            // Intercept Force Complete Requirements
            if (err.response?.data?.detail?.includes("FORCE_COMPLETE_REQUIRED")) {
                alert("Warning: All tasks and milestones must be closed before the project can be closed.");
                return;
            }

            // Attempt to extract validation messages
            let msg = "Failed to save project.";
            if (err.response && err.response.json) {
                try {
                    const errorData = await err.response.json();
                    msg += " Server says: " + JSON.stringify(errorData);
                } catch (e) { }
            } else if (err.message) {
                msg += " " + err.message;
            }
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>{isEdit ? 'Edit Project' : 'New Project'}</h2>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Project Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Project ID</label>
                            <input
                                name="project_unique_id"
                                value={isEdit ? formData.project_unique_id : 'Auto-generated'}
                                readOnly
                                disabled
                                style={{
                                    width: '100%', padding: '0.75rem',
                                    background: isEdit ? 'var(--bg-dark)' : 'var(--bg-hover)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    borderRadius: '8px',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Customer PO</label>
                            <input
                                name="customer_po"
                                value={formData.customer_po}
                                onChange={handleChange}
                                placeholder="Enter Customer PO #"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Internal PM</label>
                            <select
                                name="pm_id"
                                value={formData.pm_id}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="">Select Internal PM</option>
                                {users.filter(u => u.is_employee).map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Customer PM</label>
                            <select
                                name="customer_pm_id"
                                value={formData.customer_pm_id}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="">Select Customer PM</option>
                                {users.filter(u => !u.locked_out && (formData.customer_id ? u.customer_id == formData.customer_id : !u.is_employee)).map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Customer</label>
                            <select
                                name="customer_id"
                                value={formData.customer_id}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <select
                                name="location_id"
                                value={formData.location_id || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="">-- All Sites / No Specific Location --</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Linked Lead (Optional)</label>
                            <select
                                name="lead_id"
                                value={formData.lead_id || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="">No Active Lead</option>
                                {leads.map(l => (
                                    <option key={l.id} value={l.id}>{l.name} {l.company ? `- ${l.company}` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginTop: '1.8rem' }}>
                                <input
                                    type="checkbox"
                                    name="is_master_po"
                                    checked={formData.is_master_po || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_master_po: e.target.checked }))}
                                    style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                                />
                                Is Master PO?
                            </label>
                        </div>
                        <div className="form-group">
                            <label 
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginTop: '1.8rem' }}
                                title={hasInvoices ? "Cannot mark Do Not Invoice if invoices already exist" : ""}
                            >
                                <input
                                    type="checkbox"
                                    name="do_not_invoice"
                                    checked={formData.do_not_invoice || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, do_not_invoice: e.target.checked }))}
                                    disabled={hasInvoices}
                                    style={{ 
                                        accentColor: 'var(--primary)', 
                                        transform: 'scale(1.2)',
                                        opacity: hasInvoices ? 0.5 : 1
                                    }}
                                />
                                Do Not Invoice
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Budget ($)</label>
                            <input type="number" name="budget" value={formData.budget} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Project Type</label>
                            <select
                                name="project_type"
                                value={formData.project_type}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="None">None</option>
                                <option value="Preset Controller">Preset Controller</option>
                                <option value="Additive System">Additive System</option>
                                <option value="Blending System">Blending System</option>
                                <option value="PLC System">PLC System</option>
                                <option value="Automation System">Automation System</option>
                                <option value="Visualization System">Visualization System</option>
                                <option value="Design">Design</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Programming">Programming</option>
                                <option value="Project Management">Project Management</option>
                                <option value="Field Services">Field Services</option>
                                <option value="Small Project">Small Project</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Consulting">Consulting</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                style={{
                                    width: '100%', padding: '0.75rem', background: 'var(--bg-dark)',
                                    border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px'
                                }}
                            >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Contract Settings</h3>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        name="is_virtual"
                                        checked={formData.is_virtual || false}
                                        onChange={handleChange}
                                        style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                                    />
                                    Virtual/Annual General Contract (Internal or Customer Helpdesk)
                                </label>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        name="use_project_billing_schedule"
                                        checked={formData.use_project_billing_schedule || false}
                                        onChange={handleChange}
                                        disabled={formData.do_not_invoice}
                                        style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                                    />
                                    Use Project-Level Recurring Billing (Consolidated Invoicing)
                                </label>
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                                    If unchecked, recurring dates are calculated on individual Milestone schedules (Site-level billing).
                                </small>
                            </div>
                        </div>
                        
                        {formData.use_project_billing_schedule && (
                            <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Billing Schedule Configuration</h3>
                                
                                <div className="form-group">
                                    <label>Invoice Frequency</label>
                                    <select name="recurring_invoice_frequency" value={formData.recurring_invoice_frequency || ''} onChange={handleChange}>
                                        <option value="">None (Manual Input)</option>
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
                                        <input type="number" name="recurring_invoice_percentage" value={formData.recurring_invoice_percentage} onChange={handleChange} min="0" max="100" step="0.1" placeholder="e.g. 25" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button type="button" onClick={() => navigate('/portal/projects')} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectForm;
