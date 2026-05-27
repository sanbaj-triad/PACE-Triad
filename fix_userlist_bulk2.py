import re

with open('frontend/src/pages/UserList.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Expand Initial State
old_state = "const [bulkFormData, setBulkFormData] = useState({ manager_id: '', department: '', region: '', location_id: '', title: '', role: '', is_employee: '', has_financial_access: '' });"
new_state = "const [bulkFormData, setBulkFormData] = useState({ first_name: '', last_name: '', role: '', department: '', region: '', title: '', customer_id: '', location_id: '', phone: '', start_date: '', manager_id: '', is_employee: '', has_financial_access: '', locked_out: '' });"
code = code.replace(old_state, new_state)

old_reset = "setBulkFormData({ manager_id: '', department: '', region: '', location_id: '', title: '', role: '', is_employee: '', has_financial_access: '' });"
new_reset = "setBulkFormData({ first_name: '', last_name: '', role: '', department: '', region: '', title: '', customer_id: '', location_id: '', phone: '', start_date: '', manager_id: '', is_employee: '', has_financial_access: '', locked_out: '' });"
code = code.replace(old_reset, new_reset)

# Update modal
modal_start = '{/* Bulk Edit Users Modal */}'
modal_end = '        </div>\n    );\n};\n\nexport default UserList;'

new_modal = """{/* Bulk Edit Users Modal */}
            {isBulkEditOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2>Bulk Edit Users ({selectedUserIds.size})</h2>
                            <button onClick={() => setIsBulkEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '4px' }}>
                            Update the fields below. Any field left blank will remain **unchanged** for the selected users. Note that changing unique fields like First/Last Name across many users simultaneously will set them all to the same name.
                        </p>
                        
                        <div className="form-grid">
                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" value={bulkFormData.first_name} onChange={e => setBulkFormData({...bulkFormData, first_name: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input type="text" value={bulkFormData.last_name} onChange={e => setBulkFormData({...bulkFormData, last_name: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            
                            <div className="form-group">
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
                            <div className="form-group">
                                <label>Department</label>
                                <input type="text" value={bulkFormData.department} onChange={e => setBulkFormData({...bulkFormData, department: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            
                            <div className="form-group">
                                <label>Region</label>
                                <select value={bulkFormData.region} onChange={e => setBulkFormData({...bulkFormData, region: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="US/Headquarters">US/Headquarters</option>
                                    <option value="Triad Asia">Triad Asia</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Function / Title</label>
                                <input type="text" value={bulkFormData.title} onChange={e => setBulkFormData({...bulkFormData, title: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            
                            <div className="form-group">
                                <label>Customer / Org</label>
                                <select value={bulkFormData.customer_id} onChange={e => setBulkFormData({...bulkFormData, customer_id: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="none">-- Clear Customer --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <select value={bulkFormData.location_id} onChange={e => setBulkFormData({...bulkFormData, location_id: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="none">-- Set to None --</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="text" value={bulkFormData.phone} onChange={e => setBulkFormData({...bulkFormData, phone: e.target.value})} placeholder="- Unchanged -" />
                            </div>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" value={bulkFormData.start_date} onChange={e => setBulkFormData({...bulkFormData, start_date: e.target.value})} />
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Manager</label>
                                <select value={bulkFormData.manager_id} onChange={e => setBulkFormData({...bulkFormData, manager_id: e.target.value})}>
                                    <option value="">- Unchanged -</option>
                                    <option value="none">-- Set to None --</option>
                                    {users.filter(u => u.is_employee).map(u => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
                                    ))}
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
                                <div style={{ flex: 1 }}>
                                    <label>Locked Out</label>
                                    <select value={bulkFormData.locked_out} onChange={e => setBulkFormData({...bulkFormData, locked_out: e.target.value})}>
                                        <option value="">- Unchanged -</option>
                                        <option value="true">Yes (Locked)</option>
                                        <option value="false">No (Active)</option>
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
            )}"""

# Extract customers safely
if 'const [customers, setCustomers] = useState([]);' not in code:
    code = code.replace("const [locations, setLocations] = useState([]);", "const [locations, setLocations] = useState([]);\n    const [customers, setCustomers] = useState([]);")
    code = code.replace(
        "api.get('/locations/').catch(() => [])",
        "api.get('/locations/').catch(() => []),\n                    api.get('/customers/').catch(() => [])"
    )
    code = code.replace(
        "const [data, locData] = await Promise.all([",
        "const [data, locData, custData] = await Promise.all(["
    )
    code = code.replace(
        "setLocations(Array.isArray(locData) ? locData : []);",
        "setLocations(Array.isArray(locData) ? locData : []);\n                setCustomers(Array.isArray(custData) ? custData : []);"
    )

# null checking
code = code.replace(
    "if (v === 'none' && k === 'manager_id') payload[k] = null; else if (v === 'true') payload[k] = true;",
    "if (v === 'none') payload[k] = null; else if (v === 'true') payload[k] = true;"
)

start_idx = code.find(modal_start)
if start_idx != -1:
    code = code[:start_idx] + new_modal + modal_end

with open('frontend/src/pages/UserList.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
