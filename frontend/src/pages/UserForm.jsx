import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const UserForm = ({ onSuccess, onCancel, forceNew = false, defaultCustomerId = '', defaultIsEmployee = false }) => {
    const { id: paramId } = useParams();
    const id = forceNew ? null : paramId;
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = !!id;
    const [activeTab, setActiveTab] = useState('profile');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'user',
        is_employee: defaultIsEmployee,
        customer_id: defaultCustomerId,
        phone: '',
        start_date: '',
        last_login: '',
        manager_id: '',
        location_id: '',
        locked_out: false,
        login_enabled: false,
        needs_password_change: false,
        department: '',
        title: '',
        region: 'US/Headquarters',
        has_financial_access: false,
        home_address: '',
        home_latitude: '',
        home_longitude: '',
        annual_pto_allowance: 0.0,
        hourly_billing_rate: '',
        internal_cost_rate: ''
    });
    const [customers, setCustomers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]); // Potential Managers
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const handleAutoFetchGPS = async () => {
        if (!formData.home_address) {
            alert("Please type a real-world address first.");
            return;
        }
        setLoading(true);
        try {
            const data = await api.get(`/system/geocode?address=${encodeURIComponent(formData.home_address)}`);
            if (data && data.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    home_latitude: data[0].lat,
                    home_longitude: data[0].lon
                }));
            } else {
                alert("Address not found by geocoder. Please adjust it or enter coordinates manually.");
            }
        } catch (e) {
            alert("Network error reaching OpenStreetMap Geocoding API.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!formData.customer_id) {
            setLocations([]);
            return;
        }
        const fetchLocations = async () => {
            try {
                const data = await api.get(`/locations/?customer_id=${formData.customer_id}`);
                setLocations(data);
            } catch (err) {
                console.error("Failed to fetch locations", err);
            }
        };
        fetchLocations();
    }, [formData.customer_id]);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [customersData, usersData] = await Promise.all([
                    api.get('/customers/'),
                    api.get('/users/')
                ]);
                setCustomers(customersData);
                setUsers(usersData);

                if (isEdit) {
                    const data = await api.get(`/users/${id}`);
                    setFormData({
                        username: data.username,
                        email: data.email,
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        password: '',
                        role: data.role || 'user',
                        is_employee: data.is_employee || false,
                        customer_id: data.customer_id || '',
                        phone: data.phone || '',
                        start_date: data.start_date ? data.start_date.split('T')[0] : '',
                        last_login: data.last_login || '',
                        manager_id: data.manager_id || '',
                        location_id: data.location_id || '',
                        locked_out: data.locked_out || false,
                        department: data.department || '',
                        title: data.title || '',
                        region: data.region || 'US/Headquarters',
                        has_financial_access: data.has_financial_access || false,
                        login_enabled: data.login_enabled || false,
                        needs_password_change: data.needs_password_change || false,
                        is_active: data.is_active !== undefined ? data.is_active : true,
                        home_address: data.home_address || '',
                        home_latitude: data.home_latitude || '',
                        home_longitude: data.home_longitude || '',
                        annual_pto_allowance: data.annual_pto_allowance ?? 0.0,
                        hourly_billing_rate: data.hourly_billing_rate ?? '',
                        internal_cost_rate: data.internal_cost_rate ?? ''
                    });
                }
            } catch (err) {
                console.error("Failed to load data", err);
                alert("Failed to load data.");
            } finally {
                setFetching(false);
            }
        };
        fetchMetadata();
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData };
            if (payload.home_latitude) payload.home_latitude = parseFloat(payload.home_latitude);
            else payload.home_latitude = null;
            if (payload.home_longitude) payload.home_longitude = parseFloat(payload.home_longitude);
            else payload.home_longitude = null;

            if (isEdit && !payload.password) {
                delete payload.password;
            }
            // Sanitize customer_id & manager_id
            if (payload.customer_id === '') payload.customer_id = null;
            if (payload.location_id === '') payload.location_id = null;
            if (payload.manager_id === '') payload.manager_id = null;
            if (payload.start_date === '') payload.start_date = null;
            if (payload.last_login === '') payload.last_login = null;
            if (payload.department === '') payload.department = null;
            if (payload.title === '') payload.title = null;
            if (payload.annual_pto_allowance === '') payload.annual_pto_allowance = 0.0;
            if (payload.hourly_billing_rate === '') payload.hourly_billing_rate = null;
            if (payload.internal_cost_rate === '') payload.internal_cost_rate = null;

            let result;
            if (isEdit) {
                result = await api.put(`/users/${id}`, payload);
            } else {
                result = await api.post('/users/', payload);
            }

            if (onSuccess) {
                onSuccess(result);
            } else {
                navigate('/portal/users');
            }
        } catch (err) {
            console.error("Failed to save user", err);
            alert("Failed to save user: " + (err.response?.data?.detail || "Validation Error"));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate('/portal/users');
        }
    };

    if (fetching) return <div style={{ padding: '2rem' }}>Loading...</div>;

    const userLocation = locations.find(l => String(l.id) === String(formData.location_id));
    const cycle = userLocation ? userLocation.pay_period_cycle : null;

    let periods = 0;
    if (cycle === 'Weekly') periods = 52;
    else if (cycle === 'Bi-Weekly') periods = 26;
    else if (cycle === 'Semi-Monthly') periods = 24;
    else if (cycle === 'Monthly') periods = 12;

    let estimatedAccrual = null;
    let validAccrual = false;
    if (periods > 0 && formData.annual_pto_allowance) {
        estimatedAccrual = (formData.annual_pto_allowance / periods).toFixed(2);
        validAccrual = true;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>{isEdit ? 'Edit User' : 'New User'}</h2>
                <button onClick={handleCancel} className="btn-secondary">Cancel</button>
            </div>

                        <div className="card" style={{ maxWidth: '600px' }}>
                {user && (user.role === 'admin' || user.has_financial_access) ? (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', alignItems: 'center' }}>
                        <button type="button" onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 1rem' }}>Profile</button>
                        <button type="button" onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 1rem' }}>Admin / Finance</button>
                        {isEdit && activeTab === 'admin' && (
                            <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                {formData.first_name || formData.last_name ? `${formData.first_name} ${formData.last_name}` : formData.username}
                            </div>
                        )}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
                    <div className="form-group">
                        <label>Username</label>
                        <input name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="login_enabled"
                                checked={formData.login_enabled}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData(prev => ({
                                        ...prev,
                                        login_enabled: checked,
                                        password: (checked && !prev.password) ? (Math.random().toString(36).slice(-8) + "Aa1!") : prev.password,
                                        needs_password_change: checked ? true : prev.needs_password_change
                                    }));
                                }}
                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                            />
                            <strong>Enable Login</strong>
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Allows the user to authenticate into the system. Without this, no password is required.
                        </p>
                    </div>

                    {formData.login_enabled && (
                        <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-lighter)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                            <label>Password {isEdit && !formData.needs_password_change && '(Leave blank to keep current)'}</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type={formData.needs_password_change ? "text" : "password"} 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    readOnly={formData.needs_password_change}
                                    required={!isEdit && formData.login_enabled} 
                                    style={{ flex: 1 }}
                                />
                                {formData.needs_password_change && (
                                    <button 
                                        type="button" 
                                        className="btn-secondary" 
                                        onClick={() => navigator.clipboard.writeText(formData.password)}
                                        title="Copy securely generated password"
                                    >
                                        Copy
                                    </button>
                                )}
                            </div>
                            {formData.needs_password_change && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem', marginBottom: 0 }}>
                                    <em>System Minted Password. They will be forced to change it on their first login.</em>
                                </p>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>First Name</label>
                            <input name="first_name" value={formData.first_name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input name="last_name" value={formData.last_name} onChange={handleChange} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Role</label>
                            <select name="role" value={formData.role} onChange={handleChange}>
                                <option value="admin">Admin</option>
                                <option value="Analyst">Analyst</option>
                                <option value="Finance">Finance</option>
                                <option value="Manager">Manager</option>
                                <option value="pm">Project Manager</option>
                                <option value="Technician">Technician</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <select name="department" value={formData.department} onChange={handleChange}>
                                <option value="">-- No Department --</option>
                                <option value="Administration">Administration</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Finance">Finance</option>
                                <option value="HR">HR</option>
                                <option value="Operations">Operations</option>
                                <option value="Staff">Staff</option>
                                <option value="Support">Support</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Region</label>
                            <select name="region" value={formData.region} onChange={handleChange}>
                                <option value="US/Headquarters">US/Headquarters</option>
                                <option value="Triad Asia">Triad Asia</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Function/Title</label>
                            <select name="title" value={formData.title} onChange={handleChange}>
                                <option value="">-- No Title --</option>
                                <option value="Admin">Admin</option>
                                <option value="Analyst">Analyst</option>
                                <option value="Designer">Designer</option>
                                <option value="Director">Director</option>
                                <option value="Engineer">Engineer</option>
                                <option value="Manager">Manager</option>
                                <option value="PM">PM</option>
                                <option value="Technician">Technician</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Customer (Optional)</label>
                        <select name="customer_id" value={formData.customer_id} onChange={handleChange}>
                            <option value="">-- No Association --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem' }}>Location</label>
                            <select
                                name="location_id"
                                value={formData.location_id || ''}
                                onChange={handleChange}
                                disabled={!formData.customer_id}
                                style={{ marginTop: '0.25rem' }}
                            >
                                <option value="">-- No Location --</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>

                    </div> {/* End Profile Tab */}

                    <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Geocode Home Address</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="text" 
                                    name="home_address"
                                    value={formData.home_address} 
                                    onChange={handleChange} 
                                    placeholder="Enter physical home address to find GPS..." 
                                    style={{ flex: 1 }}
                                />
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    onClick={handleAutoFetchGPS}
                                    disabled={loading || !formData.home_address}
                                >
                                    🌍 Auto-Fetch GPS
                                </button>
                            </div>
                        </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                        <div className="form-group">
                            <label>Home Latitude (Geofence)</label>
                            <input type="number" step="any" name="home_latitude" value={formData.home_latitude} onChange={handleChange} placeholder="e.g. 40.7128" />
                        </div>
                        <div className="form-group">
                            <label>Home Longitude (Geofence)</label>
                            <input type="number" step="any" name="home_longitude" value={formData.home_longitude} onChange={handleChange} placeholder="e.g. -74.0060" />
                        </div>
                    </div>

                    {isEdit && formData.last_login && (
                        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Last Login: <strong style={{ color: 'var(--text-main)' }}>{new Date(formData.last_login).toLocaleString()}</strong>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Manager (Optional)</label>
                        <select name="manager_id" value={formData.manager_id} onChange={handleChange}>
                            <option value="">-- No Manager --</option>
                            {users.filter(u => u.is_employee && u.id !== (isEdit ? parseInt(id) : -1)).map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_employee"
                                checked={formData.is_employee}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.5rem' }}
                            />
                            Is Employee?
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Employees can be assigned to milestones.
                        </p>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="has_financial_access"
                                checked={formData.has_financial_access}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                            />
                            Has Financial Access?
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Grants access to invoices, budgets, and sensitive financial reports.
                        </p>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--error)' }}>
                            <input
                                type="checkbox"
                                name="locked_out"
                                checked={formData.locked_out}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--error)' }}
                            />
                            Locked Out
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Prevent this user from logging in.
                        </p>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active !== undefined ? formData.is_active : true}
                                onChange={handleChange}
                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                            />
                            System Active Record
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Unchecking this removes the user globally from all drop-downs, charts, and system lists.
                        </p>
                    </div>

                    {user && (user.role === 'admin' || user.has_financial_access) && (
                        <>
                            <h4 style={{ color: 'var(--primary)', marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Pay & Benefits Configuration</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-lighter)', padding: '1rem', borderRadius: '8px' }}>
                                <div className="form-group">
                                    <label>Annual PTO (Hrs)</label>
                                    <input 
                                        type="number" 
                                        step="0.5" 
                                        name="annual_pto_allowance" 
                                        value={formData.annual_pto_allowance !== null ? formData.annual_pto_allowance : ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 120"
                                    />
                                    {validAccrual ? (
                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-main)', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem', color: 'var(--text-main)', borderRadius: '4px' }}>
                                            ↳ Auto-Accrues <strong>{estimatedAccrual}</strong> hrs / pay period natively.
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-main)', borderLeft: '3px solid var(--text-muted)', fontSize: '0.85rem', color: 'var(--text-muted)', borderRadius: '4px' }}>
                                            ↳ Bind to a precise Location for accrual logic.
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Hourly Billing Rate ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        name="hourly_billing_rate" 
                                        value={formData.hourly_billing_rate !== null ? formData.hourly_billing_rate : ''} 
                                        onChange={handleChange} 
                                        placeholder="External rate"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Internal Cost Rate ($)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        name="internal_cost_rate" 
                                        value={formData.internal_cost_rate !== null ? formData.internal_cost_rate : ''} 
                                        onChange={handleChange} 
                                        placeholder="Confidential cost"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    </div> {/* End Admin Tab */}

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save User'}
                            </button>
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={() => navigate('/portal/users')}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                        {isEdit && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!confirm("Are you sure you want to delete this user?")) return;
                                    try {
                                        await api.delete(`/users/${id}`);
                                        if (onSuccess) onSuccess();
                                        else navigate('/portal/users');
                                    } catch (err) {
                                        console.error("Failed to delete user", err);
                                        alert(err.response?.data?.detail || "Failed to delete user.");
                                    }
                                }}
                                className="btn-secondary"
                                style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                            >
                                Delete User
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;
