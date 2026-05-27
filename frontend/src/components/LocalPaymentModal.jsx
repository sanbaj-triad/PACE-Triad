import { useState } from 'react';

const LocalPaymentModal = ({ isOpen, onClose, onSave, maxAmount }) => {
    const [amount, setAmount] = useState(maxAmount > 0 ? maxAmount : 0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('Check');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                amount: parseFloat(amount),
                payment_date: new Date(date).toISOString(),
                payment_method: method,
                reference_number: reference,
                notes: notes
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
                    <h2>Record Local Adjustment / Payment</h2>
                    <button onClick={onClose} className="close-modal">&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Amount (Use negative for Refunds/Credits) ($)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Payment / Adjustment Method</label>
                            <select value={method} onChange={(e) => setMethod(e.target.value)}>
                                <option value="Check">Check</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="ACH">ACH Transfer</option>
                                <option value="Write-Off">Write-Off / Forgiven</option>
                                <option value="Refund">Refund / Reversal</option>
                                <option value="Manual Adjustment">Manual Ledger Adjustment</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Reference Number</label>
                            <input 
                                type="text" 
                                value={reference} 
                                onChange={(e) => setReference(e.target.value)} 
                                placeholder="Check Number, Transaction ID..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Notes / Reason</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Why is this local adjustment being made?"
                                style={{ width: '100%', minHeight: '60px', padding: '0.5rem' }}
                            />
                        </div>
                        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : 'Record to Ledger'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LocalPaymentModal;
