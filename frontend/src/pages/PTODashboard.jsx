import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { hasFinancialAccess } from '../utils/rbac';


const PTODashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('My requests');
    
    // Balance state
    const [myBalance, setMyBalance] = useState({ allowance: 0, taken: 0, pending: 0, balance: 0, approved: 0 });
    const currentYear = new Date().getFullYear();

    // Forms
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    
    // Data states
    const [myRequests, setMyRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [ledger, setLedger] = useState(null);
    const [users, setUsers] = useState([]);

    const fetchMyBalance = async () => {
        try {
            const res = await api.get(`/pto/my-balance?year=${currentYear}`);
            setMyBalance(res);
        } catch(e) { console.error('Failed to fetch my balance', e); }
    }

    const fetchMyRequests = async () => {
        try {
            const res = await api.get('/pto/requests');
            // Assuming this endpoint returns the caller's requests when role=user
            // Or we filter it:
            if (user?.role === 'user') {
                setMyRequests(res);
            } else {
                setMyRequests(res.filter(r => r.user_id === user.id));
                setAllRequests(res);
            }
        } catch(e) { console.error('Failed to fetch requests', e); }
    }

    const fetchLedger = async () => {
        try {
            const res = await api.get(`/pto/ledger?year=${currentYear}`);
            setLedger(res);
        } catch(e) { console.error('Failed to fetch ledger', e); }
    }
    
    const fetchUsers = async () => {
        try {
           const res = await api.get('/users/');
           setUsers(res.filter(u => u.is_employee || u.role === 'admin'));
        } catch (e) {}
    }

    useEffect(() => {
        fetchMyBalance();
        fetchMyRequests();
        if (user?.role === 'admin' || user?.role === 'finance') {
            fetchLedger();
            fetchUsers();
        }
    }, [user, activeTab]);

    const submitRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/pto/requests', {
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                hours_requested: parseFloat(hours),
                notes
            });
            alert('PTO Request submitted successfully');
            setStartDate('');
            setEndDate('');
            setHours('');
            setNotes('');
            fetchMyRequests();
            fetchMyBalance();
        } catch (e) {
            console.error('Submit error:', e);
            if (e.response) {
                alert(`Failed to submit request: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
            } else {
                alert(`Failed to submit request: ${e.message}`);
            }
        }
    }

    const handleApproval = async (id, status) => {
        try {
            await api.put(`/pto/requests/${id}/status`, { status });
            fetchMyRequests();
        } catch(e) {
            alert('Failed to update status');
        }
    }
    
    const allocateBank = async (userId, allowance) => {
        try {
            await api.post('/pto/banks', {
                user_id: parseInt(userId),
                year: currentYear,
                allowance_hours: parseFloat(allowance)
            });
            fetchLedger();
            alert('Bank allocated');
        } catch (e) {
             alert('Failed to allocate');
        }
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>PTO Tracking & Ledger</h2>
                {(hasFinancialAccess(user) || user?.role === 'admin') && (
                    <Link to="/portal/reports/pto-audit" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        View System Audit Ledger
                    </Link>
                )}
            </div>

            <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Bank Allowance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{myBalance.allowance}h</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending Req.</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{myBalance.pending}h</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Future Approved</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{myBalance.approved}h</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Taken Timesheet</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308' }}>{myBalance.taken}h</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remaining Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: myBalance.balance < 0 ? '#ef4444' : '#22c55e' }}>{myBalance.balance}h</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <button 
                  className={`nav-item ${activeTab === 'My requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('My requests')}
                  style={{ background: 'transparent', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'My requests' ? '2px solid var(--primary)' : 'none' }}>
                  My Requests
                </button>
                {(user?.role === 'admin' || user?.role === 'finance' || user?.role === 'pm') && (
                    <button 
                      className={`nav-item ${activeTab === 'Approvals' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Approvals')}
                      style={{ background: 'transparent', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'Approvals' ? '2px solid var(--primary)' : 'none' }}>
                      Approvals Inbox
                    </button>
                )}
                {(user?.role === 'admin' || user?.role === 'finance') && (
                    <button 
                      className={`nav-item ${activeTab === 'Ledger' ? 'active' : ''}`}
                      onClick={() => setActiveTab('Ledger')}
                      style={{ background: 'transparent', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 'Ledger' ? '2px solid var(--primary)' : 'none' }}>
                      Global Ledger
                    </button>
                )}
            </div>

            {activeTab === 'My requests' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    <div className="card">
                        <h3>Submit New Request</h3>
                        <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" required className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input type="date" required className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Total Hours Requested</label>
                                <input type="number" step="0.5" required className="form-input" value={hours} onChange={e => setHours(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                            </div>
                            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>Submit Request</button>
                        </form>
                    </div>

                    <div className="card">
                        <h3>My History</h3>
                        <table className="data-table" style={{ marginTop: '1rem', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Dates</th>
                                    <th>Hours</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myRequests.map(r => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}</td>
                                        <td>{r.hours_requested}</td>
                                        <td><span className="badge">{r.status}</span></td>
                                        <td>{r.notes}</td>
                                    </tr>
                                ))}
                                {myRequests.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No requests</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'Approvals' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                       <thead>
                           <tr>
                               <th>User</th>
                               <th>Dates</th>
                               <th>Hours</th>
                               <th>Status</th>
                               <th>Action</th>
                           </tr>
                       </thead>
                       <tbody>
                           {allRequests.map(r => (
                               <tr key={r.id}>
                                   <td>
                                       {(() => {
                                           const u = users.find(x => x.id === r.user_id);
                                           return u ? (`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username) : `User #${r.user_id}`;
                                       })()}
                                   </td>
                                   <td>{new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}</td>
                                   <td>{r.hours_requested}</td>
                                   <td><span className="badge">{r.status}</span></td>
                                   <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {(r.status === 'Pending') && (
                                                <button className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => handleApproval(r.id, 'Manager Approved')}>Manager Approve</button>
                                            )}
                                            {(r.status === 'Manager Approved') && (user?.role === 'admin' || user?.role === 'finance') && (
                                                <button className="btn-primary" style={{ padding: '0.2rem 0.6rem' }} onClick={() => handleApproval(r.id, 'Finance Approved')}>Finance Approve</button>
                                            )}
                                            {(r.status === 'Pending' || r.status === 'Manager Approved') && (
                                                <button className="btn-secondary" style={{ padding: '0.2rem 0.6rem', color: 'red' }} onClick={() => handleApproval(r.id, 'Rejected')}>Reject</button>
                                            )}
                                        </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'Ledger' && ledger && (
                 <div className="card" style={{ overflowX: 'auto' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-dark)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Employee</span>
                            <select 
                                id="allocUserId"
                                defaultValue=""
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '220px' }}
                            >
                                <option value="" disabled>Select Employee...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.first_name || ''} {u.last_name || ''})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-dark)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Hours</span>
                            <input 
                                type="number" 
                                min="0" 
                                step="0.5" 
                                id="allocHours" 
                                placeholder="Bank Allowance" 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '120px' }} 
                            />
                        </div>

                        <button className="btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => {
                            const uid = document.getElementById('allocUserId').value;
                            const hrs = document.getElementById('allocHours').value;
                            if(!uid || !hrs) return alert('Select user and enter hours');
                            allocateBank(uid, hrs);
                        }}>Set PTO Bank</button>
                    </div>
                    
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Region</th>
                                <th>Bank Allowance</th>
                                <th>Future Approved Req</th>
                                <th>Consumed (Timesheet)</th>
                                <th>Remaining Ledger Bal.</th>
                                <th>Last Audited</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.entries.map((e, idx) => (
                                <tr key={idx}>
                                    <td><strong>#{e.user_id}</strong> {e.username}</td>
                                    <td>{e.region}</td>
                                    <td>{e.allowance_hours}h</td>
                                    <td style={{ color: 'var(--primary)' }}>{e.approved_pending_hours}h</td>
                                    <td style={{ color: '#eab308' }}>{e.taken_hours}h</td>
                                    <td style={{ fontWeight: 'bold', color: e.remaining_balance < 0 ? '#ef4444' : '#22c55e' }}>{e.remaining_balance}h</td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {e.last_updated ? (
                                            <>Changed by {e.last_updated_by || 'Unknown'}<br />on {new Date(e.last_updated).toLocaleDateString()}</>
                                        ) : 'Never'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

export default PTODashboard;
