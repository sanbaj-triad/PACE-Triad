import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const SystemContext = createContext();

export function useSystem() {
    return useContext(SystemContext);
}

export function SystemProvider({ children }) {
    const [systemState, setSystemState] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshSystemState = async () => {
        try {
            const data = await api.get('/system/state');
            setSystemState(data);
        } catch (error) {
            console.error('Failed to fetch system state:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSystemState();
        // Setup polling every 2 minutes so banners appear dynamically for active users
        const interval = setInterval(() => {
            refreshSystemState();
        }, 120000);
        return () => clearInterval(interval);
    }, []);

    return (
        <SystemContext.Provider value={{ systemState, refreshSystemState, loading }}>
            {children}
        </SystemContext.Provider>
    );
}
