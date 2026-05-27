import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import LocationManager from '../components/LocationManager';

const CustomerForm = ({ onSuccess, onCancel, forceNew = false }) => {
    const { id: paramId } = useParams();
    const id = forceNew ? null : paramId;
    const navigate = useNavigate();
    const isEdit = !!id; // Note: When used in Modal, id might be undefined, so it behaves as Create.

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        title: '',
        payment_terms: 30,
        is_owner: false
    });
    const [loading, setLoading] = useState(false);

    // Fetch effect remains same, only runs if ID exists (so Edit Page mode)

    useEffect(() => {
        if (isEdit) {
            const fetchCustomer = async () => {
                try {
                    const data = await api.get(`/customers/${id}`);
                    setFormData({
                        name: data.name,
                        email: data.email || '',
                        phone: data.phone || '',
                        address: data.address || '',
                        title: data.title || '',
                        payment_terms: data.payment_terms || 30,
                        is_owner: data.is_owner || false
                    });
                } catch (err) {
                    console.error("Failed to fetch customer", err);
                }
            };
            fetchCustomer();
        }
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                payment_terms: parseInt(formData.payment_terms)
            };

            let result;
            if (isEdit) {
                result = await api.put(`/customers/${id}`, payload);
            } else {
                result = await api.post('/customers/', payload);
            }

            if (onSuccess) {
                onSuccess(result);
            } else {
                navigate('/portal/customers');
            }
        } catch (err) {
            console.error("Failed to save customer", err);
            alert("Failed to save customer");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate('/portal/customers');
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Customer Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Address</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} rows="3" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Contact Title</label>
                            <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. CEO, Manager" />
                        </div>
                        <div className="form-group">
                            <label>Payment Terms (Days)</label>
                            <input type="number" name="payment_terms" value={formData.payment_terms} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--primary)' }}>
                            <input
                                type="checkbox"
                                name="is_owner"
                                checked={formData.is_owner}
                                onChange={(e) => setFormData(prev => ({...prev, is_owner: e.target.checked}))}
                                style={{ width: 'auto', marginRight: '0.5rem', accentColor: 'var(--primary)' }}
                            />
                            <strong>Is Subscription Owner (Triad Systems Engineering)?</strong>
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Checking this flag allows locations created under this customer to define platform-wide internal defaults like Regional Pay Cycles and Base Weekly Work Hours.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '2rem' }}>
                        <div>
                            {isEdit && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!confirm("Are you sure you want to delete this customer?")) return;
                                        try {
                                            await api.delete(`/customers/${id}`);
                                            if (onSuccess) onSuccess();
                                            else navigate('/portal/customers');
                                        } catch (err) {
                                            console.error("Failed to delete customer", err);
                                            alert(err.response?.data?.detail || "Failed to delete customer.");
                                        }
                                    }}
                                    className="btn-secondary"
                                    style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                                >
                                    Delete Customer
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Customer'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {
                isEdit && (
                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <LocationManager customerId={id} isSubscriptionOwner={formData.is_owner} />
                    </div>
                )
            }
        </div >
    );
};

export default CustomerForm;
