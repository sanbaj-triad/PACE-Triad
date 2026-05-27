import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const interceptToken = async () => {
            const token = searchParams.get('token');
            if (token) {
                // We have the PACE JWT from the Microsoft SSO callback!
                try {
                    // Fetch the user profile from the backend using the new token
                    const response = await fetch('/users/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        
                        // Hydrate AuthContext implicitly by setting LocalStorage 
                        // and forcing a hard refresh so the Context Provider reloads it natively
                        localStorage.setItem('token', token);
                        localStorage.setItem('user', JSON.stringify(userData));
                        localStorage.setItem('force_reset', 'false'); // O365 circumvents resets
                        
                        // Full page reload clears old states and forces AuthProvider initialization
                        window.location.href = '/dashboard';
                    } else {
                        console.error('Failed to validate SSO token context');
                        navigate('/login');
                    }
                } catch (error) {
                    console.error('SSO Resolution Error', error);
                    navigate('/login');
                }
            } else {
                navigate('/login');
            }
        };

        interceptToken();
    }, [searchParams, navigate]);

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Authenticating via Microsoft...</h2>
                <p style={{ color: 'var(--text-muted)' }}>Securely preparing your workspace.</p>
            </div>
        </div>
    );
};

export default AuthSuccess;
