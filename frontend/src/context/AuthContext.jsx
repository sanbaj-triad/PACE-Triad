import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [forcePasswordReset, setForcePasswordReset] = useState(false);

    useEffect(() => {
        if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            const forceResetSaved = localStorage.getItem('force_reset');
            if (forceResetSaved === 'true') {
                setForcePasswordReset(true);
            } else {
                setForcePasswordReset(false);
            }
        } else {
            setForcePasswordReset(false);
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('/token', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            
            const accessToken = data.access_token;
            const userData = data.user;
            const requiresReset = data.force_reset === true;

            localStorage.setItem('token', accessToken);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('force_reset', requiresReset ? 'true' : 'false');
            
            setToken(accessToken);
            setUser(userData);
            setForcePasswordReset(requiresReset);
            
            return true;
        } catch (error) {
            console.error("Login error", error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('force_reset');
        setToken(null);
        setUser(null);
        setForcePasswordReset(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, forcePasswordReset, setForcePasswordReset }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
