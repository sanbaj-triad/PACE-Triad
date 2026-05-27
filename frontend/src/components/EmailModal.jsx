import { useState } from 'react';

const EmailModal = ({ isOpen, onClose, onSend, defaultTo, defaultSubject, title }) => {
    const [to, setTo] = useState(defaultTo || '');
    const [subject, setSubject] = useState(defaultSubject || '');
    const [message, setMessage] = useState('Please find attached the invoice for your recent project milestones.\n\nThank you for your business.');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            // Split emails by comma and trim
            const recipients = to.split(',').map(e => e.trim()).filter(e => e);
            await onSend(recipients, subject, message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>{title || 'Send Email'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>To (Comma separated)</label>
                        <input
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="client@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Subject</label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows="6"
                            style={{ width: '100%', resize: 'vertical' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" disabled={sending}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={sending}>
                            {sending ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmailModal;
