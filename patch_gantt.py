import os

css_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.css"
jsx_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.jsx"

# Update CSS
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

css = css.replace("background: var(--primary);\n    border-radius: 6px;\n    display: flex;\n    align-items: center;", "background: #0ea5e9;\n    border-radius: 6px;\n    display: flex;\n    align-items: center;")
css = css.replace("background: var(--primary);\r\n    border-radius: 6px;\r\n    display: flex;\r\n    align-items: center;", "background: #0ea5e9;\n    border-radius: 6px;\n    display: flex;\n    align-items: center;")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

# Update JSX
with open(jsx_path, "r", encoding="utf-8") as f:
    jsx = f.read()

# Add Auth imports
if "hasFinancialAccess" not in jsx:
    jsx = jsx.replace("import { useNavigate } from 'react-router-dom';", 
"""import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasFinancialAccess } from '../utils/rbac';""")

# Add hook states
if "const { user } = useAuth();" not in jsx:
    jsx = jsx.replace("const [baseDate, setBaseDate] = useState(new Date());", 
"""const [baseDate, setBaseDate] = useState(new Date());

    const { user } = useAuth();
    const isFinancial = hasFinancialAccess(user);
    const [filterUserId, setFilterUserId] = useState('all');

    useEffect(() => {
        if (!isFinancial && user) {
            setFilterUserId(user.id.toString());
        }
    }, [isFinancial, user]);""")

# Add UI controls for filtering
ui_string = """<div className="gantt-mode-toggle">"""
if "select value={filterUserId}" not in jsx:
    jsx = jsx.replace(ui_string, """{isFinancial && (
                        <select 
                            value={filterUserId} 
                            onChange={(e) => setFilterUserId(e.target.value)}
                            style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.4rem 0.5rem', borderRadius: '6px', marginRight: '0.5rem', cursor: 'pointer' }}
                        >
                            <option value="all">All Employees</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.first_name || u.username}</option>
                            ))}
                        </select>
                    )}
                    <div className="gantt-mode-toggle">""")

# Filter users logic in useMemo
filter_logic = """return users.map(u => {"""
if "if (filterUserId !== 'all')" not in jsx:
    jsx = jsx.replace(filter_logic, """let targetUsers = users;
        if (filterUserId !== 'all') {
            targetUsers = users.filter(u => u.id === parseInt(filterUserId));
        }

        return targetUsers.map(u => {""")

with open(jsx_path, "w", encoding="utf-8") as f:
    f.write(jsx)

print("Patch applied successfully.")
