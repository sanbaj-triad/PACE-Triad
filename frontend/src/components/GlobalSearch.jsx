import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { hasFinancialAccess } from '../utils/rbac';
import { useAuth } from '../context/AuthContext';

const APP_FEATURES = [
    { label: "Overview Dashboard", url: "/portal/dashboard", requiresFinancial: false },
    { label: "Task Board", url: "/portal/tasks", requiresFinancial: false },
    { label: "Timesheet", url: "/portal/timesheet", requiresFinancial: false },
    { label: "Timesheet Approvals", url: "/portal/timesheet-approvals", requiresFinancial: true },
    { label: "PTO Dashboard", url: "/portal/pto", requiresFinancial: false },
    { label: "Calendar", url: "/portal/calendar", requiresFinancial: false },
    { label: "Expenses", url: "/portal/expenses", requiresFinancial: false },
    { label: "Expense Sheet", url: "/portal/expense-sheet", requiresFinancial: false },
    { label: "Lead Pipeline", url: "/portal/leads", requiresFinancial: true },
    { label: "Project Registry", url: "/portal/projects", requiresFinancial: true },
    { label: "Milestones", url: "/portal/milestones", requiresFinancial: true },
    { label: "Project Summary", url: "/portal/project-summary", requiresFinancial: false },
    { label: "Resource Mapping (Gantt)", url: "/portal/gantt", requiresFinancial: false },
    { label: "Invoices", url: "/portal/invoices", requiresFinancial: true },
    { label: "Invoice Analysis", url: "/portal/invoice-analysis", requiresFinancial: true },
    { label: "Customers Catalog", url: "/portal/customers", requiresFinancial: true },
    { label: "System Users", url: "/portal/users", requiresFinancial: true },
    { label: "Financial Reports", url: "/portal/reports/financial", requiresFinancial: true },
    { label: "Detailed Financial Report", url: "/portal/reports/detailed", requiresFinancial: true },
    { label: "Project Reports", url: "/portal/reports/projects", requiresFinancial: true },
    { label: "Lead Reports", url: "/portal/reports/leads", requiresFinancial: true },
    { label: "Task Analysis", url: "/portal/reports/task-analysis", requiresFinancial: false },
    { label: "Event Analysis", url: "/portal/reports/event-analysis", requiresFinancial: false },
    { label: "User Import", url: "/portal/maintenance/users", requiresFinancial: true },
    { label: "Email Logs", url: "/portal/maintenance/emails", requiresFinancial: true },
    { label: "My Analytics", url: "/portal/my-analytics", requiresFinancial: false }
];

const GlobalSearch = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isFinancial = hasFinancialAccess(user);

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const wrapperRef = useRef(null);
    const debounceTimeout = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const performSearch = async (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setIsOpen(true);

        // 1. Local App Features filter
        let localResults = APP_FEATURES
            .filter(f => !f.requiresFinancial || isFinancial)
            .filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(f => ({ type: "App Feature", id: f.url, label: f.label, url: f.url }));

        // 2. Extrinsic DB Entities filter
        try {
            const res = await api.get(`/search?q=${encodeURIComponent(searchTerm)}`);
            setResults([...localResults, ...res]);
        } catch (error) {
            console.error("Search failed:", error);
            setResults(localResults);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        
        if (val.trim().length >= 2) {
            debounceTimeout.current = setTimeout(() => {
                performSearch(val);
            }, 500); // 500ms debounce to allow sentence typing for AI
        } else {
            setResults([]);
            setIsOpen(false);
        }
    };

    const handleSelectResult = (url) => {
        navigate(url);
        setIsOpen(false);
        setQuery('');
    };

    // Grouping results functionally for UI
    const groupedResults = results.reduce((acc, obj) => {
        if (!acc[obj.type]) acc[obj.type] = [];
        acc[obj.type].push(obj);
        return acc;
    }, {});

    return (
        <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                    type="text" 
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
                    placeholder="Search apps or records..."
                    style={{
                        padding: '0.5rem 1rem 0.5rem 2.2rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-dark)',
                        color: 'var(--text-main)',
                        width: '240px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'box-shadow 0.2s, width 0.2s',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                    }}
                />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '320px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    {isLoading ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {query.trim().split(' ').length >= 3 && query.trim().length > 10 ? '✨ AI Searching...' : 'Searching...'}
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No results found for "{query}"
                        </div>
                    ) : (
                        Object.keys(groupedResults).map(type => (
                            <div key={type}>
                                <div style={{ 
                                    padding: '0.4rem 0.8rem', 
                                    background: 'var(--bg-dark)', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 'bold', 
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    borderBottom: '1px solid var(--border)'
                                }}>
                                    {type}
                                </div>
                                {groupedResults[type].map(res => (
                                    <div 
                                        key={res.id} 
                                        onClick={() => handleSelectResult(res.url)}
                                        style={{ 
                                            padding: '0.6rem 0.8rem', 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            borderBottom: '1px solid var(--border)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{res.label}</div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
