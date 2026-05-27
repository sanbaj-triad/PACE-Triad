import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const LocationManager = ({ customerId, isSubscriptionOwner }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingLoc, setEditingLoc] = useState(null); // null = list, {id: null} = create, {id: ...} = edit
    const [formLoading, setFormLoading] = useState(false);
    
    // View mode: 'grid', 'list', 'bulk'
    const [viewMode, setViewMode] = useState('grid');
    const [bulkData, setBulkData] = useState([]);
    const [savingBulk, setSavingBulk] = useState(false);

    useEffect(() => {
        if (!customerId) return;
        fetchLocations();
    }, [customerId]);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/locations/?customer_id=${customerId}`);
            setLocations(data);
        } catch (err) {
            console.error("Failed to load locations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                name: editingLoc.name,
                address: editingLoc.address,
                customer_id: parseInt(customerId),
                latitude: editingLoc.latitude ? parseFloat(editingLoc.latitude) : null,
                longitude: editingLoc.longitude ? parseFloat(editingLoc.longitude) : null,
                pay_period_cycle: editingLoc.pay_period_cycle || 'Bi-Weekly',
                weekly_work_hours: editingLoc.weekly_work_hours ? parseFloat(editingLoc.weekly_work_hours) : 40.0,
                auto_pto_calculation: editingLoc.auto_pto_calculation || false,
                payroll_start_date: editingLoc.payroll_start_date || null
            };

            if (editingLoc.id) {
                await api.put(`/locations/${editingLoc.id}`, payload);
            } else {
                await api.post('/locations/', payload);
            }
            await fetchLocations();
            setEditingLoc(null);
        } catch (err) {
            console.error("Failed to save location", err);
            let msg = "Failed to save location.";
            if (err.response && err.response.data) {
                // api.js returns { response: { data: ..., status: ... } }
                const detail = err.response.data.detail || JSON.stringify(err.response.data);
                msg += " Server: " + detail;
            } else if (err.message) {
                msg += " " + err.message;
            }
            alert(msg);
        } finally {
            setFormLoading(false);
        }
    };

    const handleAutoFetchGPS = async () => {
        if (!editingLoc.address) {
            alert("Please enter a physical address first.");
            return;
        }
        setFormLoading(true);
        try {
            const data = await api.get(`/system/geocode?address=${encodeURIComponent(editingLoc.address)}`);
            if (data && data.length > 0) {
                setEditingLoc(prev => ({
                    ...prev,
                    latitude: data[0].lat,
                    longitude: data[0].lon
                }));
            } else {
                alert("Address not found by geocoder. Please verify it or enter manually.");
            }
        } catch (e) {
            alert("Network error reaching OpenStreetMap Geocoding API.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (locId) => {
        if (!confirm("Are you sure? This cannot be undone if used.")) return;
        try {
            await api.delete(`/locations/${locId}`);
            fetchLocations();
        } catch (err) {
            console.error("Failed to delete", err);
            alert(err.response?.data?.detail || "Failed to delete location.");
        }
    };

    const handleToggleBulk = () => {
        if (viewMode === 'bulk') {
            setViewMode('grid');
        } else {
            setBulkData(JSON.parse(JSON.stringify(locations)));
            setViewMode('bulk');
        }
    };

    const handleBulkSave = async () => {
        setSavingBulk(true);
        try {
            await Promise.all(
                bulkData.map(loc => {
                    const payload = {
                        name: loc.name,
                        address: loc.address,
                        customer_id: parseInt(customerId),
                        latitude: loc.latitude !== null && loc.latitude !== '' ? parseFloat(loc.latitude) : null,
                        longitude: loc.longitude !== null && loc.longitude !== '' ? parseFloat(loc.longitude) : null,
                        pay_period_cycle: loc.pay_period_cycle || 'Bi-Weekly',
                        weekly_work_hours: loc.weekly_work_hours ? parseFloat(loc.weekly_work_hours) : 40.0,
                        auto_pto_calculation: loc.auto_pto_calculation || false,
                        payroll_start_date: loc.payroll_start_date || null
                    };
                    return api.put(`/locations/${loc.id}`, payload);
                })
            );
            await fetchLocations();
            setViewMode('grid');
        } catch (err) {
            console.error("Bulk save failed", err);
            alert("Failed to save some locations. Server might have rejected invalid data.");
        } finally {
            setSavingBulk(false);
        }
    };

    if (loading && !locations.length) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading locations...</div>;

    return (
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Locations</h3>
                    {!editingLoc && (
                        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                }}
                                title="Grid View"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 3H3V10H10V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3H14V10H21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 14H14V21H21V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10 14H3V21H10V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                }}
                                title="List View"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                onClick={handleToggleBulk}
                                style={{
                                    background: viewMode === 'bulk' ? 'var(--primary)' : 'transparent',
                                    color: viewMode === 'bulk' ? 'white' : 'var(--text-muted)',
                                    padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                }}
                                title="Bulk Edit"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
                
                {!editingLoc && (
                    <button
                        type="button"
                        onClick={() => setEditingLoc({ name: '', address: '', latitude: '', longitude: '', pay_period_cycle: 'Bi-Weekly', weekly_work_hours: 40.0, auto_pto_calculation: false, payroll_start_date: '' })}
                        className="btn-secondary"
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                        + Add Location
                    </button>
                )}
            </div>

            {editingLoc ? (
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ marginTop: 0 }}>{editingLoc.id ? 'Edit Location' : 'New Location'}</h4>
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                value={editingLoc.name}
                                onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })}
                                required
                                placeholder="e.g. Main Office, Warehouse A"
                            />
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <textarea
                                value={editingLoc.address || ''}
                                onChange={e => setEditingLoc({ ...editingLoc, address: e.target.value })}
                                rows="2"
                                placeholder="Full Address..."
                            />
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={handleAutoFetchGPS}
                                disabled={formLoading || !editingLoc.address}
                                style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                            >
                                🌍 Auto-Fill GPS from Address
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Latitude (Geofence)</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={editingLoc.latitude || ''}
                                    onChange={e => setEditingLoc({ ...editingLoc, latitude: e.target.value })}
                                    placeholder="e.g. 40.7128"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Longitude (Geofence)</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={editingLoc.longitude || ''}
                                    onChange={e => setEditingLoc({ ...editingLoc, longitude: e.target.value })}
                                    placeholder="e.g. -74.0060"
                                />
                            </div>
                        </div>
                        {isSubscriptionOwner && (
                            <>
                                <h5 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Location Defaults</h5>
                                <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-lighter)', padding: '1rem', borderRadius: '8px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Pay Period Cycle</label>
                                        <select 
                                            value={editingLoc.pay_period_cycle || 'Bi-Weekly'} 
                                            onChange={e => setEditingLoc({ ...editingLoc, pay_period_cycle: e.target.value })}
                                        >
                                            <option value="Weekly">Weekly</option>
                                            <option value="Bi-Weekly">Bi-Weekly</option>
                                            <option value="Semi-Monthly">Semi-Monthly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Weekly Work Hours</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={editingLoc.weekly_work_hours || 40.0}
                                            onChange={e => setEditingLoc({ ...editingLoc, weekly_work_hours: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-lighter)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid var(--border)' }}>
                                    <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--primary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={editingLoc.auto_pto_calculation || false}
                                                onChange={e => setEditingLoc({ ...editingLoc, auto_pto_calculation: e.target.checked })}
                                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                                            />
                                            <strong>Enable Auto-PTO Accrual</strong>
                                        </label>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                                            Automatically increment employee PTO banks on payday.
                                        </p>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Payroll Cycle Anchor Date</label>
                                        <input
                                            type="date"
                                            disabled={!editingLoc.auto_pto_calculation}
                                            value={editingLoc.payroll_start_date || ''}
                                            onChange={e => setEditingLoc({ ...editingLoc, payroll_start_date: e.target.value })}
                                        />
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            Select any historical start date to anchor the cycle from.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn-primary" disabled={formLoading}>Save</button>
                            <button type="button" onClick={() => setEditingLoc(null)} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid-container" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                    {locations.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No locations defined.</p>}
                    {locations.map(loc => (
                        <div key={loc.id} className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '1.05rem' }}>{loc.name}</strong>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button onClick={() => setEditingLoc(loc)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Edit">✏️</button>
                                    <button onClick={() => handleDelete(loc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Delete">🗑️</button>
                                </div>
                            </div>
                            {loc.address && (
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                                    {loc.address}
                                </p>
                            )}
                            {loc.latitude != null && loc.longitude != null && (
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--primary)' }}>📍 Geofence Active (Radius 150m)</span><br/>
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" style={{color: '#007bff', textDecoration: 'underline'}}>🗺️ View on Maps</a>
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : viewMode === 'list' ? (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Address</th>
                                <th>Geofence</th>
                                {isSubscriptionOwner && <th>Pay Cycle</th>}
                                {isSubscriptionOwner && <th>Weekly Hours</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.length === 0 ? (
                                <tr><td colSpan={isSubscriptionOwner ? 6 : 4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No locations defined.</td></tr>
                            ) : (
                                locations.map(loc => (
                                    <tr key={loc.id}>
                                        <td className="font-medium">{loc.name}</td>
                                        <td style={{ whiteSpace: 'pre-line' }}>{loc.address || '-'}</td>
                                        <td>
                                            {loc.latitude != null && loc.longitude != null ? (
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" style={{color: '#007bff', textDecoration: 'underline'}}>View on Maps</a>
                                            ) : '-'}
                                        </td>
                                        {isSubscriptionOwner && <td>{loc.pay_period_cycle || '-'}</td>}
                                        {isSubscriptionOwner && <td>{loc.weekly_work_hours || '-'}</td>}
                                        <td>
                                            <button onClick={() => setEditingLoc(loc)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} title="Edit">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : viewMode === 'bulk' ? (
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                        <div>
                            <strong style={{ color: 'var(--primary)' }}>Bulk Edit Mode Active</strong>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Changes are applied to every edited field concurrently.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setViewMode('grid')} className="btn-secondary" disabled={savingBulk}>Cancel</button>
                            <button onClick={handleBulkSave} className="btn-primary" disabled={savingBulk}>
                                {savingBulk ? 'Saving All...' : 'Save All Changes'}
                            </button>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th style={{ minWidth: '200px' }}>Address</th>
                                <th>Lat / Lon</th>
                                {isSubscriptionOwner && <th>Pay Cycle</th>}
                                {isSubscriptionOwner && <th style={{ width: '80px' }}>Hours</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {bulkData.length === 0 ? (
                                <tr><td colSpan={isSubscriptionOwner ? 5 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No locations defined.</td></tr>
                            ) : (
                                bulkData.map((loc, index) => (
                                    <tr key={loc.id}>
                                        <td>
                                            <input 
                                                value={loc.name} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].name = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100%', padding: '4px' }}
                                            />
                                        </td>
                                        <td>
                                            <textarea 
                                                value={loc.address || ''} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].address = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                rows="2"
                                                style={{ width: '100%', padding: '4px', resize: 'vertical' }}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <input 
                                                    type="number" step="any" placeholder="Lat"
                                                    value={loc.latitude || ''} 
                                                    onChange={e => {
                                                        const newBulk = [...bulkData];
                                                        newBulk[index].latitude = e.target.value;
                                                        setBulkData(newBulk);
                                                    }}
                                                    style={{ width: '100%', padding: '4px' }}
                                                />
                                                <input 
                                                    type="number" step="any" placeholder="Lon"
                                                    value={loc.longitude || ''} 
                                                    onChange={e => {
                                                        const newBulk = [...bulkData];
                                                        newBulk[index].longitude = e.target.value;
                                                        setBulkData(newBulk);
                                                    }}
                                                    style={{ width: '100%', padding: '4px' }}
                                                />
                                            </div>
                                        </td>
                                        {isSubscriptionOwner && (
                                            <td>
                                                <select 
                                                    value={loc.pay_period_cycle || 'Bi-Weekly'} 
                                                    onChange={e => {
                                                        const newBulk = [...bulkData];
                                                        newBulk[index].pay_period_cycle = e.target.value;
                                                        setBulkData(newBulk);
                                                    }}
                                                    style={{ width: '100%', padding: '4px' }}
                                                >
                                                    <option value="Weekly">Weekly</option>
                                                    <option value="Bi-Weekly">Bi-Weekly</option>
                                                    <option value="Semi-Monthly">Semi-Monthly</option>
                                                    <option value="Monthly">Monthly</option>
                                                </select>
                                            </td>
                                        )}
                                        {isSubscriptionOwner && (
                                            <td>
                                                <input 
                                                    type="number" step="0.5"
                                                    value={loc.weekly_work_hours || 40.0} 
                                                    onChange={e => {
                                                        const newBulk = [...bulkData];
                                                        newBulk[index].weekly_work_hours = e.target.value;
                                                        setBulkData(newBulk);
                                                    }}
                                                    style={{ width: '100%', padding: '4px' }}
                                                />
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
};

export default LocationManager;
