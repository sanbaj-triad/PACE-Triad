import re

with open('frontend/src/pages/UserList.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State Additions
if 'selectedUserIds' not in code:
    code = code.replace(
        "const [offboardUser, setOffboardUser] = useState(null);",
        """const [offboardUser, setOffboardUser] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({ manager_id: '', department: '', region: '', location_id: '', title: '', role: '', is_employee: '', has_financial_access: '' });"""
    )

# 2. Logic Additions
if 'handleSelectAll' not in code:
    code = code.replace(
        "const [sortOrder, setSortOrder] = useState('asc');",
        """const [sortOrder, setSortOrder] = useState('asc');
        
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(new Set(sortedUsers.map(u => u.id)));
        } else {
            setSelectedUserIds(new Set());
        }
    };
    
    const handleSelectOne = (id, checked) => {
        const newSet = new Set(selectedUserIds);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedUserIds(newSet);
    };
    
    const handleBulkSubmit = async () => {
        if (selectedUserIds.size === 0) return;
        setLoading(true);
        try {
            const payload = {};
            Object.entries(bulkFormData).forEach(([k, v]) => {
                if (v !== '') {
                    if (v === 'true') payload[k] = true;
                    else if (v === 'false') payload[k] = false;
                    else payload[k] = v;
                }
            });
            
            if (Object.keys(payload).length > 0) {
               await Promise.all(Array.from(selectedUserIds).map(id => api.put('/users/' + id, payload)));
            }
            setSelectedUserIds(new Set());
            setIsBulkEditOpen(false);
            setBulkFormData({ manager_id: '', department: '', region: '', location_id: '', title: '', role: '', is_employee: '', has_financial_access: '' });
            triggerRefresh();
        } catch (err) {
            console.error(err);
            setError("Bulk edit failed");
        } finally {
            setLoading(false);
        }
    };"""
    )

# 3. Top Action Buttons (Bulk Edit + Admin Add)
if 'Bulk Edit' not in code:
    old_btn = """<Link to="/portal/users/new">
                        <button className="btn-primary">+ Add User</button>
                    </Link>"""
    new_btn = """{currentUser?.role === 'admin' && selectedUserIds.size > 0 && (
                        <button className="btn-secondary" onClick={() => setIsBulkEditOpen(true)} style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                            Bulk Edit ({selectedUserIds.size})
                        </button>
                    )}
                    {currentUser?.role === 'admin' && (
                        <Link to="/portal/users/new">
                            <button className="btn-primary">+ Add User</button>
                        </Link>
                    )}"""
    code = code.replace(old_btn, new_btn)

# 4. Table Headers (Checkbox)
if '<th style={{ width: \'40px\'' not in code:
    old_th = """<th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>User {sortField === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}</th>"""
    new_th = """{currentUser?.role === 'admin' && (
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input type="checkbox" onChange={handleSelectAll} checked={sortedUsers.length > 0 && selectedUserIds.size === sortedUsers.length} />
                                    </th>
                                )}
                                <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>User {sortField === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}</th>"""
    code = code.replace(old_th, new_th)

# 5. Table Body Row (Checkbox)
if 'checked={selectedUserIds.has(u.id)}' not in code:
    old_tr = """<td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>"""
    new_tr = """{currentUser?.role === 'admin' && (
                                            <td style={{ textAlign: 'center' }}>
                                                <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={(e) => handleSelectOne(u.id, e.target.checked)} />
                                            </td>
                                        )}
                                        <td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>"""
    code = code.replace(old_tr, new_tr)

# 6. Grid Body Checkbox
if '<div style={{ position: \'absolute\', top: \'1rem\', right: \'1rem\'' not in code:
    old_grid = """<h3 style={{ marginBottom: 0, paddingRight: '2rem' }}>{u.first_name} {u.last_name}</h3>"""
    new_grid = """<h3 style={{ marginBottom: 0, paddingRight: '2rem' }}>{u.first_name} {u.last_name}</h3>
                                    {currentUser?.role === 'admin' && (
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={(e) => handleSelectOne(u.id, e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        </div>
                                    )}"""
    code = code.replace(old_grid, new_grid)

# 7. Protect Grid Inline Action Buttons
# Look for <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: 10 }}>
grid_actions_old = """<div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                                    {u.is_employee && u.is_active && !u.locked_out && (
                                        <button onClick={() => setOffboardUser(u)} title="Offboard User" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                                        </button>
                                    )}
                                    <Link to={`/portal/users/edit/${u.id}`} title="Edit User" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </Link>
                                </div>"""
grid_actions_new = """{currentUser?.role === 'admin' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                                        {u.is_employee && u.is_active && !u.locked_out && (
                                            <button onClick={() => setOffboardUser(u)} title="Offboard User" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                                            </button>
                                        )}
                                        <Link to={`/portal/users/edit/${u.id}`} title="Edit User" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </Link>
                                    </div>
                                )}"""
code = code.replace(grid_actions_old, grid_actions_new)

# 8. Protect List Inline Action Buttons
list_actions_old = """<div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                {u.is_employee && u.is_active && !u.locked_out && (
                                                    <button onClick={() => setOffboardUser(u)} title="Offboard User" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
                                                    </button>
                                                )}
                                                <Link to={`/portal/users/edit/${u.id}`} title="Edit User" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </Link>
                                            </div>"""
list_actions_new = """{currentUser?.role === 'admin' && (
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
                                            )}"""
code = code.replace(list_actions_old, list_actions_new)

# 9. Add Modal JSX at the very end before export default
if 'Bulk Edit Users Modal' not in code:
    modal_jsx = """
            {/* Bulk Edit Users Modal */}
            {isBulkEditOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2>Bulk Edit Users ({selectedUserIds.size})</h2>
                            <button onClick={() => setIsBulkEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select which fields to update for the {selectedUserIds.size} selected users. Leave blank to ignore.</p>
                        
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Department</label>
                                <input type="text" value={bulkFormData.department} onChange={e => setBulkFormData({...bulkFormData, department: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            <div className="form-group">
                                <label>Title</label>
                                <input type="text" value={bulkFormData.title} onChange={e => setBulkFormData({...bulkFormData, title: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            <div className="form-group">
                                <label>Manager</label>
                                <select value={bulkFormData.manager_id} onChange={e => setBulkFormData({...bulkFormData, manager_id: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="none">-- Set to None --</option>
                                    {users.filter(u => u.is_employee).map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Region</label>
                                <select value={bulkFormData.region} onChange={e => setBulkFormData({...bulkFormData, region: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="US/Headquarters">US/Headquarters</option>
                                    <option value="Triad Asia">Triad Asia</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Role</label>
                                <select value={bulkFormData.role} onChange={e => setBulkFormData({...bulkFormData, role: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="user">User</option>
                                    <option value="technician">Technician</option>
                                    <option value="manager">Manager</option>
                                    <option value="lead">Lead</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            
                            <div className="form-group" style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Is Employee?</label>
                                    <select value={bulkFormData.is_employee} onChange={e => setBulkFormData({...bulkFormData, is_employee: e.target.value})}>
                                        <option value="">- Unchanged -</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Financial Access</label>
                                    <select value={bulkFormData.has_financial_access} onChange={e => setBulkFormData({...bulkFormData, has_financial_access: e.target.value})}>
                                        <option value="">- Unchanged -</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setIsBulkEditOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleBulkSubmit} disabled={loading}>
                                {loading ? 'Saving...' : 'Apply Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
    """
    code = code.replace("        </div>\n    );\n};\n\nexport default UserList;", modal_jsx + "        </div>\n    );\n};\n\nexport default UserList;")

    # Also handle the manager_id 'none' specifically if needed. The frontend can parse 'none' to a null payload.
    # Update handleBulkSubmit
    code = code.replace(
        "if (v === 'true') payload[k] = true;",
        "if (v === 'none' && k === 'manager_id') payload[k] = null; else if (v === 'true') payload[k] = true;"
    )

with open('frontend/src/pages/UserList.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
