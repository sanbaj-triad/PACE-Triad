import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import EmailModal from '../components/EmailModal';
import EmailLogModal from '../components/EmailLogModal';
import XeroLogModal from '../components/XeroLogModal';
import PaymentModal from '../components/PaymentModal';
import LocalPaymentModal from '../components/LocalPaymentModal';

const InvoiceDetails = () => {
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showEmailLogModal, setShowEmailLogModal] = useState(false);
    const [showXeroLogs, setShowXeroLogs] = useState(false);
    const [syncingXero, setSyncingXero] = useState(false);
    const [refreshingXero, setRefreshingXero] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showLocalPaymentModal, setShowLocalPaymentModal] = useState(false);

    // New Line Item State
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unit_price: 0
    });

    const fetchInvoice = async () => {
        try {
            const invData = await api.get(`/invoices/${id}`);
            setInvoice(invData);
            const itemsData = await api.get(`/invoices/${id}/items/`);
            setLineItems(itemsData);
        } catch (err) {
            console.error("Failed to load invoice details", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/invoices/${id}/items/`, {
                ...newItem,
                amount: newItem.quantity * newItem.unit_price
            });
            // Refresh items and clear form
            const itemsData = await api.get(`/invoices/${id}/items/`);
            setLineItems(itemsData);
            setNewItem({ description: '', quantity: 1, unit_price: 0 });
        } catch (err) {
            alert("Failed to add item");
        }
    };

    const downloadPdf = async () => {
        try {
            const response = await fetch(`/invoices/${id}/download-pdf`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                let rawProj = invoice.project?.project_unique_id || 'UNKNOWN';
                if (rawProj.startsWith('P-')) rawProj = rawProj.substring(2);
                const safeProj = rawProj.replace(/[^a-zA-Z0-9-_]/g, '');
                
                let rawInv = invoice.invoice_number;
                if (rawInv.startsWith('I-')) rawInv = rawInv.substring(2);
                const safeInv = rawInv.replace(/[^a-zA-Z0-9-_]/g, '');
                
                a.download = `INV_P-${safeProj}_I-${safeInv}.pdf`;
                
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Failed to download PDF");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendEmail = async (recipients, subject, message) => {
        try {
            await api.post(`/invoices/${id}/send`, {
                to_emails: recipients,
                subject,
                message
            });
            alert("Email sent successfully!");
            setShowEmailModal(false);
        } catch (err) {
            console.error("Failed to send email", err);
            alert("Failed to send email: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleSyncXero = async () => {
        setSyncingXero(true);
        try {
            const res = await api.post(`/invoices/${id}/sync`);
            alert(res.message || "Synced successfully!");
            fetchInvoice();
        } catch (err) {
            console.error("Xero sync failed", err);
            alert("Failed to sync to Xero: " + (err.response?.data?.detail || err.message));
        } finally {
            setSyncingXero(false);
        }
    };

    const handleRefreshXero = async () => {
        setRefreshingXero(true);
        try {
            const res = await api.post(`/invoices/${id}/refresh`);
            alert(res.message || "Refreshed successfully!");
            fetchInvoice();
        } catch (err) {
            console.error("Xero refresh failed", err);
            alert("Failed to refresh from Xero: " + (err.response?.data?.detail || err.message));
        } finally {
            setRefreshingXero(false);
        }
    };

    const handlePostPayment = async (payData) => {
        try {
            await api.post(`/invoices/${id}/payments`, payData);
            alert("Payment recorded and pushed to Xero successfully!");
            fetchInvoice();
        } catch (err) {
            console.error("Failed to post payment to Xero", err);
            alert("Failed to record synced bank payment to Xero: " + (err.response?.data?.detail || err.message));
        }
    };

    const handlePostLocalPayment = async (payData) => {
        try {
            await api.post(`/invoices/${id}/payments/`, payData);
            alert("Local Ledger Adjustment recorded successfully!");
            fetchInvoice();
        } catch (err) {
            console.error("Failed to post local payment", err);
            alert("Failed to record local ledger update: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleDeletePayment = async (paymentId) => {
        if (!confirm("Are you sure you want to completely void this payment? This will instantaneously un-credit the invoice balance and re-open it if necessary.")) return;
        try {
            await api.delete(`/invoices/${id}/payments/${paymentId}`);
            fetchInvoice();
        } catch (err) {
            console.error("Failed to void payment", err);
            alert("Failed to void payment: " + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!invoice) return <div>Invoice not found</div>;

    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <Link to="/portal/invoices" style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}>&larr; Back to Invoices</Link>
                    <h2>Invoice #{invoice.invoice_number}</h2>
                    <span className="status-badge status-active">
                        {invoice.status === 'Sent' && invoice.amount_paid > 0 ? 'Partial' : (invoice.status === 'Sent' ? 'Open' : invoice.status)}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {invoice.xero_id ? (
                        <>
                            <span className="status-badge" style={{ background: '#e0f2fe', color: '#0284c7', alignSelf: 'center', padding: '0.4rem 0.8rem' }}>
                                ✓ Synced
                            </span>
                            <button 
                                onClick={handleRefreshXero} 
                                disabled={refreshingXero}
                                className="btn-secondary" 
                                style={{ borderColor: '#0ea5e9', color: '#0ea5e9' }}
                                title="Pull latest status and payment from Xero"
                            >
                                {refreshingXero ? '↺ syncing...' : '↺ Refresh Xero'}
                            </button>
                            {invoice.status !== 'Paid' && (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="btn-secondary"
                                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                >
                                    + Record Payment
                                </button>
                            )}
                        </>
                    ) : (
                        <button 
                            onClick={handleSyncXero} 
                            disabled={syncingXero}
                            className="btn-secondary" 
                            style={{ borderColor: '#0abf53', color: '#0abf53' }}
                        >
                            {syncingXero ? 'Syncing...' : 'Sync to Xero'}
                        </button>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setShowEmailModal(true)} className="btn-secondary">Send Email</button>
                        <button onClick={() => setShowEmailLogModal(true)} className="btn-secondary" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }} title="View Email Audit Logs">Email Logs</button>
                        <button onClick={() => setShowXeroLogs(true)} className="btn-secondary" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }} title="View Xero Logs">Xero Logs</button>
                    </div>
                    <button onClick={downloadPdf} className="btn-primary">Download PDF</button>
                </div>
            </div>

            <EmailModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onSend={handleSendEmail}
                defaultTo={invoice.project?.customer?.email || ''}
                defaultSubject={`Invoice #${invoice.invoice_number}`}
                title={`Send Invoice #${invoice.invoice_number}`}
            />

            {showEmailLogModal && (
                <EmailLogModal 
                    onClose={() => setShowEmailLogModal(false)}
                    entityType="Invoice"
                    entityId={invoice.id}
                />
            )}

            {showXeroLogs && (
                <XeroLogModal onClose={() => setShowXeroLogs(false)} />
            )}

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSave={handlePostPayment}
                maxAmount={totalAmount - (invoice.amount_paid || 0)}
            />

            <LocalPaymentModal
                isOpen={showLocalPaymentModal}
                onClose={() => setShowLocalPaymentModal(false)}
                onSave={handlePostLocalPayment}
                maxAmount={totalAmount - (invoice.amount_paid || 0)}
            />

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Project</label>
                        <p className="font-medium">
                            {invoice.project_id ? (
                                <Link to={`/portal/projects/${invoice.project_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                    {invoice.project?.name || `Project #${invoice.project_id}`}
                                </Link>
                            ) : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Customer</label>
                        <p className="font-medium">{invoice.project?.customer?.name || 'Manual Invoice'}</p>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Issue Date</label>
                        <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Due Date</label>
                        <p className="font-medium">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Total Amount</label>
                        <p className="font-medium" style={{ fontSize: '1.25rem' }}>${totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Amount Paid {invoice.xero_id && <span style={{fontSize:'0.7rem', color:'#0ea5e9'}}>(Synced)</span>}</label>
                        <p className="font-medium" style={{ fontSize: '1.25rem', color: invoice.amount_paid > 0 ? '#22c55e' : 'inherit' }}>
                            ${(invoice.amount_paid || 0).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-muted)' }}>Balance Due</label>
                        <p className="font-medium" style={{ fontSize: '1.25rem', color: (totalAmount - (invoice.amount_paid || 0)) <= 0 ? 'var(--text-muted)' : 'var(--text-main)' }}>
                            ${Math.max(0, totalAmount - (invoice.amount_paid || 0)).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Audit Trail Footer */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                        Created: {new Date(invoice.created_at).toLocaleDateString()} by {invoice.created_by_user?.username || 'System'}
                    </span>
                    <span>
                        Last Updated: {new Date(invoice.updated_at).toLocaleDateString()} {invoice.updated_by_user ? `by ${invoice.updated_by_user.username}` : ''}
                    </span>
                </div>
            </div>

            <h3>Line Items</h3>
            <div className="card">
                <table className="data-table" style={{ marginTop: 0, boxShadow: 'none', background: 'transparent' }}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style={{ width: '100px' }}>Qty</th>
                            <th style={{ width: '150px' }}>Unit Price</th>
                            <th style={{ width: '150px', textAlign: 'right' }}>Amount</th>
                            <th style={{ width: '80px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...lineItems].sort((a, b) => {
                            const aNum = a.milestone?.milestone_number || 0;
                            const bNum = b.milestone?.milestone_number || 0;
                            if (aNum !== bNum) return aNum - bNum;
                            return (a.id || 0) - (b.id || 0); // fallback to ID
                        }).map(item => (
                            <tr key={item.id}>
                                <td>
                                    {item.milestone_id ? (
                                        <span>
                                            <Link to={`/portal/projects/${invoice.project_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {item.description}
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                            </Link>
                                        </span>
                                    ) : (
                                        item.description
                                    )}
                                    <div style={{ marginTop: '4px' }}>
                                        <input
                                            placeholder="Add a memo..."
                                            defaultValue={item.memo || ''}
                                            onBlur={async (e) => {
                                                const newMemo = e.target.value;
                                                if (newMemo !== item.memo) {
                                                    try {
                                                        await api.put(`/line-items/${item.id}`, { memo: newMemo });
                                                        // Optional: refresh or just assume success to avoid flicker
                                                    } catch (err) {
                                                        console.error("Failed to update memo");
                                                    }
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                background: 'transparent',
                                                border: 'none',
                                                borderBottom: '1px dashed var(--border)',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-muted)',
                                                fontStyle: 'italic'
                                            }}
                                        />
                                    </div>
                                </td>
                                <td>{item.quantity}</td>
                                <td>${item.unit_price.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>${item.amount.toLocaleString()}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Are you sure? This will remove the item and unlink any associated milestone.")) return;
                                            try {
                                                await api.delete(`/line-items/${item.id}`);
                                                fetchInvoice(); // Refresh
                                            } catch (err) {
                                                console.error("Failed to delete item", err);
                                                alert("Failed to delete item.");
                                            }
                                        }}
                                        className="btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                                    >
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {/* New Item Row */}
                        <tr style={{ background: 'var(--bg-hover)' }}>
                            <td>
                                <input
                                    placeholder="Add description..."
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', padding: '0.5rem' }}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', padding: '0.5rem' }}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={newItem.unit_price}
                                    onChange={e => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', padding: '0.5rem' }}
                                />
                            </td>
                            <td colSpan="2" style={{ textAlign: 'right' }}>
                                <button onClick={handleAddItem} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>Add</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3rem 0 1rem' }}>
                <h3 style={{ margin: 0 }}>Payment Ledger</h3>
                {invoice.status !== 'Paid' && (
                    <button onClick={() => setShowLocalPaymentModal(true)} className="btn-secondary" style={{ borderColor: '#22c55e', color: '#22c55e', padding: '0.4rem 0.8rem' }}>
                        + Add Local Payment / Audit
                    </button>
                )}
            </div>
            
            <div className="card" style={{ marginTop: '1rem' }}>
                {(!invoice.payments || invoice.payments.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No payments have been rigidly recorded against this invoice yet.
                    </div>
                ) : (
                    <table className="data-table" style={{ marginTop: 0, boxShadow: 'none', background: 'transparent' }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Reference / Check #</th>
                                <th>Notes</th>
                                <th style={{ textAlign: 'right' }}>Amount Credited</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.payments.map(payment => (
                                <tr key={payment.id}>
                                    <td style={{ fontWeight: '500' }}>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                    <td><span className="badge">{payment.payment_method}</span></td>
                                    <td>{payment.reference_number || (payment.payment_method === 'Historical Carryover' ? '-' : 'N/A')}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{payment.notes || '-'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                                        ${payment.amount.toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDeletePayment(payment.id)}
                                            className="btn-secondary"
                                            title="Void Payment & Re-Open Balance"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                                        >
                                            Void
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                    onClick={async () => {
                        if (!confirm("Are you sure you want to delete this invoice?")) return;
                        try {
                            await api.delete(`/invoices/${id}`);
                            window.location.href = '/portal/invoices';
                        } catch (err) {
                            console.error("Failed to delete invoice", err);
                            // The API now returns 400 with detail if not empty
                            alert(err.response?.data?.detail || "Failed to delete invoice. Make sure it has no items.");
                        }
                    }}
                    className="btn-secondary"
                    style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                >
                    Delete Invoice
                </button>
            </div>
        </div>
    );
};

export default InvoiceDetails;
