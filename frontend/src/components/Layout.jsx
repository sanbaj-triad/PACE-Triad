import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSystem } from '../context/SystemContext';
import { hasFinancialAccess } from '../utils/rbac';
import NotificationPopover from './NotificationPopover';
import ActiveUsersWidget from './ActiveUsersWidget';
import GlobalSearch from './GlobalSearch'; 
import AiCommandBar from './AiCommandBar';
import ChangePasswordModal from './ChangePasswordModal';
import TodoSidebar from './TodoSidebar';
import {
    LayoutDashboard, PieChart, CheckSquare, Clock, CalendarDays, GanttChart, Folders,
    Target, Users, Briefcase, Flag, Receipt, CreditCard, BarChart2, ShieldCheck,
    Settings, Database, Mail, LogOut, CheckCircle, FileSpreadsheet, FileText, ClipboardList, Lock, ListTodo, MessageSquare
} from 'lucide-react';

const Layout = () => {
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { systemState } = useSystem();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Sidebar base toggles
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // Grouped Navigation States
    const [workspaceOpen, setWorkspaceOpen] = useState(true);
    const [opsOpen, setOpsOpen] = useState(false);
    const [hrFinOpen, setHrFinOpen] = useState(false);
    const [crmOpen, setCrmOpen] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);
    
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isTodoOpen, setIsTodoOpen] = useState(false);

    // Global Work Location
    const [workLocation, setWorkLocation] = useState('Office');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [activeTask, setActiveTask] = useState(null);
    
    useEffect(() => {
        if (!user) return;
        const fetchUnread = () => {
            api.get('/messages/').then(res => {
                if (Array.isArray(res)) setUnreadMessages(res.filter(m => !m.is_read && m.recipient_id === user.id).length);
            }).catch(() => {});
        };

        const fetchActiveTask = () => {
            const startDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
            api.get(`/task-events/?start_date=${startDate}`).then(res => {
                if (Array.isArray(res)) {
                    // Find an open event. "Automated" means from phone usually. Or any Draft with 0 hours.
                    const active = res.find(e => e.status === 'Draft' && e.hours_spent === 0);
                    setActiveTask(active || null);
                }
            }).catch(() => {});
        };

        fetchUnread();
        fetchActiveTask();
        const interval = setInterval(() => {
            fetchUnread();
            fetchActiveTask();
        }, 15000);
        return () => clearInterval(interval);
    }, [user]);
    
    useEffect(() => {
        const saved = localStorage.getItem('globalWorkLocation');
        if (saved) setWorkLocation(saved);
        else localStorage.setItem('globalWorkLocation', 'Office');
    }, []);

    const handleLocationChange = (e) => {
        const val = e.target.value;
        setWorkLocation(val);
        localStorage.setItem('globalWorkLocation', val);
        window.dispatchEvent(new Event('workLocationChanged')); // Notify active forms if they are listening
    };

    // Helper to check active route
    const isActive = (path) => location.pathname.startsWith(path);
    const isExact = (path) => location.pathname === path;

    const SidebarItem = ({ to, icon: Icon, label, exact = false }) => {
        const isCurrent = exact ? isExact(to) : isActive(to);
        return (
            <Link to={to} className={`nav-item ${isCurrent ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {Icon && <Icon size={18} style={{ opacity: isCurrent ? 1 : 0.7 }} />}
                <span>{label}</span>
            </Link>
        );
    };

    const renderGroupHeader = (title, state, setState) => (
        <button
            onClick={() => setState(!state)}
            className="nav-item"
            style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', 
                color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase',
                padding: '1rem 1rem 0.25rem 1rem', marginTop: '0.25rem'
            }}
        >
            <span style={{ letterSpacing: '0.5px' }}>{title}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: state ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </button>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {systemState?.is_announcement_active && systemState?.announcement_message && (
                <div style={{
                    background: 'var(--primary)',
                    color: 'white',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 2000,
                    letterSpacing: '0.5px'
                }}>
                    <span style={{ marginRight: '0.5rem' }}>⚠️</span> {systemState.announcement_message}
                </div>
            )}
            <div className="app-container" style={{ flex: 1, overflow: 'hidden' }}>
                <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="logo" style={{ justifyContent: 'center', margin: '0.5rem 0 1.5rem 0', flexDirection: 'column', alignItems: 'center', height: 'auto' }}>
                    <img src="/TSE_PACE_v1.png" alt="TSE PACE Logo" style={{ width: '150px', height: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '0.5rem' }} />
                </div>
                <nav>
                    {/* Workspace - Available to everyone */}
                    {renderGroupHeader("Workspace", workspaceOpen, setWorkspaceOpen)}
                    {workspaceOpen && (
                        <div style={{ paddingLeft: '0.5rem' }}>
                            <SidebarItem to="/portal/dashboard" icon={LayoutDashboard} label="Overview" exact />
                            {(hasFinancialAccess(user) || user?.role?.toLowerCase() === 'manager') && (
                                <SidebarItem to="/portal/manager-workspace" icon={Briefcase} label="My Workspace" />
                            )}
                            <SidebarItem to="/portal/my-analytics" icon={PieChart} label="My Analytics" />
                            <SidebarItem to="/portal/calendar" icon={CalendarDays} label="Calendar" />
                            <SidebarItem to="/portal/gantt" icon={GanttChart} label="Resource Mapping" />
                            <SidebarItem to="/portal/project-summary" icon={Folders} label="Project Directory" />
                            <SidebarItem to="/portal/org-chart" icon={Users} label="Company Directory" />
                        </div>
                    )}

                    {/* Operations Group - Tasks available to all, Projects/Milestones financial only */}
                    {renderGroupHeader("Operations", opsOpen, setOpsOpen)}
                    {opsOpen && (
                        <div style={{ paddingLeft: '0.5rem' }}>
                            <SidebarItem to="/portal/tasks" icon={CheckSquare} label="Tasks" />
                            {hasFinancialAccess(user) && (
                                <>
                                    <SidebarItem to="/portal/projects" icon={Briefcase} label="Projects" />
                                    <SidebarItem to="/portal/milestones" icon={Flag} label="Milestones" />
                                </>
                            )}
                        </div>
                    )}

                    {/* HR & Financials Group - Mixed access */}
                    {renderGroupHeader("HR & Financials", hrFinOpen, setHrFinOpen)}
                    {hrFinOpen && (
                        <div style={{ paddingLeft: '0.5rem' }}>
                            <SidebarItem to="/portal/timesheet" icon={Clock} label="Timesheet" />
                            <SidebarItem to="/portal/pto" icon={Briefcase} label="PTO / HR Ledger" />
                            <SidebarItem to="/portal/expenses" icon={CreditCard} label="Expenses" exact />
                            <SidebarItem to="/portal/expense-sheet" icon={FileSpreadsheet} label="Expense Sheet" />
                            {hasFinancialAccess(user) && (
                                <>
                                    <SidebarItem to="/portal/timesheet-approvals" icon={CheckCircle} label="Timesheet Approvals" />
                                    <SidebarItem to="/portal/expense-approvals" icon={CheckSquare} label="Expense Approvals" />
                                    <SidebarItem to="/portal/invoices" icon={Receipt} label="Invoices" />
                                    <SidebarItem to="/portal/invoice-analysis" icon={BarChart2} label="Invoice Analysis" />
                                </>
                            )}
                        </div>
                    )}

                    {/* CRM Group - Financial Only */}
                    {hasFinancialAccess(user) && (
                        <>
                            {renderGroupHeader("CRM", crmOpen, setCrmOpen)}
                            {crmOpen && (
                                <div style={{ paddingLeft: '0.5rem' }}>
                                    <SidebarItem to="/portal/leads" icon={Target} label="Leads" />
                                    <SidebarItem to="/portal/customers" icon={Users} label="Customers" />
                                </div>
                            )}
                        </>
                    )}

                    {/* Administration / System Group */}
                    {(hasFinancialAccess(user) || user?.role === 'admin') && (
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                            {renderGroupHeader("Administration", adminOpen, setAdminOpen)}
                            {adminOpen && (
                                <div style={{ paddingLeft: '0.5rem' }}>
                                    {hasFinancialAccess(user) && (
                                        <>
                                            <SidebarItem to="/portal/reports/financial" icon={FileText} label="Financial Reports" exact />
                                            <SidebarItem to="/portal/reports/detailed" icon={FileText} label="Detailed Reports" exact />
                                            <SidebarItem to="/portal/reports/projects" icon={FileText} label="Project Reports" exact />
                                            <SidebarItem to="/portal/reports/leads" icon={FileText} label="Lead Reports" exact />
                                            <SidebarItem to="/portal/reports/task-analysis" icon={ClipboardList} label="Task Analysis" exact />
                                            <SidebarItem to="/portal/reports/event-analysis" icon={ClipboardList} label="Event Analysis" exact />
                                            <SidebarItem to="/portal/users" icon={ShieldCheck} label="Manage Users" />
                                        </>
                                    )}
                                    {user?.role === 'admin' && (
                                        <>
                                            <SidebarItem to="/portal/maintenance/users" icon={Database} label="User Import" exact />
                                            <SidebarItem to="/portal/maintenance/emails" icon={Mail} label="Email Logs" exact />
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    </div>
                </nav>
            </aside>

            <main className="main-content">
                <header className="top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <h1>Portal</h1>
                    </div>
                    {user && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            
                            {/* Active Task Context */}
                            {user && (
                                <div style={{ 
                                    fontSize: '0.75rem', 
                                    marginRight: '0.75rem', 
                                    lineHeight: '1.2',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    border: activeTask ? '1px solid white' : '1px solid #ff6b6b',
                                    background: activeTask ? 'rgba(255, 255, 255, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <style>{`
                                        @keyframes flashWarningBox { 0% { box-shadow: 0 0 0px 0px rgba(220,53,69,0); } 50% { box-shadow: 0 0 10px 2px rgba(220,53,69,0.5); } 100% { box-shadow: 0 0 0px 0px rgba(220,53,69,0); } }
                                    `}</style>
                                    {activeTask ? (
                                        <>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary)', textAlign: 'center' }}>⏱ Actively Clocked In</div>
                                            <div style={{ color: 'white', textAlign: 'center', marginTop: '2px' }}>{activeTask.work_location || user.location?.name || 'Remote'} ({(activeTask.latitude && activeTask.longitude) ? 'GPS' : 'Manual'})</div>
                                        </>
                                    ) : (
                                        <div style={{ fontWeight: 'bold', color: 'white', animation: 'flashWarningBox 2s infinite', textAlign: 'center', padding: '2px 0' }}>
                                            ⚠️ Please Clock In
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Global Work Location */}
                            <select 
                                value={workLocation} 
                                onChange={handleLocationChange}
                                style={{
                                    background: 'var(--bg-dark)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '0.4rem 0.75rem',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="Office">Office</option>
                                <option value="Home">Home</option>
                                <option value="Field">Field</option>
                                <option value="Travel">Travel</option>
                                <option value="Training">Training</option>
                                <option value="Other">Other</option>
                            </select>

                            {/* NEW Global Search Component */}
                            <AiCommandBar />
                            <GlobalSearch />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                                <button 
                                    onClick={() => setIsTodoOpen(!isTodoOpen)} 
                                    style={{ 
                                        background: isTodoOpen ? 'white' : 'rgba(255, 255, 255, 0.15)', 
                                        border: '1px solid white', 
                                        color: isTodoOpen ? 'var(--primary)' : 'white', 
                                        cursor: 'pointer', 
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '6px',
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontWeight: 'bold',
                                        marginRight: '0.5rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Toggle Action Items"
                                    onMouseOver={(e) => {
                                        if (!isTodoOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isTodoOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    }}
                                >
                                    <ListTodo size={18} />
                                    <span>To-Do's</span>
                                </button>
                                <button 
                                    onClick={toggleTheme} 
                                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}
                                    title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                                >
                                    {theme === 'light' ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                    )}
                                </button>
                                <ActiveUsersWidget />
                                <button 
                                    onClick={() => navigate('/messages')} 
                                    style={{ position: 'relative', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}
                                    title="Direct Messages"
                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseOut={(e) => e.currentTarget.style.color = 'white'}
                                >
                                    <MessageSquare size={20} />
                                    {unreadMessages > 0 && (
                                        <span style={{ position: 'absolute', top: -5, right: -5, background: '#dc3545', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                                            {unreadMessages > 9 ? '9+' : unreadMessages}
                                        </span>
                                    )}
                                </button>
                                <NotificationPopover />
                                <div style={{ position: 'relative' }}>
                                    <div 
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                                    >
                                        <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                                            <div style={{ fontWeight: '500', color: 'white' }}>{user.username}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>{user.role || 'User'}</div>
                                        </div>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '1rem',
                                            userSelect: 'none'
                                        }}>
                                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    </div>
                                    
                                    {isUserMenuOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '120%',
                                            right: 0,
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            padding: '0.5rem 0',
                                            minWidth: '200px',
                                            zIndex: 1000
                                        }}>
                                            <button 
                                                onClick={() => { setIsUserMenuOpen(false); setIsPasswordModalOpen(true); }}
                                                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <Lock size={16} /> Change Password
                                            </button>
                                            <button 
                                                onClick={logout}
                                                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <LogOut size={16} /> Logout
                                            </button>
                                            <div style={{ 
                                                borderTop: '1px solid var(--border)', 
                                                marginTop: '0.25rem', 
                                                paddingTop: '0.5rem', 
                                                paddingLeft: '1rem', 
                                                color: 'var(--text-muted)', 
                                                fontSize: '0.75rem' 
                                            }}>
                                                Version: {systemState?.app_version || '1.0.0'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                <div className="content-area">
                    <Outlet />
                </div>
                <TodoSidebar isVisible={isTodoOpen} onClose={() => setIsTodoOpen(false)} />
            </main>

            {isPasswordModalOpen && (
                <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
            )}
        </div>
    </div>
);
};

export default Layout;
