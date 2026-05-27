import re

with open('frontend/src/pages/UserList.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Clean out the old state and functions
states_to_remove = [
    "const [selectedUserIds, setSelectedUserIds] = useState(new Set());",
    "const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);",
    "const [bulkFormData, setBulkFormData] = useState({ first_name: '', last_name: '', role: '', department: '', region: '', title: '', customer_id: '', location_id: '', phone: '', start_date: '', manager_id: '', is_employee: '', has_financial_access: '', locked_out: '' });"
]
for state in states_to_remove:
    text = text.replace(state, "")

handleSelectAll_regex = re.compile(r"const handleSelectAll.*?const handleSort", re.DOTALL)
match = handleSelectAll_regex.search(text)
if match:
    text = text[:match.start()] + "const handleSort" + text[match.end():]

# 2. Add New State
new_states = """
    const [bulkUsers, setBulkUsers] = useState([]);
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    useEffect(() => {
        if (viewMode === 'bulk') {
            setBulkUsers(sortedUsers.map(u => ({ ...u, isDirty: false })));
        }
    }, [viewMode, users, sortField, sortOrder, viewScope, hideLockedOut, filterCustomer, filterRole, filterEmployee]);

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
"""
text = text.replace("const [sortField, setSortField] = useState('username');", new_states + "    const [sortField, setSortField] = useState('username');")

# 3. Add the toggle button
toggle_old = """<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6H21" /><path d="M8 12H21" /><path d="M8 18H21" /><path d="M3 6H3.01" /><path d="M3 12H3.01" /><path d="M3 18H3.01" /></svg>
                            </button>
                        </div>"""

toggle_new = """<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6H21" /><path d="M8 12H21" /><path d="M8 18H21" /><path d="M3 6H3.01" /><path d="M3 12H3.01" /><path d="M3 18H3.01" /></svg>
                            </button>
                            {currentUser?.role?.toLowerCase() === 'admin' && (
                                <button onClick={() => setViewMode('bulk')} style={{ background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent', color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none', marginLeft: '4px' }} title="Bulk Edit Mode">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                </button>
                            )}
                        </div>"""
text = text.replace(toggle_old, toggle_new)

# 4. Remove check elements from table, grid & button at top
btn_top_old_regex = re.compile(r"\{currentUser\?\.role.*?\(\s*<button className=\"btn-secondary\".*?Bulk Edit.*?\n\s*</button>\n\s*\)\}\n\s*", re.DOTALL)
text = re.sub(btn_top_old_regex, "", text)

th_col_old_regex = re.compile(r"\{currentUser\?\.role.*?\(\s*<th style=.*?<input type=\"checkbox\" onChange=\{handleSelectAll\}.*?</th>\n\s*\)\}\n\s*", re.DOTALL)
text = re.sub(th_col_old_regex, "", text)

td_col_old_regex = re.compile(r"\{currentUser\?\.role.*?\(\s*<td style=.*?<input type=\"checkbox\" checked=\{selectedUserIds\.has.*?</td>\n\s*\)\}\n\s*", re.DOTALL)
text = re.sub(td_col_old_regex, "", text)

grid_chk_old_regex = re.compile(r"\{currentUser\?\.role.*?\(\s*<div style=.*?<input type=\"checkbox\" checked=\{selectedUserIds\.has.*?</div>\n\s*\)\}\n\s*", re.DOTALL)
text = re.sub(grid_chk_old_regex, "", text)

# 5. Connect BulkEditTable in the return
tab_conditional_old = "{viewMode === 'grid' ? ("
tab_conditional_new = """{viewMode === 'bulk' && currentUser?.role?.toLowerCase() === 'admin' ? (
                <BulkEditTable bulkUsers={bulkUsers} handleBulkChange={handleBulkChange} isSavingBulk={isSavingBulk} onSave={handleBulkSave} onCancel={() => setViewMode('grid')} customers={customers} locations={locations} allUsers={users} />
            ) : viewMode === 'grid' ? ("""
text = text.replace(tab_conditional_old, tab_conditional_new)


# 6. Remove the modal
modal_regex = re.compile(r"\{\/\* Bulk Edit Users Modal \*\/}.*?\}\)", re.DOTALL)
text = re.sub(modal_regex, "", text)

# 7. Add the BulkEditTable component
bulk_comp = """
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
                                <input type="checkbox" checked={u.is_employee || false} onChange={(e) => handleBulkChange(u.id, 'is_employee', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={u.has_financial_access || false} onChange={(e) => handleBulkChange(u.id, 'has_financial_access', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={u.locked_out || false} onChange={(e) => handleBulkChange(u.id, 'locked_out', e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
"""

text += bulk_comp

with open('frontend/src/pages/UserList.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
