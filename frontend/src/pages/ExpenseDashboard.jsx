import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import ExpenseForm from './ExpenseForm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../utils/logoBase64';
import { useSystem } from '../context/SystemContext';

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

export default function ExpenseDashboard() {
    const { systemState } = useSystem();
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [editingExpense, setEditingExpense] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [showForm, setShowForm] = useState(false);
    
    // Filters
    const [filterType, setFilterType] = useState('all');
    const [filterBillable, setFilterBillable] = useState('all');
    const [filterProject, setFilterProject] = useState('all');
    const [filterProjectState, setFilterProjectState] = useState('hide_closed');
    const [filterUser, setFilterUser] = useState('all');
    const [users, setUsers] = useState([]);
    
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const fetchExpenses = async () => {
        try {
            const data = await api.get('/expenses/');
            setExpenses(data);
        } catch (err) {
            console.error("Failed to load expenses", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
        api.get('/projects/').then(setProjects).catch(console.error);
        api.get('/users/').then(setUsers).catch(console.error);
    }, []);

    const handleDelete = async (id) => {
        if(!confirm("Are you sure?")) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (err) {
            alert("Delete failed.");
        }
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

    const filteredExpenses = expenses.filter(exp => {
        if (filterType !== 'all' && exp.expense_type !== filterType) return false;
        if (filterProject !== 'all' && exp.project_id.toString() !== filterProject) return false;
        if (filterUser !== 'all' && exp.user_id?.toString() !== filterUser) return false;
        
        if (filterProjectState === 'hide_closed') {
            const proj = projects.find(p => p.id === exp.project_id);
            if (proj) {
                const status = proj.status?.toLowerCase();
                if (status === 'completed' || status === 'archived' || status === 'closed') {
                    return false;
                }
            }
        }

        if (filterBillable !== 'all') {
            const isBillable = filterBillable === 'yes';
            if (exp.billable !== isBillable) return false;
        }
        return true;
    });

    const totalCost = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

    const exportCSV = () => {
        const headers = ['ID', 'Date', 'Type', 'Project', 'User', 'Billable', 'Amount', 'Notes'];
        const rows = filteredExpenses.map(exp => [
            exp.id,
            new Date(exp.date_time).toLocaleDateString(),
            exp.expense_type,
            `"${(exp.project?.name || exp.project_id).toString().replace(/"/g, '""')}"`,
            `"${(exp.user?.username || 'Unassigned').replace(/"/g, '""')}"`,
            exp.billable ? 'Yes' : 'No',
            exp.amount.toFixed(2),
            `"${(exp.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ]);
        
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'filtered_expenses.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const exportPDF = () => {
        const doc = new jsPDF();

        // Add Logo to the right
        const pdfWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 60; 
        const logoHeight = 41;
        doc.addImage(LOGO_BASE64, 'PNG', pdfWidth - 14 - logoWidth, 8, logoWidth, logoHeight);

        doc.text("Expense Report", 14, 15);
        
        const tableColumn = ["Date", "Type", "Project", "User", "Billable", "Amount"];
        const tableRows = [];

        filteredExpenses.forEach(exp => {
            const expData = [
                new Date(exp.date_time).toLocaleDateString(),
                exp.expense_type,
                exp.project?.name || exp.project_id,
                exp.user?.username || 'Unassigned',
                exp.billable ? 'Yes' : 'No',
                `$${exp.amount.toFixed(2)}`
            ];
            tableRows.push(expData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });

        const finalY = doc.lastAutoTable?.finalY || 20;
        doc.text(`Total: $${totalCost.toFixed(2)}`, 14, finalY + 10);

        const pdfHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleString()} - PACE v${systemState?.app_version || '1.0.0'}`, 14, pdfHeight - 10);

        doc.save('filtered_expenses.pdf');
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2>Expense Tracking</h2>
                    <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }} title="Grid View">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                        <button onClick={() => setViewMode('table')} style={{ background: viewMode === 'table' ? 'var(--primary)' : 'transparent', color: viewMode === 'table' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }} title="List View">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </button>
                    <button onClick={exportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setShowForm(true); }} style={{ marginLeft: '0.5rem' }}>+ New Expense</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Project Filter</label>
                    <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Project Status</label>
                    <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={filterProjectState} onChange={e => setFilterProjectState(e.target.value)}>
                        <option value="hide_closed">Active Only</option>
                        <option value="all">All Projects</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Type Filter</label>
                    <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
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
                {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>User Filter</label>
                        <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                            <option value="all">All Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Billable Filter</label>
                    <select className="form-input" style={{ width: 'auto', minWidth: '150px' }} value={filterBillable} onChange={e => setFilterBillable(e.target.value)}>
                        <option value="all">All Expenses</option>
                        <option value="yes">Billable Only</option>
                        <option value="no">Non-Billable Only</option>
                    </select>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtered Total</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${totalCost.toFixed(2)}</div>
                </div>
            </div>

            {loading ? (
                <div>Loading dashboard...</div>
            ) :             viewMode === 'grid' ? (
                <div className="grid-container">
                    {filteredExpenses.map(exp => (
                        <div key={exp.id} className="card" onClick={() => {setEditingExpense(exp); setShowForm(true);}} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `4px solid ${exp.billable ? '#22c55e' : 'var(--border)'}`, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingExpense(exp); setShowForm(true); }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                    title={exp.status === 'Locked' || exp.status === 'Approved' ? "View Expense" : "Edit Expense"}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                {!(exp.status === 'Locked' || exp.status === 'Approved') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                        title="Delete Expense"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '50px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="badge" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>{exp.expense_type}</span>
                                    {exp.billable && (
                                        <span className="status-badge" style={{ backgroundColor: '#22c55e20', color: '#22c55e', borderColor: '#22c55e' }}>Billable</span>
                                    )}
                                    {exp.status && exp.status !== 'Draft' && (
                                        <span className="status-badge" style={{ backgroundColor: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b98122' : exp.status === 'Submitted' ? '#3b82f622' : exp.status === 'Rejected' ? '#ef444422' : '#f59e0b22', color: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b981' : exp.status === 'Submitted' ? '#3b82f6' : exp.status === 'Rejected' ? '#ef4444' : '#f59e0b', borderColor: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b981' : exp.status === 'Submitted' ? '#3b82f6' : exp.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>
                                            {exp.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ fontWeight: '500', fontSize: '1rem', margin: '0.25rem 0' }}>
                                <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{exp.id}</span>
                                ${exp.amount.toFixed(2)}
                            </div>

                            <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--text-main)', flexGrow: 1 }}>
                                {exp.notes && exp.notes.length > 60 ? exp.notes.substring(0, 60) + '...' : exp.notes || <span style={{color: 'var(--text-muted)'}}>No description</span>}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    <Link to={`/portal/projects/${exp.project_id}`} onClick={e => e.stopPropagation()} style={{color: 'inherit', textDecoration: 'none'}}>{exp.project?.name || `Project #${exp.project_id}`}</Link>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontWeight: '500' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {new Date(exp.date_time).toLocaleDateString()}
                                </div>
                            </div>

                            {exp.attachments && exp.attachments.length > 0 && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {exp.attachments.map(att => (
                                        <a key={att.id} href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(att); }} style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                            {att.filename}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredExpenses.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No expenses found matching the criteria.</div>
                    )}
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Amount / Notes</th>
                                <th>Type</th>
                                <th>Project</th>
                                <th>Billable</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} onClick={() => {setEditingExpense(exp); setShowForm(true);}} style={{ cursor: 'pointer' }}>
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
                                                    <a key={att.id} href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(att); }} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem', textDecoration: 'none' }} title={att.filename}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                        File
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td><span className="badge" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)' }}>{exp.expense_type}</span></td>
                                    <td>
                                        <Link to={`/portal/projects/${exp.project_id}`} onClick={e => e.stopPropagation()} style={{color: 'var(--text-main)', textDecoration: 'none'}}>
                                            {exp.project?.name || `Project #${exp.project_id}`}
                                        </Link>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                            {exp.billable ? (
                                                <span className="status-badge" style={{ backgroundColor: '#22c55e20', color: '#22c55e', borderColor: '#22c55e' }}>Yes (Billable)</span>
                                            ) : (
                                                <span className="status-badge" style={{ backgroundColor: '#64748b20', color: '#64748b', borderColor: '#64748b' }}>No</span>
                                            )}
                                            {exp.status && exp.status !== 'Draft' && (
                                                <span className="status-badge" style={{ backgroundColor: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b98122' : exp.status === 'Submitted' ? '#3b82f622' : exp.status === 'Rejected' ? '#ef444422' : '#f59e0b22', color: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b981' : exp.status === 'Submitted' ? '#3b82f6' : exp.status === 'Rejected' ? '#ef4444' : '#f59e0b', borderColor: exp.status === 'Approved' || exp.status === 'Locked' ? '#10b981' : exp.status === 'Submitted' ? '#3b82f6' : exp.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>
                                                    {exp.status}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                                        {new Date(exp.date_time).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingExpense(exp); setShowForm(true); }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                title={exp.status === 'Locked' || exp.status === 'Approved' ? "View Expense" : "Edit Expense"}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            {!(exp.status === 'Locked' || exp.status === 'Approved') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    title="Delete"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                                {filteredExpenses.length === 0 && (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No expenses found matching the criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                </div>
            )}

            {showForm && (
                <Modal onClose={() => setShowForm(false)}>
                    <ExpenseForm 
                        expense={editingExpense}
                        onSave={() => {
                            setShowForm(false);
                            fetchExpenses();
                        }}
                        onCancel={() => setShowForm(false)}
                    />
                </Modal>
            )}
        </div>
    );
}
