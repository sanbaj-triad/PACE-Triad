import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const PaymentModal = ({ isOpen, onClose, onSave, maxAmount }) => {
    const [amount, setAmount] = useState(maxAmount > 0 ? maxAmount : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountCode, setAccountCode] = useState('090'); // Default bank account code
    const [reference, setReference] = useState('');
    const [loading, setLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchBankAccounts();
        }
    }, [isOpen]);

    const fetchBankAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const data = await api.get('/xero/api/bank-accounts');
            setBankAccounts(data || []);
            if (data && data.length > 0) {
                setAccountCode(data[0].AccountID);
            }
        } catch (err) {
            console.error("Failed to fetch bank accounts", err);
        } finally {
            setLoadingAccounts(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                amount: parseFloat(amount),
                date,
                account_code: accountCode,
                reference
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Record Payment via Xero</h2>
                    <button onClick={onClose} className="close-modal">&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Payment Amount ($)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Payment Date</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Bank Account (Xero)</label>
                            {loadingAccounts ? (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading bank accounts...</div>
                            ) : bankAccounts.length > 0 ? (
                                <select 
                                    value={accountCode} 
                                    onChange={(e) => setAccountCode(e.target.value)} 
                                    required
                                >
                                    {bankAccounts.map(b => (
                                        <option key={b.AccountID} value={b.AccountID}>
                                            {b.Name} {b.Code ? `(${b.Code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    value={accountCode} 
                                    onChange={(e) => setAccountCode(e.target.value)} 
                                    placeholder="e.g. 090 or AccountID GUID"
                                    required
                                />
                            )}
                            <small style={{ color: 'var(--text-muted)' }}>The Xero bank account receiving the funds.</small>
                        </div>
                        <div className="form-group">
                            <label>Reference (Optional)</label>
                            <input 
                                type="text" 
                                value={reference} 
                                onChange={(e) => setReference(e.target.value)} 
                                placeholder="Check Number or Memo..."
                            />
                        </div>
                        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : 'Record Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
