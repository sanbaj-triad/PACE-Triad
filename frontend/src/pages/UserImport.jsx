import { useState } from 'react';
import { api } from '../utils/api';

const UserImport = () => {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        setError('');

        try {
            const data = await api.post('/users/import', formData);
            setResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>User Import (Maintenance)</h2>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Upload a CSV file to import or update users. The format should match the User Export CSV.
                    <br />
                    <small>Required columns: Username. Optional: First Name, Last Name, Email, Role, Department, Region, Location, Financial Access, Locked Out, etc.</small>
                    <br />
                    <small>Default password for new users: <code>Welcome123!</code></small>
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={handleUpload}
                        className="btn-primary"
                        disabled={!file || loading}
                    >
                        {loading ? 'Uploading...' : 'Import Users'}
                    </button>
                    {result && (
                        <span style={{ color: 'var(--success)' }}>Processed successfully!</span>
                    )}
                </div>

                {error && (
                    <div style={{ marginTop: '1rem', color: '#7f1d1d', padding: '0.75rem', background: '#fecaca', borderRadius: '4px', border: '1px solid #f87171' }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <h4>Results</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: '#dcfce7', padding: '0.5rem', borderRadius: '4px', color: '#166534' }}>
                                <strong>Created:</strong> {result.created}
                            </div>
                            <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '4px', color: '#075985' }}>
                                <strong>Updated:</strong> {result.updated}
                            </div>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div>
                                <h5 style={{ color: 'var(--danger)' }}>Errors ({result.errors.length})</h5>
                                <ul style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', color: '#334155' }}>
                                    {result.errors.map((e, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{e}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserImport;
