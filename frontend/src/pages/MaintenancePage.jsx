import React from 'react';
import { HardHat } from 'lucide-react';

export default function MaintenancePage() {
    return (
        <div style={{
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh', 
            background: 'var(--bg-main)', 
            color: 'var(--text-main)', 
            textAlign: 'center',
            padding: '2rem'
        }}>
            <div style={{
                background: 'var(--bg-card)', 
                padding: '3rem', 
                borderRadius: '12px', 
                border: '1px solid var(--border)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                maxWidth: '500px'
            }}>
                <HardHat size={64} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
                <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>System Offline</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    The PACE environment is currently down for scheduled structural database maintenance. We are performing live infrastructure upgrades to ensure maximum performance and security.
                </p>
                <div style={{
                    padding: '1rem',
                    background: 'var(--bg-dark)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    color: 'var(--text-dim)'
                }}>
                    Please check back shortly. All operations will automatically resume once the maintenance window has closed.
                </div>
            </div>
        </div>
    );
}
