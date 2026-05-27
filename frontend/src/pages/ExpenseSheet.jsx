import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';



const EXPENSE_TYPES = [
    "Hardware",
    "T&E",
    "Meal",
    "Parking",
    "Hotel",
    "Flight",
    "Car Rental",
    "Shipping",
    "Software",
    "Contractor",
    "Tools"
];

const ExpenseSheet = () => {
    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);

    const [expenses, setExpenses] = useState([]);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    // Track rows being edited locally before saving
    // A row can be a newly created row (id: `new-${Date.now()}`) or an existing expense loaded from DB
    const [rows, setRows] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date_time', direction: 'desc' });

    const activeTargetUser = selectedEmployee ? users.find(u => u.id === parseInt(selectedEmployee)) : user;
    const targetLoc = locations.find(l => l.id === activeTargetUser?.location_id);
    const locName = activeTargetUser?.location?.name || targetLoc?.name || '';
    const isAsia = locName.toLowerCase().includes('asia');


    const sortedRows = React.useMemo(() => {
        let sortableRows = [...rows];
        if (sortConfig !== null) {
            sortableRows.sort((a, b) => {
                if (a.isNew && !b.isNew) return -1;
                if (!a.isNew && b.isNew) return 1;

                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'project_id') {
                    const taskA = projects.find(t => t.id === aVal);
                    const taskB = projects.find(t => t.id === bVal);
                    aVal = taskA ? taskA.name : '';
                    bVal = taskB ? taskB.name : '';
                } else if (sortConfig.key === 'user_id') {
                    const userA = users.find(u => u.id === aVal);
                    const userB = users.find(u => u.id === bVal);
                    aVal = userA ? userA.username : '';
                    bVal = userB ? userB.username : '';
                } else if (sortConfig.key === 'amount') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = aVal || '';
                    bVal = bVal || '';
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableRows;
    }, [rows, sortConfig, projects, users]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const validRows = rows.filter(r => r.date_time && parseFloat(r.amount) > 0);
    const totalEntries = validRows.length;
    const totalAmount = validRows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, selectedEmployee, selectedProjectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let expenseUrl = `/expenses/?start_date=${startDate}&end_date=${endDate}`;
            if (selectedEmployee && isFinancial) {
                expenseUrl += `&user_id=${selectedEmployee}`;
            }
            if (selectedProjectId) {
                expenseUrl = `/projects/${selectedProjectId}/expenses`;
            }

            // Fetch relevant data
            const [expensesRes, projectsRes, locationsRes, milestonesRes] = await Promise.all([
                api.get(expenseUrl),
                api.get('/projects/'),
                api.get('/locations/'),
                api.get('/milestones/')
            ]);
            
            let usersRes = [];
            if (isFinancial) {
                usersRes = await api.get('/users/');
                setUsers(usersRes.filter(u => u.is_active && u.is_employee));
            }

            setExpenses(expensesRes);
            setProjects(projectsRes);
            setLocations(locationsRes);
            setMilestones(milestonesRes.filter(m => !m.is_completed)); // Only show active milestones

            // Sync database expenses to local grid row state
            setRows(expensesRes.map(e => ({
                isNew: false,
                id: e.id,
                project_id: e.project_id || '',
                milestone_id: e.milestone_id || '',
                user_id: e.user_id || user?.id,
                notes: e.notes || '',
                merchant_name: e.merchant_name || '',
                date_time: e.date_time ? new Date(e.date_time).toISOString().split('T')[0] : '',
                amount: e.amount ? parseFloat(e.amount).toFixed(2) : parseFloat(0).toFixed(2),
                expense_type: e.expense_type || 'T&E',
                status: e.status || 'Draft',
                billable: e.billable !== false, // default true
                isLocked: e.status === 'Locked' || e.status === 'Approved',
                isDirty: false
            })));
            
        } catch (err) {
            console.error("Failed to load expense data:", err);
            alert("Error loading expenses.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        const newRow = {
            isNew: true,
            id: `new-${Date.now()}`,
            project_id: projects.length > 0 ? projects[0].id : '',
            milestone_id: '',
            user_id: user?.id,
            merchant_name: '',
            notes: '',
            date_time: new Date().toISOString().split('T')[0],
            amount: parseFloat(0).toFixed(2),
            expense_type: 'T&E',
            status: 'Draft',
            billable: true,
            isLocked: false,
            isDirty: true
        };
        setRows([newRow, ...rows]);
    };

    const handleRowChange = (id, field, value) => {
        const row = rows.find(r => r.id === id);
        if (row && row.isLocked) return; // Prevent edits if locked
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value, isDirty: true };
                // Cascade reset milestone if project changes
                if (field === 'project_id') {
                    updatedRow.milestone_id = '';
                }
                return updatedRow;
            }
            return row;
        }));
    };

    const handleRemoveNewRow = (id) => {
        setRows(prev => prev.filter(row => row.id !== id));
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Delete this expense entry forever?")) return;
        try {
            await api.delete(`/expenses/${id}`);
            setRows(prev => prev.filter(row => row.id !== id));
        } catch (err) {
            console.error("Failed to delete expense:", err);
            alert("Error deleting expense.");
        }
    };

    const validateRow = (row) => {
        if (!row.project_id) return "Project is required";
        if (!row.date_time) return "Date is required";
        if (!row.notes.trim()) return "Description/Notes is required";
        if (parseFloat(row.amount) <= 0) return "Amount must be greater than 0";

        // Prevent future dates natively
        const selectedDateStr = row.date_time;
        const selectedDateTime = new Date(`${selectedDateStr}T00:00:00`);
        if (selectedDateTime > new Date()) {
            return "Invalid future date selected.";
        }
        return null;
    };

    const handleSaveAll = async () => {
        const dirtyRows = rows.filter(r => r.isDirty);
        if (dirtyRows.length === 0) {
            alert("No changes to save.");
            return;
        }

        // Validate all dirty rows before sending any requests
        for (let row of dirtyRows) {
            const error = validateRow(row);
            if (error) {
                alert(`Error on row items: ${error}`);
                return;
            }
        }

        setLoading(true);
        try {
            for (let row of dirtyRows) {
                const payload = {
                    project_id: parseInt(row.project_id),
                    milestone_id: row.milestone_id ? parseInt(row.milestone_id) : null,
                    date_time: `${row.date_time}T12:00:00`,
                    amount: parseFloat(row.amount),
                    billable: !!row.billable,
                    merchant_name: row.merchant_name,
                    expense_type: row.expense_type || 'T&E',
                    notes: row.notes,
                    user_id: row.user_id,
                };

                if (row.isNew) {
                    await api.post(`/projects/${row.project_id}/expenses`, payload);
                } else {
                    await api.put(`/expenses/${row.id}`, payload);
                }
            }
            alert("Expenses saved successfully!");
            fetchData(); // Reload everything cleanly
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to save expenses: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReport = async () => {
        const draftIds = rows.filter(r => !r.isNew && r.status === 'Draft' && r.project_id == selectedProjectId).map(r => parseInt(r.id));
        
        if (!selectedProjectId) {
            alert("Please select a specific project first to submit its expenses.");
            return;
        }

        if (draftIds.length === 0) {
            alert("No draft expenses to submit for this project.");
            return;
        }

        if (rows.some(r => r.isDirty)) {
            alert("Please save all changes before submitting.");
            return;
        }

        if (!window.confirm(`Submit ${draftIds.length} draft expenses for project approval?`)) return;

        setLoading(true);
        try {
            await api.post(`/expenses/bulk-submit`, { expense_ids: draftIds });
            alert("Expenses submitted for approval!");
            fetchData();
        } catch (err) {
            alert(`Failed to submit: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && rows.length === 0) return <div style={{ padding: '2rem' }}>Loading Expense Sheet...</div>;

    const rowColumns = [
        { header: 'Date', accessor: 'date_time' },
        { header: 'Employee', accessor: (r) => { 
            const u = users.find(x => x.id === r.user_id); 
            return u ? u.username : (r.user_id === user?.id ? user?.username : '-'); 
        } },
        { header: 'Project', accessor: (r) => {
            const p = projects.find(x => x.id === r.project_id);
            return p ? p.name : '-';
        } },
        { header: 'Merchant', accessor: 'merchant_name' },
        { header: 'Milestone', accessor: (r) => {
            const m = milestones.find(x => x.id === r.milestone_id);
            return m ? m.name : '-';
        } },
        { header: 'Type', accessor: 'expense_type' },
        { header: 'Billable', accessor: (r) => r.billable ? 'Yes' : 'No' },
        { header: 'Amount ($)', accessor: (r) => `$${parseFloat(r.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
        { header: 'Description', accessor: 'notes' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Expense Sheet</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Log reimbursements and project-related expenses synchronously across multiple projects.</p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        <div style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <strong style={{ color: 'var(--primary)' }}>{totalEntries}</strong> Total Entries
                        </div>
                        <div style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <strong style={{ color: 'var(--primary)' }}>${totalAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong> Total Amount
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Project Filter</span>
                        <select 
                            value={selectedProjectId} 
                            onChange={e => setSelectedProjectId(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>#{p.id} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>From</span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>To</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                        />
                    </div>
                    
                    {isFinancial && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Employee</span>
                            <select 
                                value={selectedEmployee} 
                                onChange={e => setSelectedEmployee(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                            >
                                <option value="">All Employees</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => {
                            const filteredRows = rows.filter(r => !r.isNew && r.date_time);
                            import('../utils/exportUtils').then(({ exportToCSV }) => {
                                exportToCSV(filteredRows, rowColumns, 'expenses_export.csv');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={() => {
                            const filteredRows = rows.filter(r => !r.isNew && r.date_time);
                            
                            const actUser = selectedEmployee ? users.find(u => u.id === parseInt(selectedEmployee)) : user;
                            const actUserName = actUser ? actUser.username : 'Unknown';
                            
                            const projLabel = selectedProjectId ? projects.find(p => p.id === parseInt(selectedProjectId))?.name : "All_Projects";
                            const matchWeekLabel = `Dates: ${startDate} to ${endDate}`;
                            const currentYear = startDate ? startDate.split('-')[0] : new Date().getFullYear();
                            
                            const fileName = `ExpenseReport_${actUserName}_${projLabel}_${currentYear}.pdf`;
                            
                            const meta = {
                                empId: actUser?.id || 'N/A',
                                empName: actUser ? `${actUser.first_name || ''} ${actUser.last_name || ''}`.trim() : 'Unknown',
                                weekRange: matchWeekLabel,
                                totalEntries: totalEntries,
                                totalAmount: totalAmount.toFixed(2)
                            };
                            
                            import('../utils/exportUtils').then(({ exportExpenseSheetPDF }) => {
                                exportExpenseSheetPDF(filteredRows, rowColumns, meta, fileName);
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <button onClick={handleAddRow} className="btn-secondary">
                        + Add Row
                    </button>
                    {selectedProjectId && (
                        <button onClick={handleSubmitReport} className="btn-secondary" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                            Submit Project Expenses
                        </button>
                    )}
                    <button onClick={handleSaveAll} className="btn-primary">
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '1000px' }}>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date_time')} style={{ width: '12%', cursor: 'pointer' }}>Date {sortConfig?.key === 'date_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            {isFinancial && <th onClick={() => handleSort('user_id')} style={{ width: '10%', cursor: 'pointer' }}>Employee {sortConfig?.key === 'user_id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
                            <th onClick={() => handleSort('project_id')} style={{ width: '15%', cursor: 'pointer' }}>Project {sortConfig?.key === 'project_id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('merchant_name')} style={{ width: '12%', cursor: 'pointer' }}>Merchant {sortConfig?.key === 'merchant_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('milestone_id')} style={{ width: '12%', cursor: 'pointer' }}>Milestone (Opt) {sortConfig?.key === 'milestone_id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('status')} style={{ width: '8%', cursor: 'pointer' }}>Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('expense_type')} style={{ width: '10%', cursor: 'pointer' }}>Category {sortConfig?.key === 'expense_type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('billable')} style={{ width: '8%', cursor: 'pointer' }}>Billable {sortConfig?.key === 'billable' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('amount')} style={{ width: '10%', cursor: 'pointer' }}>Amount ($) {sortConfig?.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('notes')} style={{ width: '18%', cursor: 'pointer' }}>Description {sortConfig?.key === 'notes' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th style={{ width: '5%' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={isFinancial ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    No expense entries found for this period. Click "+ Add Row" to create one!
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map(row => (
                                <tr key={row.id} style={{ background: row.isDirty ? 'var(--bg-dark)' : 'transparent' }}>
                                    <td>
                                        <input 
                                            type="date" 
                                            value={row.date_time} 
                                            onChange={(e) => handleRowChange(row.id, 'date_time', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </td>
                                    {isFinancial && (
                                        <td>
                                            <select 
                                                value={row.user_id} 
                                                onChange={(e) => handleRowChange(row.id, 'user_id', parseInt(e.target.value))}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            >
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                    <td>
                                        <select 
                                            value={row.project_id} 
                                            onChange={(e) => handleRowChange(row.id, 'project_id', parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">-- Select Project --</option>
                                            {projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').map(p => (
                                                <option key={p.id} value={p.id}>#{p.id} - {p.name}</option>
                                            ))}
                                            {!row.isNew && row.project_id && !projects.find(p => p.id === row.project_id && p.status !== 'Completed' && p.status !== 'Cancelled') && (
                                                <option value={row.project_id}>Project #{row.project_id} (Closed/Filtered)</option>
                                            )}
                                        </select>
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={row.merchant_name || ''} 
                                            placeholder="Eg. Delta"
                                            onChange={(e) => handleRowChange(row.id, 'merchant_name', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            disabled={row.isLocked}
                                        />
                                    </td>
                                    <td>
                                        <select 
                                            value={row.milestone_id || ''} 
                                            onChange={(e) => handleRowChange(row.id, 'milestone_id', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            disabled={!row.project_id}
                                        >
                                            <option value="">- None -</option>
                                            {row.project_id ? milestones.filter(m => m.project_id === parseInt(row.project_id)).map(m => (
                                                <option key={m.id} value={m.id}>#{m.id} - {m.name}</option>
                                            )) : null}
                                            {!row.isNew && row.milestone_id && !milestones.find(m => m.id === row.milestone_id && m.project_id === parseInt(row.project_id)) && (
                                                <option value={row.milestone_id}>Milestone #{row.milestone_id} (Closed/Filtered)</option>
                                            )}
                                        </select>
                                    </td>
                                    <td>
                                        <select 
                                            value={row.expense_type} 
                                            onChange={(e) => handleRowChange(row.id, 'expense_type', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            disabled={row.isLocked}
                                        >
                                            {EXPENSE_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <div style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold',
                                            background: row.status === 'Approved' || row.status === 'Locked' ? 'rgba(34, 197, 94, 0.1)' : 
                                                        row.status === 'Submitted' ? 'rgba(56, 189, 248, 0.1)' : 
                                                        row.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-dark)',
                                            color: row.status === 'Approved' || row.status === 'Locked' ? '#4ade80' : 
                                                   row.status === 'Submitted' ? '#38bdf8' : 
                                                   row.status === 'Rejected' ? '#ef4444' : 'var(--text-muted)'
                                        }}>
                                            {row.status}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={row.billable} 
                                            onChange={(e) => handleRowChange(row.id, 'billable', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={row.amount} 
                                            onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                                            onBlur={(e) => {
                                                if (e.target.value) {
                                                    handleRowChange(row.id, 'amount', parseFloat(e.target.value).toFixed(2));
                                                }
                                            }}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={row.notes} 
                                            placeholder="What was purchased?"
                                            onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {row.isNew ? (
                                            <button 
                                                onClick={() => handleRemoveNewRow(row.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                title="Remove Row"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleDeleteEvent(row.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                title="Delete Expense Log"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpenseSheet;
