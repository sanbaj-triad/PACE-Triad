import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import CustomerForm from './CustomerForm';
import UserForm from './UserForm';
import SmartCloneWizard from '../components/SmartCloneWizard';
import LeadToMilestoneModal from '../components/LeadToMilestoneModal';

// Simple Modal Component
const Modal = ({ children, onClose }) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)', padding: '2rem', borderRadius: '8px',
                width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                {children}
            </div>
        </div>
    );
};

const LeadForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);

    // Lists for Dropdowns
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);

    // Modal State
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showCustomerContactModal, setShowCustomerContactModal] = useState(false);
    const [showSmartClone, setShowSmartClone] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '', // Optional fallback if customer not selected? Or just description
        customer_id: '',
        location_id: '',
        poc_id: '',
        customer_contact_id: '',
        customer_contract: '',
        description: '',
        estimated_value: '',
        due_date: '',
        project_type: 'Other',
        status: 'new'
    });

    const [auditInfo, setAuditInfo] = useState(null);
    const [linkedProject, setLinkedProject] = useState(null);
    const [linkedMilestone, setLinkedMilestone] = useState(null);

    const employeeUsers = users.filter(u => u.is_employee);
    const customerUsers = users.filter(u => 
        formData.customer_id ? u.customer_id == formData.customer_id : !u.is_employee
    );

    const fetchData = async () => {
        try {
            const [customersData, usersData] = await Promise.all([
                api.get('/customers/'),
                api.get('/users/'),
            ]);
            setCustomers(customersData);
            setUsers(usersData);
        } catch (err) {
            console.error("Failed to fetch dropdown data", err);
        }
    };

    useEffect(() => {
        fetchData();

        if (isEdit) {
            const fetchLead = async () => {
                try {
                    const data = await api.get(`/leads/`);
                    const leads = await data;
                    const lead = leads.find(l => l.id === parseInt(id));
                    if (lead) {
                        setAuditInfo({
                            created_at: lead.created_at,
                            updated_at: lead.updated_at,
                            created_by: lead.created_by_user,
                            updated_by: lead.updated_by_user
                        });
                        setFormData({
                            name: lead.name,
                            email: lead.email || '',
                            company: lead.company || '',
                            customer_id: lead.customer_id || '',
                            location_id: lead.location_id || '',
                            poc_id: lead.poc_id || '',
                            customer_contact_id: lead.customer_contact_id || '',
                            customer_contract: lead.customer_contract || '',
                            description: lead.description || '',
                            estimated_value: lead.estimated_value || '',
                            due_date: lead.due_date || '',
                            project_type: lead.project_type || 'Other',
                            status: (lead.status || 'new').toLowerCase()
                        });
                        if (lead.project) {
                            setLinkedProject(lead.project);
                        }
                        if (lead.milestone) {
                            setLinkedMilestone(lead.milestone);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load lead", err);
                }
            };
            fetchLead();
        }
    }, [id, isEdit]);

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
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            // Ensure empty strings are sent as null if needed, or backend handles it.
            // Pydantic optional fields handle null well, but valid int check needed for IDs
            if (payload.customer_id === '') payload.customer_id = null;
            if (payload.location_id === '') payload.location_id = null;
            if (payload.poc_id === '') payload.poc_id = null;
            if (payload.customer_contact_id === '') payload.customer_contact_id = null;
            if (payload.estimated_value === '') payload.estimated_value = null;

            if (isEdit) {
                await api.put(`/leads/${id}`, payload);
            } else {
                await api.post('/leads/', payload);
            }
            navigate('/portal/leads');
        } catch (err) {
            console.error("Failed to save lead", err);
            alert("Failed to save lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Lead' : 'New Lead'}</h2>
                {linkedProject ? (
                    <div style={{ fontSize: '0.9rem' }}>
                        Linked Project: <a href={`/portal/projects/${linkedProject.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>{linkedProject.name}</a>
                    </div>
                ) : linkedMilestone ? (
                    <div style={{ fontSize: '0.9rem' }}>
                        Linked Milestone: <a href={`/portal/projects/${linkedMilestone.project_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>{linkedMilestone.name}</a>
                    </div>
                ) : null}
            </div>

            <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                    <label>Lead Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="form-input"
                        placeholder="e.g. Project Name or Deal Title"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Customer</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                name="customer_id"
                                value={formData.customer_id || ''}
                                onChange={handleChange}
                                className="form-input"
                                style={{ flex: 1 }}
                            >
                                <option value="">-- Select Existing Customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCustomerModal(true)}
                            >
                                + Add
                            </button>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label>Location</label>
                        <select
                            name="location_id"
                            value={formData.location_id || ''}
                            onChange={handleChange}
                            className="form-input"
                        >
                            <option value="">-- All Sites --</option>
                            {locations.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Customer Contact</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                name="customer_contact_id"
                                value={formData.customer_contact_id}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    setFormData(prev => {
                                        const newData = { ...prev, customer_contact_id: selectedId };
                                        if (selectedId) {
                                            const foundUser = customerUsers.find(u => u.id === parseInt(selectedId));
                                            if (foundUser && foundUser.email) {
                                                newData.email = foundUser.email;
                                            }
                                        }
                                        return newData;
                                    });
                                }}
                                className="form-input"
                                style={{ flex: 1 }}
                            >
                                <option value="">-- Select Contact --</option>
                                {customerUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} {u.email ? `(${u.email})` : ''}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCustomerContactModal(true)}
                            >
                                + Add
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="e.g. john@example.com"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Customer Contract / PO #</label>
                    <input
                        type="text"
                        name="customer_contract"
                        value={formData.customer_contract}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g. Contract ID or Pre-Sales Agreement"
                    />
                </div>

                <div className="form-group">
                    <label>Lead Creator</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            name="poc_id"
                            value={formData.poc_id}
                            onChange={handleChange}
                            className="form-input"
                            style={{ flex: 1 }}
                        >
                            <option value="">-- Select User --</option>
                            {employeeUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.username} {u.email ? `(${u.email})` : ''}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowUserModal(true)}
                        >
                            + Add
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-input"
                        rows="3"
                        placeholder="Project requirements or lead details..."
                    />
                </div>



                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Estimated Value ($)</label>
                        <input
                            type="number"
                            name="estimated_value"
                            value={formData.estimated_value}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="date"
                            name="due_date"
                            value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Project Type</label>
                        <select
                            name="project_type"
                            value={formData.project_type || 'Other'}
                            onChange={handleChange}
                            className="form-input"
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
                            <option value="Support">Support</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>



                <div className="form-group">
                    <label>Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="form-input"
                    >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal</option>
                        <option value="proposal_sent">Proposal Sent</option>
                        <option value="lost">Lost</option>
                        <option value="converted">Converted</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isEdit && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to delete this lead?")) return;
                                    try {
                                        await api.delete(`/leads/${id}`);
                                        navigate('/portal/leads');
                                    } catch (err) {
                                        console.error("Failed to delete lead", err);
                                        alert(err.response?.data?.detail || "Failed to delete lead.");
                                    }
                                }}
                                title="Delete Lead"
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        )}
                        {isEdit && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to clone this lead?")) return;
                                    try {
                                        const res = await api.post(`/leads/${id}/clone`);
                                        navigate(`/portal/leads/edit/${res.id}`);
                                    } catch (err) {
                                        console.error("Failed to clone lead", err);
                                        alert(err.response?.data?.detail || "Failed to clone lead.");
                                    }
                                }}
                                title="Clone Lead"
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '1 1 auto' }}>
                            {isEdit && (formData.status || '').toLowerCase() !== 'converted' && !linkedProject && !linkedMilestone && (
                                <>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowSmartClone(true)} 
                                        className="btn btn-secondary" 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            color: 'var(--primary)',
                                            borderColor: 'var(--primary)',
                                            background: 'transparent',
                                            whiteSpace: 'nowrap'
                                        }}
                                        title="AI Smart Clone Project Template"
                                    >
                                        🚀 AI CloneWiz
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/portal/projects/new?leadId=${id}&name=${encodeURIComponent(formData.name)}`)}
                                        className="btn btn-secondary"
                                        style={{ color: '#22c55e', borderColor: '#22c55e', background: 'transparent', whiteSpace: 'nowrap' }}
                                    >
                                        Convert Profile to Project
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMilestoneModal(true)}
                                        className="btn btn-secondary"
                                        style={{ color: '#8b5cf6', borderColor: '#8b5cf6', background: 'transparent', whiteSpace: 'nowrap' }}
                                    >
                                        Convert Profile to Milestone
                                    </button>
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                            <button type="button" onClick={() => navigate('/portal/leads')} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                                {loading ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            </form >

            {isEdit && auditInfo && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                        Created: {new Date(auditInfo.created_at).toLocaleDateString()}
                    </span>
                    <span>
                        Last Updated: {new Date(auditInfo.updated_at).toLocaleDateString()}
                    </span>
                </div>
            )}

            {/* Modals */}
            {
                showCustomerModal && (
                    <Modal onClose={() => setShowCustomerModal(false)}>
                        <CustomerForm
                            forceNew={true}
                            onSuccess={(newCustomer) => {
                                fetchData(); // Refresh list
                                setFormData(prev => ({ ...prev, customer_id: newCustomer.id }));
                                setShowCustomerModal(false);
                            }}
                            onCancel={() => setShowCustomerModal(false)}
                        />
                    </Modal>
                )
            }

            {
                showUserModal && (
                    <Modal onClose={() => setShowUserModal(false)}>
                        <UserForm
                            forceNew={true}
                            defaultIsEmployee={true}
                            onSuccess={(newUser) => {
                                fetchData();
                                setFormData(prev => ({ ...prev, poc_id: newUser.id }));
                                setShowUserModal(false);
                            }}
                            onCancel={() => setShowUserModal(false)}
                        />
                    </Modal>
                )
            }

            {
                showCustomerContactModal && (
                    <Modal onClose={() => setShowCustomerContactModal(false)}>
                        <UserForm
                            forceNew={true}
                            defaultIsEmployee={false}
                            defaultCustomerId={formData.customer_id}
                            onSuccess={(newUser) => {
                                fetchData();
                                setFormData(prev => {
                                    const newData = { ...prev, customer_contact_id: newUser.id };
                                    if (newUser.email) newData.email = newUser.email;
                                    return newData;
                                });
                                setShowCustomerContactModal(false);
                            }}
                            onCancel={() => setShowCustomerContactModal(false)}
                        />
                    </Modal>
                )
            }
            <SmartCloneWizard 
                isOpen={showSmartClone} 
                onClose={() => setShowSmartClone(false)} 
                defaultLeadId={id} 
            />
            {isEdit && (
                <LeadToMilestoneModal
                    isOpen={showMilestoneModal}
                    onClose={() => setShowMilestoneModal(false)}
                    lead={{id: parseInt(id), name: formData.name, description: formData.description, estimated_value: formData.estimated_value, due_date: formData.due_date, poc_id: formData.poc_id, project_type: formData.project_type}}
                    onSuccess={(newMilestone) => {
                        setShowMilestoneModal(false);
                        navigate(`/portal/projects/${newMilestone.project_id}`);
                    }}
                />
            )}
        </div >
    );
};

export default LeadForm;
