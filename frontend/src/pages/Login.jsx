import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../index.css'; // Ensure we use global styles

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [forgotMode, setForgotMode] = useState(false);
    const [email, setEmail] = useState('');
    const [msg, setMsg] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (success) {
            navigate('/');
        } else {
            setError('Invalid username or password');
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');
        try {
            const res = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                setMsg(data.message);
                setEmail('');
                setTimeout(() => setForgotMode(false), 3000);
            } else {
                setError(data.detail || 'An error occurred');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="text-center mb-6">
                    <img src="/TSE_PACE_tn.png" alt="TSE Logo" style={{ height: '60px', marginBottom: '10px', display: 'inline-block' }} />
                    <h1 style={{ margin: '0' }}>TSE PACE</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0', fontSize: '0.9rem' }}>Project Accounting & Cost Engine</p>
                </div>
                
                {msg && <div className="p-3 mb-4 rounded bg-green-900 border border-green-700 text-green-200" style={{ background: 'var(--bg-card)', color: '#4ade80', border: '1px solid #4ade80', padding: '1rem', borderRadius: '4px', marginBottom: '1rem'}} >{msg}</div>}
                
                {!forgotMode ? (
                    <div>
                        <a 
                            href="/auth/login/microsoft" 
                            className="btn-primary w-full shadow-lg" 
                            style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginBottom: '1.5rem', background: '#0078D4' }}
                        >
                            Sign In with Microsoft
                        </a>
                        
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', lineHeight: '0.1em' }}>
                            <span style={{ background: 'var(--bg-card)', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR INTERNAL FALLBACK</span>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-4">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="form-group mb-6">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {error && <p className="error-message">{error}</p>}
                            <button type="submit" className="btn-secondary w-full shadow-lg">Sign In</button>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <button type="button" onClick={() => {setForgotMode(true); setError(''); setMsg('');}} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline'}}>Forgot Password?</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handleForgot}>
                        <div className="form-group mb-6">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your registered email"
                            />
                        </div>
                        {error && <p className="error-message">{error}</p>}
                        <button type="submit" className="btn-primary w-full shadow-lg">Reset Password</button>
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button type="button" onClick={() => {setForgotMode(false); setError(''); setMsg('');}} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline'}}>Back to Login</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
