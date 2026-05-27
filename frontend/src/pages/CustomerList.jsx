import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import useSessionState from '../hooks/useSessionState';

const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useSessionState('customer_list_viewMode', 'grid');
    const [bulkData, setBulkData] = useState([]);
    const [savingBulk, setSavingBulk] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const data = await api.get('/customers/');
                setCustomers(data);
            } catch (err) {
                console.error("Failed to load customers", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const fetchCustomersData = async () => {
        setLoading(true);
        try {
            const data = await api.get('/customers/');
            setCustomers(data);
        } catch (err) {
            console.error("Failed to load customers", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBulk = () => {
        if (viewMode === 'bulk') {
            setViewMode('grid');
        } else {
            setBulkData(JSON.parse(JSON.stringify(sortedCustomers)));
            setViewMode('bulk');
        }
    };

    const handleBulkSave = async () => {
        setSavingBulk(true);
        try {
            await Promise.all(
                bulkData.map(c => {
                    const payload = {
                        name: c.name,
                        email: c.email || null,
                        phone: c.phone || null,
                        title: c.title || null,
                        payment_terms: c.payment_terms ? parseInt(c.payment_terms) : 30
                    };
                    return api.put(`/customers/${c.id}`, payload);
                })
            );
            await fetchCustomersData();
            setViewMode('grid');
        } catch (err) {
            console.error("Bulk save failed", err);
            alert("Failed to save some customers. Check inputs.");
        } finally {
            setSavingBulk(false);
        }
    };

    const [sortField, setSortField] = useSessionState('customer_list_sortField', 'name');
    const [sortOrder, setSortOrder] = useSessionState('customer_list_sortOrder', 'asc');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedCustomers = [...customers].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Derived or fallback
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

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2>Customers</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {viewMode === 'grid' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort:</span>
                                <select
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    <option value="name" style={{ color: 'black' }}>Name</option>
                                    <option value="email" style={{ color: 'black' }}>Email</option>
                                    <option value="title" style={{ color: 'black' }}>Title</option>
                                    <option value="payment_terms" style={{ color: 'black' }}>Terms</option>
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
                                <button
                                    onClick={() => setViewMode('grid')}
                                    style={{
                                        background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                                        color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                                        padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', border: 'none'
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {sortedCustomers.length} Records Displayed
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Name', accessor: 'name' },
                                { header: 'Title', accessor: 'title' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone' },
                                { header: 'Address', accessor: 'address' },
                                { header: 'Terms', accessor: (c) => `${c.payment_terms} Days` }
                            ];
                            import('../utils/exportUtils').then(({ exportToCSV }) => {
                                exportToCSV(sortedCustomers, columns, 'customers.csv');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                        <button onClick={() => {
                            const columns = [
                                { header: 'Name', accessor: 'name' },
                                { header: 'Title', accessor: 'title' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Phone', accessor: 'phone' },
                                { header: 'Address', accessor: 'address' },
                                { header: 'Terms', accessor: (c) => `${c.payment_terms} Days` }
                            ];
                            import('../utils/exportUtils').then(({ exportToPDF }) => {
                                exportToPDF(sortedCustomers, columns, 'Customer List', 'customers.pdf');
                            });
                        }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }} title="Export PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </div>

                    <Link to="/portal/customers/new">
                        <button className="btn-primary">+ New Customer</button>
                    </Link>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid-container">
                    {sortedCustomers.map((c) => (
                        <Link to={`/portal/customers/edit/${c.id}`} key={c.id} style={{ textDecoration: 'none' }}>
                            <div className="card">
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>{c.name}</h3>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.title}</div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <div style={{ marginBottom: '0.25rem' }}>📧 {c.email || 'N/A'}</div>
                                    <div style={{ marginBottom: '0.5rem' }}>📞 {c.phone || 'N/A'}</div>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.8rem',
                                        fontWeight: '500'
                                    }}>
                                        Terms: {c.payment_terms} Days
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {customers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No customers found.</p>}
                </div>
            ) : viewMode === 'list' ? (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>Phone {sortField === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>Title/Contact {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('payment_terms')} style={{ cursor: 'pointer' }}>Terms {sortField === 'payment_terms' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td></tr>
                            ) : (
                                sortedCustomers.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-medium">{c.name}</td>
                                        <td>{c.email || '-'}</td>
                                        <td>{c.phone || '-'}</td>
                                        <td>{c.title || '-'}</td>
                                        <td>{c.payment_terms} Days</td>
                                        <td>
                                            <Link to={`/portal/customers/edit/${c.id}`} title="Edit Customer" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </Link>
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
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Apply mass changes to Customer portfolios concurrently. </p>
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
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Title / Contact</th>
                                <th>Terms (Days)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulkData.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td></tr>
                            ) : (
                                bulkData.map((c, index) => (
                                    <tr key={c.id}>
                                        <td>
                                            <input 
                                                value={c.name} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].name = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100%', padding: '4px' }}
                                                required
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="email"
                                                value={c.email || ''} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].email = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100%', padding: '4px' }}
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                value={c.phone || ''} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].phone = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100%', padding: '4px' }}
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                value={c.title || ''} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].title = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100%', padding: '4px' }}
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number"
                                                step="1"
                                                value={c.payment_terms || ''} 
                                                onChange={e => {
                                                    const newBulk = [...bulkData];
                                                    newBulk[index].payment_terms = e.target.value;
                                                    setBulkData(newBulk);
                                                }}
                                                style={{ width: '100px', padding: '4px' }}
                                            />
                                        </td>
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

export default CustomerList;
