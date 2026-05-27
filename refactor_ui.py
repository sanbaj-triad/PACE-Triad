import re

file_path = 'c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/UserForm.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add activeTab state
text = text.replace(
    "const isEdit = !!id;",
    "const isEdit = !!id;\n    const [activeTab, setActiveTab] = useState('profile');"
)

# 2. Add hydration
hydration_old = """                        home_latitude: data.home_latitude || '',
                        home_longitude: data.home_longitude || ''"""
hydration_new = """                        home_latitude: data.home_latitude || '',
                        home_longitude: data.home_longitude || '',
                        annual_pto_allowance: data.annual_pto_allowance ?? 0.0,
                        hourly_billing_rate: data.hourly_billing_rate ?? '',
                        internal_cost_rate: data.internal_cost_rate ?? ''"""
text = text.replace(hydration_old, hydration_new)

# 3. Add Tab Buttons and Wrap Form Sections
tabs_jsx = """            <div className="card" style={{ maxWidth: '600px' }}>
                {user && (user.role === 'admin' || user.has_financial_access) ? (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        <button type="button" onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 1rem' }}>Profile</button>
                        <button type="button" onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 1rem' }}>Admin / Finance</button>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>"""

text = text.replace(
    '<div className="card" style={{ maxWidth: \'600px\' }}>\n                <form onSubmit={handleSubmit}>',
    tabs_jsx
)

# 4. Split Phone Number and Start Date
phone_grid_old = """                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                        </div>
                    </div>"""

phone_grid_new = """                    <div className="form-group">
                        <label>Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>"""
text = text.replace(phone_grid_old, phone_grid_new)

# 5. Add Start Date to the beginning of the Admin section, closing the Profile section
admin_start_old = """                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Geocode Home Address</label>"""
admin_start_new = """                    </div> {/* End Profile Tab */}

                    <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Geocode Home Address</label>"""
text = text.replace(admin_start_old, admin_start_new)

# 6. Close the Admin tab before the Save buttons
save_buttons_old = """                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>"""
save_buttons_new = """                    </div> {/* End Admin Tab */}

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>"""
text = text.replace(save_buttons_old, save_buttons_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Successfully processed UserForm.jsx with Tabbed implementation!")
