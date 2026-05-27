import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import OffboardWizard from '../components/OffboardWizard';
import { useAuth } from '../context/AuthContext';
import { useSystem } from '../context/SystemContext';

const SystemConfigWidget = () => {
    const { systemState, refreshSystemState } = useSystem();
    const [isEditing, setIsEditing] = useState(false);
    const [msg, setMsg] = useState('');
    const [ver, setVer] = useState('');
    const [active, setActive] = useState(false);
    
    useEffect(() => {
        if (systemState && !isEditing) {
            setMsg(systemState.announcement_message || '');
            setVer(systemState.app_version || '1.0.0');
            setActive(systemState.is_announcement_active || false);
        }
    }, [systemState, isEditing]);

    const handleSave = async () => {
        try {
            await api.put('/system/state', {
                announcement_message: msg,
                is_announcement_active: active,
                app_version: ver
            });
            await refreshSystemState();
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            alert("Failed to save system config");
        }
    };

    if (!systemState) return null;

    return (
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    ⚙️ Global System Configuration
                </h3>
                {!isEditing ? (
                    <button className="btn-secondary" onClick={() => setIsEditing(true)}>Edit Configuration</button>
                ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleSave}>Push to Network</button>
                    </div>
                )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 2fr)', gap: '1.5rem', opacity: isEditing ? 1 : 0.7, pointerEvents: isEditing ? 'auto' : 'none' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>App Version</label>
                    <input type="text" className="form-input" value={ver} onChange={(e) => setVer(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status Banner Engine:</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                            <span style={{ color: active ? '#ef4444' : 'var(--text-main)', fontWeight: active ? 'bold' : 'normal' }}>
                                {active ? "BROADCAST ACTIVE" : "Offline"}
                            </span>
                        </label>
                    </div>
                    <input type="text" className="form-input" placeholder="Enter broadcast message here..." value={msg} onChange={(e) => setMsg(e.target.value)} />
                </div>
            </div>
        </div>
    );
};

const UserList = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // Default to grid to match other pages

    const [locations, setLocations] = useState([]);
    const [error, setError] = useState(null);
    const [offboardUser, setOffboardUser] = useState(null);

    const triggerRefresh = () => {
        setLoading(true);
        api.get('/users/').then(data => setUsers(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const [data, locData] = await Promise.all([
                    api.get('/users/'),
                    api.get('/locations/').catch(() => []) 
                ]);
                
                setLocations(Array.isArray(locData) ? locData : []);
                
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    console.error("API returned non-array:", data);
                    setUsers([]);
                    setError("Invalid data received from server.");
                }
            } catch (err) {
                console.error("Failed to load users", err);
                setError("Failed to load users. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const [bulkUsers, setBulkUsers] = useState([]);
    const [isSavingBulk, setIsSavingBulk] = useState(false);
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        api.get('/customers/').then(data => setCustomers(Array.isArray(data) ? data : []));
    }, []);

    const handleBulkChange = (id, field, value) => {
        setBulkUsers(prev => prev.map(u => {
            if (u.id === id) {
                return { ...u, [field]: value, isDirty: true };
            }
            return u;
        }));
    };

    const handleBulkSave = async () => {
        const dirtyUsers = bulkUsers.filter(u => u.isDirty);
        if (dirtyUsers.length === 0) return;

        setIsSavingBulk(true);
        try {
            await Promise.all(dirtyUsers.map(async u => {
                const payload = {
                    first_name: u.first_name,
                    last_name: u.last_name,
                    role: u.role,
                    department: u.department,
                    region: u.region,
                    title: u.title,
                    customer_id: u.customer_id === 'none' ? null : u.customer_id,
                    location_id: u.location_id === 'none' ? null : u.location_id,
                    phone: u.phone,
                    start_date: u.start_date,
                    manager_id: u.manager_id === 'none' ? null : u.manager_id,
                    is_employee: u.is_employee,
                    has_financial_access: u.has_financial_access,
                    locked_out: u.locked_out
                };
                if (!payload.customer_id && payload.customer_id !== null && u.customer) payload.customer_id = u.customer.id;
                if (!payload.location_id && payload.location_id !== null && u.location_id) payload.location_id = u.location_id;
                if (!payload.manager_id && payload.manager_id !== null && u.manager_id) payload.manager_id = u.manager_id;
                
                await api.put(`/users/${u.id}`, payload);
            }));
            
            triggerRefresh();
            setViewMode('grid');
        } catch (err) {
            console.error(err);
            alert("Failed to save some users during bulk edit. Check console.");
        } finally {
            setIsSavingBulk(false);
        }
    };

    const [sortField, setSortField] = useState('username');
    const [sortOrder, setSortOrder] = useState('asc');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const [hideLockedOut, setHideLockedOut] = useState(false);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [viewScope, setViewScope] = useState('company');

    const filteredUsers = users.filter(u => {
        if (viewScope === 'team' && u.manager_id !== currentUser?.id) return false;
        if (hideLockedOut && u.locked_out) return false;
        if (filterCustomer && (u.customer?.name !== filterCustomer)) return false;
        if (filterRole && u.role !== filterRole) return false;
        if (filterEmployee === 'yes' && !u.is_employee) return false;
        if (filterEmployee === 'no' && u.is_employee) return false;
        return true;
    });

    const uniqueCustomers = [...new Set(users.map(u => u.customer?.name).filter(Boolean))].sort();
    const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))].sort();

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Derived or fallback
        if (sortField === 'is_employee') {
            aValue = a.is_employee ? 'Yes' : 'No';
            bValue = b.is_employee ? 'Yes' : 'No';
        } else if (sortField === 'customer') {
            aValue = a.customer ? a.customer.name : '';
            bValue = b.customer ? b.customer.name : '';
        } else if (sortField === 'locked_out') {
            aValue = a.locked_out ? 'Yes' : 'No';
            bValue = b.locked_out ? 'Yes' : 'No';
        }

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    useEffect(() => {
        if (viewMode === 'bulk') {
            setBulkUsers(sortedUsers.map(u => ({ ...u, isDirty: false })));
        }
    }, [viewMode, users, sortField, sortOrder, viewScope, hideLockedOut, filterCustomer, filterRole, filterEmployee]);

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

    return (
        <div className="dashboard-container">
            {currentUser?.role === 'admin' && <SystemConfigWidget />}
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2>Users</h2>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {viewMode === 'grid' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                                <select
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    <option value="username" style={{ color: 'black' }}>Username</option>
                                    <option value="email" style={{ color: 'black' }}>Email</option>
                                    <option value="role" style={{ color: 'black' }}>Role</option>
                                    <option value="customer" style={{ color: 'black' }}>Customer</option>
                                    <option value="is_employee" style={{ color: 'black' }}>Employee</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                                >
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3H3V10H10V3Z" /><path d="M21 3H14V10H21V3Z" /><path d="M21 14H14V21H21V14Z" /><path d="M10 14H3V21H10V14Z" /></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6H21" /><path d="M8 12H21" /><path d="M8 18H21" /><path d="M3 6H3.01" /><path d="M3 12H3.01" /><path d="M3 18H3.01" /></svg>
                                </button>
                                {currentUser?.role?.toLowerCase() === 'admin' && (
                                    <button onClick={() => setViewMode('bulk')} style={{ background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent', color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px' }} title="Bulk Edit Mode">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                    </button>
                                )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {filteredUsers.length} Records Displayed
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>



                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                            value={filterCustomer}
                            onChange={(e) => setFilterCustomer(e.target.value)}
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', maxWidth: '120px' }}
                        >
                            <option value="">All Customers</option>
                            {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', maxWidth: '100px' }}
                        >
                            <option value="">All Roles</option>
                            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>

                        <select
                            value={filterEmployee}
                            onChange={(e) => setFilterEmployee(e.target.value)}
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem', maxWidth: '100px' }}
                        >
                            <option value="">All Types</option>
                            <option value="yes">Employee</option>
                            <option value="no">External</option>
                        </select>

                        <button onClick={() => {
                            const columns = [
                                { header: 'Username', accessor: 'username' },
                                { header: 'First Name', accessor: 'first_name' },
                                { header: 'Last Name', accessor: 'last_name' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone' },
                                { header: 'Department', accessor: 'department' },
                                { header: 'Title', accessor: 'title' },
                                { header: 'Start Date', accessor: (u) => u.start_date ? u.start_date.split('T')[0] : '-' },
                                { header: 'Last Login', accessor: (u) => u.last_login ? new Date(u.last_login).toLocaleString() : '-' },
                                { header: 'Role', accessor: 'role' },
                                { header: 'Manager', accessor: (u) => u.manager ? u.manager.username : '-' },
                                { header: 'Region', accessor: 'region' },
                                { header: 'Location', accessor: (u) => locations.find(l => l.id === u.location_id)?.name || '-' },
                                { header: 'Customer', accessor: (u) => u.customer ? u.customer.name : '-' },
                                { header: 'Employee', accessor: (u) => u.is_employee ? 'Yes' : 'No' },
                                { header: 'Financial Access', accessor: (u) => u.has_financial_access ? 'Yes' : 'No' },
                                { header: 'Locked Out', accessor: (u) => u.locked_out ? 'Yes' : 'No' }
                            ];
                            import('../utils/exportUtils').then(({ exportToCSV }) => {
                                exportToCSV(sortedUsers, columns, 'users.csv');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Username', accessor: 'username' },
                                { header: 'Name', accessor: (u) => u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : '' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone' },
                                { header: 'Department', accessor: 'department' },
                                { header: 'Title', accessor: 'title' },
                                { header: 'Last Login', accessor: (u) => u.last_login ? new Date(u.last_login).toLocaleDateString() : '-' },
                                { header: 'Role', accessor: 'role' },
                                { header: 'Manager', accessor: (u) => u.manager ? u.manager.username : '-' },
                                { header: 'Location', accessor: (u) => locations.find(l => l.id === u.location_id)?.name || '-' },
                                { header: 'Customer', accessor: (u) => u.customer ? u.customer.name : '-' },
                                { header: 'Employee', accessor: (u) => u.is_employee ? 'Yes' : 'No' },
                                { header: 'Fin Access', accessor: (u) => u.has_financial_access ? 'Yes' : 'No' },
                                { header: 'Locked Out', accessor: (u) => u.locked_out ? 'Yes' : 'No' }
                            ];
                            import('../utils/exportUtils').then(({ exportToPDF }) => {
                                exportToPDF(sortedUsers, columns, 'User List', 'users.pdf');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', marginRight: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={hideLockedOut}
                            onChange={(e) => setHideLockedOut(e.target.checked)}
                            style={{ marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                        />
                        Hide Locked Out
                    </label>

                    <Link to="/portal/users/new">
                        <button className="btn-primary">+ New User</button>
                    </Link>
                </div>
            </div>

            {viewMode === 'bulk' && currentUser?.role?.toLowerCase() === 'admin' ? (
                <BulkEditTable bulkUsers={bulkUsers} handleBulkChange={handleBulkChange} isSavingBulk={isSavingBulk} onSave={handleBulkSave} onCancel={() => setViewMode('grid')} customers={customers} locations={locations} allUsers={users} />
            ) : viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedUsers.map(u => (
                        <div key={u.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                                        {u.is_online && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 5px #22c55e' }} title="Online"></span>
                                        )}
                                    </h3>
                                    {u.first_name && u.last_name && (
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{u.username}</p>
                                    )}
                                    {(u.title || u.department) && (
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                            {u.title || ''}{u.title && u.department ? ' | ' : ''}{u.department || ''}
                                        </p>
                                    )}
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{u.email}</p>
                                    {u.phone && (
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>📞 {u.phone}</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                    <span className="status-badge status-active">{u.role}</span>
                                    {u.locked_out && <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Locked Out</span>}
                                </div>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {u.customer && (
                                    <div style={{ marginBottom: '0.25rem' }}>
                                        Customer: <strong style={{ color: 'var(--text-main)' }}>{u.customer.name}</strong>
                                    </div>
                                )}
                                {u.manager && (
                                    <div>
                                        Manager: <strong style={{ color: 'var(--text-main)' }}>{u.manager.username}</strong>
                                    </div>
                                )}
                                {u.region && u.region !== 'US/Headquarters' && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                        Region: <strong style={{ color: 'var(--text-main)' }}>{u.region}</strong>
                                    </div>
                                )}
                                {u.location_id && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                        Location: <strong style={{ color: 'var(--text-main)' }}>{locations.find(l => l.id === u.location_id)?.name || '-'}</strong>
                                    </div>
                                )}
                                {u.last_login && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                        Last Login: <span style={{ color: 'var(--text-main)' }}>{new Date(u.last_login).toLocaleString()}</span>
                                    </div>
                                )}
                                {u.home_latitude != null && u.home_longitude != null && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${u.home_latitude},${u.home_longitude}`} target="_blank" rel="noreferrer" style={{fontSize: '0.85rem', color: '#007bff', textDecoration: 'underline'}}>📍 View Home GPS on Maps</a>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    {u.is_employee ? 'Employee' : 'External'}
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {u.is_employee && u.is_active && !u.locked_out && (
                                        <button onClick={() => setOffboardUser(u)} title="Offboard User" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                                        </button>
                                    )}
                                    <Link to={`/portal/users/edit/${u.id}`} title="Edit User" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No users found.</p>}
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>User {sortField === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('first_name')} style={{ cursor: 'pointer' }}>Name {sortField === 'first_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>Department {sortField === 'department' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Title {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Phone</th>
                                <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>Role {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Manager</th>
                                <th>Region</th>
                                <th>Location</th>
                                <th>Last Login</th>
                                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer' }}>Customer {sortField === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('is_employee')} style={{ cursor: 'pointer' }}>Employee {sortField === 'is_employee' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {u.username}
                                                {u.is_online && (
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 5px #22c55e' }} title="Online"></span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                        </td>
                                        <td>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : '-'}</td>
                                        <td>{u.department || '-'}</td>
                                        <td>{u.title || '-'}</td>
                                        <td>{u.phone || '-'}</td>
                                        <td>
                                            {u.role}
                                            {u.locked_out && <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>(Locked)</span>}
                                        </td>
                                        <td>{u.manager ? u.manager.username : '-'}</td>
                                        <td>{u.region || 'US/Headquarters'}</td>
                                        <td>{locations.find(l => l.id === u.location_id)?.name || '-'}</td>
                                        <td>{u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</td>
                                        <td>{u.customer ? u.customer.name : '-'}</td>
                                        <td>
                                            {u.is_employee ? (
                                                <span className="status-badge status-active">Yes</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>No</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                {u.is_employee && u.is_active && !u.locked_out && (
                                                    <button onClick={() => setOffboardUser(u)} title="Offboard User" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                                                    </button>
                                                )}
                                                <Link to={`/portal/users/edit/${u.id}`} title="Edit User" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <OffboardWizard 
                isOpen={!!offboardUser}
                userToOffboard={offboardUser}
                onClose={() => setOffboardUser(null)}
                onComplete={triggerRefresh}
            />
        </div>
    );
};


const BulkEditTable = ({ bulkUsers, handleBulkChange, isSavingBulk, onSave, onCancel, customers, locations, allUsers }) => {
    const dirtyCount = bulkUsers.filter(u => u.isDirty).length;
    
    return (
        <div className="card" style={{ overflowX: 'auto', paddingBottom: '3rem' }}>
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Bulk Edit Mode: {bulkUsers.length} Users</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: dirtyCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {dirtyCount} unsaved changes
                    </span>
                    <button onClick={onCancel} className="btn-secondary" disabled={isSavingBulk}>Cancel</button>
                    <button onClick={onSave} className="btn-primary" disabled={isSavingBulk || dirtyCount === 0}>
                        {isSavingBulk ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>
            <table className="data-table" style={{ minWidth: '1800px' }}>
                <thead>
                    <tr>
                        <th style={{ width: '8%' }}>Username</th>
                        <th style={{ width: '8%' }}>First Name</th>
                        <th style={{ width: '8%' }}>Last Name</th>
                        <th style={{ width: '7%' }}>Role</th>
                        <th style={{ width: '8%' }}>Manager</th>
                        <th style={{ width: '8%' }}>Department</th>
                        <th style={{ width: '8%' }}>Region</th>
                        <th style={{ width: '8%' }}>Title</th>
                        <th style={{ width: '8%' }}>Customer</th>
                        <th style={{ width: '8%' }}>Location</th>
                        <th style={{ width: '8%' }}>Phone</th>
                        <th style={{ width: '8%' }}>Start Date</th>
                        <th style={{ width: '3%' }}>Emp?</th>
                        <th style={{ width: '3%' }}>Fin?</th>
                        <th style={{ width: '3%' }}>Lock?</th>
                    </tr>
                </thead>
                <tbody>
                    {bulkUsers.map(u => (
                        <tr key={u.id} style={{ background: u.isDirty ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.username}</td>
                            <td>
                                <input type="text" value={u.first_name || ''} onChange={(e) => handleBulkChange(u.id, 'first_name', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td>
                                <input type="text" value={u.last_name || ''} onChange={(e) => handleBulkChange(u.id, 'last_name', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td>
                                <select value={u.role || 'user'} onChange={(e) => handleBulkChange(u.id, 'role', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}>
                                    <option value="user">User</option>
                                    <option value="technician">Technician</option>
                                    <option value="manager">Manager</option>
                                    <option value="lead">Lead</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                            <td>
                                <select value={u.manager_id || 'none'} onChange={(e) => handleBulkChange(u.id, 'manager_id', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}>
                                    <option value="none">-- None --</option>
                                    {allUsers.filter(usr => usr.is_employee).map(usr => (
                                        <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <input type="text" value={u.department || ''} onChange={(e) => handleBulkChange(u.id, 'department', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td>
                                <select value={u.region || 'US/Headquarters'} onChange={(e) => handleBulkChange(u.id, 'region', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}>
                                    <option value="US/Headquarters">US/Headquarters</option>
                                    <option value="Triad Asia">Triad Asia</option>
                                </select>
                            </td>
                            <td>
                                <input type="text" value={u.title || ''} onChange={(e) => handleBulkChange(u.id, 'title', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td>
                                <select value={u.customer_id || 'none'} onChange={(e) => handleBulkChange(u.id, 'customer_id', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}>
                                    <option value="none">-- None --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </td>
                            <td>
                                <select value={u.location_id || 'none'} onChange={(e) => handleBulkChange(u.id, 'location_id', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }}>
                                    <option value="none">-- None --</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </td>
                            <td>
                                <input type="text" value={u.phone || ''} onChange={(e) => handleBulkChange(u.id, 'phone', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td>
                                <input type="date" value={u.start_date ? u.start_date.split('T')[0] : ''} onChange={(e) => handleBulkChange(u.id, 'start_date', e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', borderRadius: '4px' }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={u.is_employee || false} onChange={(e) => handleBulkChange(u.id, 'is_employee', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={u.has_financial_access || false} onChange={(e) => handleBulkChange(u.id, 'has_financial_access', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={u.locked_out || false} onChange={(e) => handleBulkChange(u.id, 'locked_out', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'magenta' }} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserList;
