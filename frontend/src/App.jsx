import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SystemProvider } from './context/SystemContext';
import Layout from './components/Layout';
import ChangePasswordModal from './components/ChangePasswordModal';
import { hasFinancialAccess } from './utils/rbac';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import MyAnalytics from './pages/MyAnalytics';
import ProjectList from './pages/ProjectList';
import ProjectDetails from './pages/ProjectDetails';
import ProjectForm from './components/ProjectForm';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetails from './pages/InvoiceDetails';
import InvoiceAnalytics from './pages/InvoiceAnalytics';
import MilestoneBoard from './pages/MilestoneBoard';
import CustomerList from './pages/CustomerList';
import CustomerForm from './pages/CustomerForm';
import Reports from './pages/Reports';
import DetailedFinancialReport from './pages/DetailedFinancialReport';
import DetailedProjectReport from './pages/DetailedProjectReport';
import ExpenseDashboard from './pages/ExpenseDashboard';
import ExpenseForm from './pages/ExpenseForm';
import ExpenseSheet from './pages/ExpenseSheet';
import ExpenseApprovals from './pages/ExpenseApprovals';
import UserList from './pages/UserList';
import UserForm from './pages/UserForm';
import ManagerWorkspace from './pages/ManagerWorkspace';
import LeadList from './pages/LeadList';
import LeadForm from './pages/LeadForm';
import TaskList from './pages/TaskList';
import TaskForm from './pages/TaskForm';
import TaskFormV2 from './pages/TaskFormV2';
import TaskReport from './pages/TaskReport';
import EventReport from './pages/EventReport';
import PTODashboard from './pages/PTODashboard';
import Timesheet from './pages/Timesheet';
import TimesheetApprovals from './pages/TimesheetApprovals';
import UserImport from './pages/UserImport';
import EmailLogs from './pages/EmailLogs';
import CalendarView from './pages/CalendarView';
import PTOAuditReport from './pages/PTOAuditReport';
import GanttBoard from './pages/GanttBoard';
import ProjectSummary from './pages/ProjectSummary';
import OrgChart from './pages/OrgChart';
import MaintenancePage from './pages/MaintenancePage';
import AuthSuccess from './pages/AuthSuccess';
import './App.css'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};



// Wrapper for Layout to ensure protection
const ProtectedLayout = () => {
  const { token, forcePasswordReset, setForcePasswordReset } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <>
      <button id="force-reset-signal" style={{display: 'none'}} onClick={() => setForcePasswordReset(false)}></button>
      {forcePasswordReset ? (
        <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChangePasswordModal 
               onClose={() => {}} 
               hideCloseButton={true} 
            />
        </div>
      ) : (
        <Layout />
      )}
    </>
  );
};

const FinancialRoute = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user && !hasFinancialAccess(user)) return <Navigate to="/portal/tasks" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role?.toLowerCase() !== 'admin') return <Navigate to="/portal/dashboard" replace />;
  return children;
};

// const IndexRoute = () => {
//   const { user } = useAuth();
//   if (user && !hasFinancialAccess(user)) return <Navigate to="/portal/dashboard" replace />;
//   return <Navigate to="/portal/dashboard" replace />;
// };

const IndexRoute = () => {
  const { user } = useAuth();
  // If they are a standard employee, send them straight to their own tasks/analytics!
  if (user && !hasFinancialAccess(user)) return <Navigate to="/portal/my-analytics" replace />;
  return <Navigate to="/portal/dashboard" replace />;
};

/* ADDED THE REDIRECT COMPONENT HELPER FUNCTION HERE */
// This for the role based dashboard. If they are a standard employee, send them to my-analytics. If they have financial access, send them to the main dashboard.
const DashboardRedirectWrapper = () => {
  const { user } = useAuth();
  if (user && !hasFinancialAccess(user)) return <Navigate to="/portal/my-analytics" replace />;
  return <Navigate to="/portal/dashboard" replace />;
};


