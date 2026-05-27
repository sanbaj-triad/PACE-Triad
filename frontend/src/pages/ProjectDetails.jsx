import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';
import MilestoneList from '../components/MilestoneList';
import InvoiceList from './InvoiceList';
import ExpenseForm from './ExpenseForm';
import ProjectGantt from '../components/ProjectGantt';
import ProjectAttachments from '../components/ProjectAttachments';

import EntityChat from '../components/EntityChat';

const Modal = ({ children, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Expense Management</h2>
                    <button onClick={onClose} className="close-modal" style={{ fontSize: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const ProjectDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'milestones';
    const [activeTab, setActiveTab] = useState(initialTab); // 'milestones' or 'invoices'
    const [showChat, setShowChat] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneOptions, setCloneOptions] = useState({ clone_milestones: false, clone_tasks: false, link_to_lead_id: '' });
    const [leads, setLeads] = useState([]);
    const [cloning, setCloning] = useState(false);
    const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

    useEffect(() => {
        if (showCloneModal && leads.length === 0) {
            api.get('/leads/').then(data => setLeads(data)).catch(console.error);
        }
    }, [showCloneModal, leads.length]);

    const fetchProject = async () => {
        try {
            const data = await api.get(`/projects/${id}`);
            setProject(data);
        } catch (err) {
            console.error("Failed to load project", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [id]);

    const handleDownloadAttachment = async (attachment) => {
        try {
            const response = await fetch(`/projects/attachments/${attachment.id}/download`, {
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
            alert("Failed to download file: " + err.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!project) return <div>Project not found</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <Link to="/portal/projects" style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '1rem', display: 'block' }}>&larr; Back to Projects</Link>
                    <h1>{project.name}</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <p style={{ color: 'var(--text-muted)' }}>{project.project_unique_id}</p>
                        {project.do_not_invoice && (
                            <span style={{ background: 'var(--error, #ef4444)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                DO NOT INVOICE
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        onClick={async () => {
                            if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
                            try {
                                await api.delete(`/projects/${id}`);
                                navigate('/portal/projects');
                            } catch (err) {
                                console.error("Failed to delete project", err);
                                alert(err.response?.data?.detail || "Failed to delete project. Ensure it has no milestones.");
                            }
                        }}
                        title="Delete Project"
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button 
                         onClick={() => setShowCloneModal(true)}
                         title="Clone Project"
                         style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <Link 
                        to={`/portal/projects/edit/${project.id}`}
                        title="Edit Project"
                        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </Link>
                </div>
            </div>
            
            {isFinancial && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>Management Overrides:</span>
                    <button 
                        className="btn-secondary" 
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                        onClick={async () => {
                            if(!window.confirm("Lock ALL timesheet logs natively onto this entity?")) return;
                            try {
                                await api.post('/task-events/lock_project', { project_id: parseInt(id), lock: true });
                                alert('Project Timesheets Locked');
                            } catch(err) { alert('Failed'); }
                        }}
                    >
                        🔒 Lock Timesheets
                    </button>
                    <button 
                        className="btn-secondary" 
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderColor: '#10b981', color: '#10b981' }}
                        onClick={async () => {
                            if(!window.confirm("Unlock ALL timesheet logs on this entity (Reverts all state boundaries on child tasks to Draft)?")) return;
                            try {
                                await api.post('/task-events/lock_project', { project_id: parseInt(id), lock: false });
                                alert('Project Timesheets Unlocked');
                            } catch(err) { alert('Failed'); }
                        }}
                    >
                        🔓 Unlock Timesheets
                    </button>
                </div>
            )}

            {project.lead && (
                <div style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Source Lead:</span>
                    <Link to={`/portal/leads/edit/${project.lead_id || project.lead.id}`} style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>
                        {project.lead.name}
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: '#22c55e', marginLeft: '0.5rem', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        CONVERTED
                    </span>
                </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                >
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Project Details
                    </h3>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        {isDetailsCollapsed ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Expand Details"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Collapse Details"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        )}
                    </button>
                </div>
                
                {!isDetailsCollapsed && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Customer</label>
                                <p className="font-medium">{project.customer?.name || project.customer_id}</p>
                            </div>
                            {isFinancial && (
                                <div>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Budget</label>
                                    <p className="font-medium">${project.budget?.toLocaleString()}</p>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span>Billed: ${(project.total_billed || 0).toLocaleString()}</span>
                                            <span>{Math.round(project.financial_progress || 0)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${Math.min(100, project.financial_progress || 0)}%`,
                                                height: '100%',
                                                background: 'var(--primary)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Start Date</label>
                                <p className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Due Date</label>
                                <p className="font-medium">{project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Status</label>
                                <span className="status-badge status-active">{project.status}</span>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Type</label>
                                <p className="font-medium">{project.project_type}</p>
                            </div>
                            {project.lead_id && (
                                <div>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Linked Lead</label>
                                    <p className="font-medium">
                                        <a 
                                            href={`/portal/leads/edit/${project.lead_id}`} 
                                            style={{ color: 'var(--primary)', textDecoration: 'none' }}
                                        >
                                            {project.lead?.name ? `${project.lead.name} ${project.lead.company ? `(${project.lead.company})` : ''}` : `Lead #${project.lead_id}`}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Customer PO</label>
                                <p className="font-medium">{project.customer_po || '-'}</p>
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    {project.is_master_po ? (
                                        // Single Master PO Logic
                                        <>
                                            {project.po_file_path ? (
                                                <a
                                                    href={project.po_file_path.startsWith('http') ? project.po_file_path : project.po_file_path}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}
                                                >
                                                    View Master PO PDF
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No Master PO attached</span>
                                            )}

                                            <label style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                <span>{project.po_file_path ? "Replace Master PO" : "Upload Master PO"}</span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    style={{ display: 'none' }}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        try {
                                                            const res = await api.post(`/projects/${project.id}/upload-po`, formData);
                                                            alert("PO Uploaded Successfully");
                                                            const updated = await api.get(`/projects/${project.id}`);
                                                            setProject(updated);
                                                        } catch (err) {
                                                            console.error("Upload failed", err);
                                                            alert("Failed to upload PO PDF: " + (err.response?.data?.detail || err.message));
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        // Multiple Attachments Logic
                                        <>
                                            <div style={{ width: '100%' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Attached POs:</div>
                                                {project.attachments && project.attachments.length > 0 ? (
                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                                        {project.attachments.map(att => (
                                                            <li key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                                <a
                                                                    href={att.file_path.startsWith('http') ? att.file_path : att.file_path}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ color: 'var(--primary)', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                                >
                                                                    {att.filename}
                                                                </a>
                                                                {deletingId === att.id ? (
                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                                                                            Confirm?
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async (e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    await api.delete(`/attachments/${att.id}`);
                                                                                    setDeletingId(null);
                                                                                    const updated = await api.get(`/projects/${project.id}`);
                                                                                    setProject(updated);
                                                                                } catch (err) {
                                                                                    console.error("Delete failed", err);
                                                                                    alert("Failed to delete attachment");
                                                                                    setDeletingId(null);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                background: 'var(--error, #ef4444)',
                                                                                border: 'none',
                                                                                color: 'white',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.75rem',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                            }}
                                                                        >
                                                                            Yes
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setDeletingId(null);
                                                                            }}
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: '1px solid var(--text-muted)',
                                                                                color: 'var(--text-muted)',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.75rem',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                            }}
                                                                        >
                                                                            No
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setDeletingId(att.id);
                                                                        }}
                                                                        style={{
                                                                            background: 'var(--error-light, #fee2e2)',
                                                                            border: '1px solid var(--error, #ef4444)',
                                                                            color: 'var(--error, #ef4444)',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.9rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '4px',
                                                                            marginLeft: '1rem',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            height: '24px',
                                                                            width: '24px'
                                                                        }}
                                                                        title="Delete Attachment"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attachments</div>}
                                            </div>

                                            <label style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', marginTop: '0.5rem', display: 'inline-block' }}>
                                                <span>+ Add PO Attachment</span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    style={{ display: 'none' }}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        try {
                                                            const res = await api.post(`/projects/${project.id}/attachments`, formData);
                                                            alert("Attachment Uploaded");
                                                            const updated = await api.get(`/projects/${project.id}`);
                                                            setProject(updated);
                                                        } catch (err) {
                                                            console.error("Upload failed", err);
                                                            alert("Failed to upload: " + (err.response?.data?.detail || err.message));
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>PO Mode</label>
                                <p className="font-medium">{project.is_master_po ? 'Master PO' : 'Milestone POs'}</p>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Internal PM</label>
                                <p className="font-medium">{project.pm_user?.username || project.pm_user?.email || '-'}</p>
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Customer PM</label>
                                <p className="font-medium">{project.customer_pm_user?.username || project.customer_pm_user?.email || '-'}</p>
                            </div>
                        </div>
                        {project.description && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Description</label>
                                <p style={{ marginTop: '0.5rem' }}>{project.description}</p>
                            </div>
                        )}

                        {/* Audit Trail Footer */}
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                                Created: {new Date(project.created_at).toLocaleDateString()} by {project.created_by_user?.username || 'System'}
                            </span>
                            <span>
                                Last Updated: {new Date(project.updated_at).toLocaleDateString()} {project.updated_by_user ? `by ${project.updated_by_user.username}` : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ 
                display: 'flex', 
                gap: '0.25rem', 
                background: 'var(--bg-secondary)', 
                padding: '0.35rem', 
                borderRadius: '8px', 
                marginBottom: '2rem',
                border: '1px solid var(--border)',
                width: 'fit-content'
            }}>
                <button
                    onClick={() => setActiveTab('milestones')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: activeTab === 'milestones' ? '1px solid var(--border)' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '0.4rem 1rem',
                        background: activeTab === 'milestones' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'milestones' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'milestones' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'milestones' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                    Milestones
                </button>
                {!project.do_not_invoice && isFinancial && (
                    <button
                        onClick={() => setActiveTab('invoices')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            border: activeTab === 'invoices' ? '1px solid var(--border)' : '1px solid transparent',
                            borderRadius: '6px',
                            padding: '0.4rem 1rem',
                            background: activeTab === 'invoices' ? 'var(--bg-card)' : 'transparent',
                            color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'invoices' ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: activeTab === 'invoices' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Invoices
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('expenses')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: activeTab === 'expenses' ? '1px solid var(--border)' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '0.4rem 1rem',
                        background: activeTab === 'expenses' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'expenses' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'expenses' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    Expenses
                </button>
                <button
                    onClick={() => setActiveTab('gantt')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: activeTab === 'gantt' ? '1px solid var(--border)' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '0.4rem 1rem',
                        background: activeTab === 'gantt' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'gantt' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'gantt' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'gantt' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    Timeline/Gantt
                </button>
                <button
                    onClick={() => setActiveTab('attachments')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: activeTab === 'attachments' ? '1px solid var(--border)' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '0.4rem 1rem',
                        background: activeTab === 'attachments' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'attachments' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'attachments' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'attachments' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    Attachments
                </button>
            </div>

            <div>
                {activeTab === 'milestones' && (
                    <MilestoneList projectId={project.id} project={project} />
                )}
                {activeTab === 'gantt' && (
                    <ProjectGantt projectId={project.id} project={project} onProjectUpdate={fetchProject} />
                )}
                {activeTab === 'attachments' && (
                    <ProjectAttachments projectId={project.id} />
                )}
                {activeTab === 'invoices' && (
                    <InvoiceList projectId={project.id} />
                )}
                {activeTab === 'expenses' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <h3>Expenses</h3>
                                {isFinancial && (
                                    <div style={{ background: 'var(--bg-primary)', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: '600', fontSize: '0.9rem' }}>
                                        Total: ${(project.expenses || []).reduce((sum, exp) => sum + exp.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                )}
                            </div>
                            <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}>+ Add Expense</button>
                        </div>
                        {project.expenses && project.expenses.length > 0 ? (
                            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Amount / Notes</th>
                                            <th>Type</th>
                                            <th>Billable</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.expenses.map(exp => (
                                            <tr key={exp.id} onClick={() => {setEditingExpense(exp); setShowExpenseForm(true);}} style={{ cursor: 'pointer' }}>
                                                <td>
                                                    <div style={{ fontWeight: '500' }}>
                                                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{exp.id}</span>
                                                        ${exp.amount.toFixed(2)}
                                                    </div>
                                                    {exp.notes && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {exp.notes.length > 50 ? exp.notes.substring(0, 50) + '...' : exp.notes}
                                                        </div>
                                                    )}
                                                    {exp.attachments && exp.attachments.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                            {exp.attachments.map(att => (
                                                                <a key={att.id} href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadAttachment(att); }} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem', textDecoration: 'none' }} title={att.filename}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                                    File
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td><span className="badge" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>{exp.expense_type}</span></td>
                                                <td>
                                                    {exp.billable ? (
                                                        <span className="status-badge" style={{ backgroundColor: '#22c55e20', color: '#22c55e', borderColor: '#22c55e' }}>Yes</span>
                                                    ) : (
                                                        <span className="status-badge" style={{ backgroundColor: '#64748b20', color: '#64748b', borderColor: '#64748b' }}>No</span>
                                                    )}
                                                </td>
                                                <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                                                    {new Date(exp.date_time).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingExpense(exp); setShowExpenseForm(true); }}
                                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                            title="Edit"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                        <button
                                                            onClick={async (e) => { 
                                                                e.stopPropagation(); 
                                                                if(!confirm("Are you sure?")) return;
                                                                try {
                                                                    await api.delete(`/expenses/${exp.id}`);
                                                                    fetchProject();
                                                                } catch (err) {
                                                                    alert("Delete failed.");
                                                                }
                                                            }}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                            title="Delete"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted">No expenses recorded for this project.</p>
                        )}
                        
                        {showExpenseForm && (
                            <Modal onClose={() => setShowExpenseForm(false)}>
                                <ExpenseForm 
                                    projectId={project.id} 
                                    expense={editingExpense}
                                    onSave={() => {
                                        setShowExpenseForm(false);
                                        fetchProject(); // Reload project to fetch newly synced expenses
                                    }} 
                                    onCancel={() => setShowExpenseForm(false)} 
                                />
                            </Modal>
                        )}
                    </div>
                )}
            </div>

            {/* Contextual Messaging / Chat widget */}
            <button 
                onClick={() => setShowChat(!showChat)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                title="Project Chat"
            >
                {showChat ? (
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 
                ) : (
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                )}
            </button>

            {showChat && (
                <div style={{
                    position: 'fixed',
                    bottom: '5.5rem',
                    right: '2rem',
                    height: '450px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 1000,
                    display: 'flex'
                }}>
                     <EntityChat 
                         entityType="project" 
                         entityId={project.id} 
                         entityTitle={project.name} 
                         onClose={() => setShowChat(false)} 
                     />
                </div>
            )}
            {showCloneModal && (
                <Modal onClose={() => setShowCloneModal(false)}>
                    <h2>Clone Project</h2>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Clone this project's details to a new project.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                checked={cloneOptions.clone_milestones} 
                                onChange={e => setCloneOptions(prev => ({ ...prev, clone_milestones: e.target.checked }))} 
                            />
                            Clone Milestones
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                checked={cloneOptions.clone_tasks} 
                                onChange={e => setCloneOptions(prev => ({ ...prev, clone_tasks: e.target.checked }))} 
                            />
                            Clone Tasks
                        </label>
                        <div className="form-group">
                            <label>Link to Lead (Optional)</label>
                            <select 
                                className="form-input" 
                                value={cloneOptions.link_to_lead_id} 
                                onChange={e => setCloneOptions(prev => ({ ...prev, link_to_lead_id: e.target.value }))}
                            >
                                <option value="">-- No Lead --</option>
                                {leads.map(l => (
                                    <option key={l.id} value={l.id}>{l.name} - {l.status}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowCloneModal(false)} className="btn btn-secondary" disabled={cloning}>Cancel</button>
                        <button 
                            className="btn btn-primary" 
                            disabled={cloning}
                            onClick={async () => {
                                setCloning(true);
                                try {
                                    const payload = {
                                        clone_milestones: cloneOptions.clone_milestones,
                                        clone_tasks: cloneOptions.clone_tasks,
                                        link_to_lead_id: cloneOptions.link_to_lead_id ? parseInt(cloneOptions.link_to_lead_id) : null
                                    };
                                    const res = await api.post(`/projects/${project.id}/clone`, payload);
                                    setShowCloneModal(false);
                                    navigate(`/portal/projects/${res.id}`);
                                } catch(err) {
                                    console.error("Failed to clone", err);
                                    alert(err.response?.data?.detail || "Failed to clone project");
                                } finally {
                                    setCloning(false);
                                }
                            }}
                        >
                            {cloning ? 'Cloning...' : 'Clone'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProjectDetails;