function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth-success" element={<AuthSuccess />} />
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* Protected Parent Route with Layout */}
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<IndexRoute />} />

        <Route path="portal/project-summary" element={<ProjectSummary />} />
        <Route path="portal/projects" element={<FinancialRoute><ProjectList /></FinancialRoute>} />
        <Route path="portal/projects/new" element={<FinancialRoute><ProjectForm /></FinancialRoute>} />
        <Route path="portal/projects/:id" element={<FinancialRoute><ProjectDetails /></FinancialRoute>} />
        <Route path="portal/doctors/edit/:id" element={<FinancialRoute><CustomerForm /></FinancialRoute>} /> {/* Typo fix? No, customer routes are below. */}
        <Route path="portal/projects/edit/:id" element={<FinancialRoute><ProjectForm /></FinancialRoute>} />

        {/* User Routes */}
        <Route path="portal/manager-workspace" element={<ManagerWorkspace />} />
        <Route path="portal/users" element={<FinancialRoute><UserList /></FinancialRoute>} />
        <Route path="portal/users/new" element={<AdminRoute><UserForm /></AdminRoute>} />
        <Route path="portal/users/edit/:id" element={<AdminRoute><UserForm /></AdminRoute>} />
        <Route path="portal/maintenance/users" element={<AdminRoute><UserImport /></AdminRoute>} />
        <Route path="portal/maintenance/emails" element={<AdminRoute><EmailLogs /></AdminRoute>} />

        {/* Milestone Route */}
        <Route path="portal/milestones" element={<FinancialRoute><MilestoneBoard /></FinancialRoute>} />

        {/* Invoice Routes */}
        <Route path="portal/invoices" element={<FinancialRoute><InvoiceList /></FinancialRoute>} />
        <Route path="portal/invoice-analysis" element={<FinancialRoute><InvoiceAnalytics /></FinancialRoute>} />
        <Route path="portal/invoices/new" element={<FinancialRoute><InvoiceForm /></FinancialRoute>} />
        <Route path="portal/invoices/:id" element={<FinancialRoute><InvoiceDetails /></FinancialRoute>} />

        {/* Expense Routes */}
        <Route path="portal/expenses" element={<ExpenseDashboard />} />
        <Route path="portal/expenses/new" element={<ExpenseForm />} />
        <Route path="portal/expense-sheet" element={<ExpenseSheet />} />
        <Route path="portal/expense-approvals" element={<FinancialRoute><ExpenseApprovals /></FinancialRoute>} />

        {/* Task Routes */}
        <Route path="portal/tasks" element={<TaskList />} />
        <Route path="portal/timesheet" element={<Timesheet />} />
        <Route path="portal/timesheet-approvals" element={<FinancialRoute><TimesheetApprovals /></FinancialRoute>} />
        <Route path="portal/tasks/new" element={<TaskFormV2 />} />
        <Route path="portal/tasks/:id" element={<TaskFormV2 />} />
        <Route path="portal/tasks/edit/:id" element={<TaskFormV2 />} />
        <Route path="portal/debug-v2" element={<TaskFormV2 />} />

        {/* Lead Routes */}
        <Route path="portal/leads" element={<FinancialRoute><LeadList /></FinancialRoute>} />
        <Route path="portal/leads/new" element={<FinancialRoute><LeadForm /></FinancialRoute>} />
        <Route path="portal/leads/edit/:id" element={<FinancialRoute><LeadForm /></FinancialRoute>} />

        {/* Customer Routes */}
        <Route path="portal/customers" element={<FinancialRoute><CustomerList /></FinancialRoute>} />
        <Route path="portal/customers/new" element={<FinancialRoute><CustomerForm /></FinancialRoute>} />
        <Route path="portal/customers/edit/:id" element={<FinancialRoute><CustomerForm /></FinancialRoute>} />

        {/* The following route is a duplicate and will be removed. */}
        {/* <Route path="portal/customers/edit/:id" element={<CustomerForm />} /> */}

        {/* Reports Routes */}
        <Route path="portal/reports/detailed" element={<FinancialRoute><DetailedFinancialReport /></FinancialRoute>} />
        <Route path="portal/reports/projects/:id" element={<FinancialRoute><DetailedProjectReport /></FinancialRoute>} />
        <Route path="portal/reports" element={<Navigate to="/portal/reports/financial" replace />} />
        <Route path="portal/reports/financial" element={<FinancialRoute><Reports view="financial" /></FinancialRoute>} />
        <Route path="portal/reports/projects" element={<FinancialRoute><Reports view="projects" /></FinancialRoute>} />
        
        <Route path="portal/org-chart" element={<OrgChart />} />

        <Route path="portal/reports/leads" element={<FinancialRoute><Reports view="leads" /></FinancialRoute>} />
        <Route path="portal/reports/task-analysis" element={<TaskReport />} />
        <Route path="portal/reports/event-analysis" element={<EventReport />} />
        
        {/* HR / PTO Routes */}
        <Route path="portal/pto" element={<PTODashboard />} />
        <Route path="portal/reports/pto-audit" element={<FinancialRoute><PTOAuditReport /></FinancialRoute>} />

        {/* Calendar and Timeline Routes */}
        <Route path="portal/calendar" element={<CalendarView />} />
        <Route path="portal/gantt" element={<GanttBoard />} />

        <Route path="messages" element={<Messages />} />
        {/* <Route path="portal/dashboard" element={<Dashboard />} /> */}
        {/* This is the fix for dashboard access based on roles. */}
        <Route path="portal/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="portal/my-analytics" element={<MyAnalytics />} />

        {/* <Route path="dashboard" element={<Navigate to="/portal/dashboard" replace />} /> */}
        <Route path="dashboard" element={<DashboardRedirectWrapper />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemProvider>
          <NotificationProvider>
            <Router>
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </SystemProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
