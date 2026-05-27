import re

with open('frontend/src/pages/ProjectList.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add imports
if 'from \'../context/AuthContext\'' not in text:
    text = text.replace(
        "import useSessionState from '../hooks/useSessionState';",
        "import useSessionState from '../hooks/useSessionState';\nimport { useAuth } from '../context/AuthContext';\nimport { hasFinancialAccess } from '../utils/rbac';"
    )

# Add isFinancial
if 'const isFinancial' not in text:
    text = text.replace(
        "const [loading, setLoading] = useState(true);",
        "const [loading, setLoading] = useState(true);\n    const { user } = useAuth();\n    const isFinancial = user && hasFinancialAccess(user);"
    )

# 1. Sort options
text = re.sub(
    r'(<option value="budget".*?>Budget</option>\s*<option value="remaining".*?>Remaining</option>\s*<option value="financial_progress".*?>Billed %</option>)',
    r'{isFinancial && (\n                                    <>\n                                        \1\n                                    </>\n                                )}',
    text
)

# The replacement is tricky. Let's just use a simple string replace for the exports.
export_str_old = """                                { header: 'Status', accessor: 'status' },
                                { header: 'Budget', accessor: (p) => `$${p.budget?.toLocaleString() || 0}` },
                                { header: 'Remaining', accessor: (p) => `$${p.remaining_value?.toLocaleString() || 0}` },
                                { header: 'Progress', accessor: (p) => p.milestones?.length > 0 ? `${(p.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / p.milestones.length).toFixed(0)}%` : '0%' },
                                { header: 'Due Date', accessor: (p) => p.due_date ? new Date(p.due_date).toLocaleDateString() : '' }"""
export_str_new = """                                { header: 'Status', accessor: 'status' },
                                ...(isFinancial ? [
                                    { header: 'Budget', accessor: (p) => `$${p.budget?.toLocaleString() || 0}` },
                                    { header: 'Remaining', accessor: (p) => `$${p.remaining_value?.toLocaleString() || 0}` },
                                    { header: 'Billed %', accessor: (p) => `${p.financial_progress?.toFixed(0) || 0}%` }
                                ] : []),
                                { header: 'Progress', accessor: (p) => p.milestones?.length > 0 ? `${(p.milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / p.milestones.length).toFixed(0)}%` : '0%' },
                                { header: 'Due Date', accessor: (p) => p.due_date ? new Date(p.due_date).toLocaleDateString() : '' }"""
text = text.replace(export_str_old, export_str_new)

# 3. + Invoice button (Card)
inv_card_old = """{project.remaining_value > 0 && !project.do_not_invoice && (
                                                <button"""
inv_card_new = """{isFinancial && project.remaining_value > 0 && !project.do_not_invoice && (
                                                <button"""
text = text.replace(inv_card_old, inv_card_new)

# 4. Card footer budget
footer_old = """<span className="font-medium" style={{ fontSize: '1rem' }} title="Budget">
                                            Bu: ${project.budget?.toLocaleString() || '0'}
                                        </span>
                                        <span className="font-medium" style={{ fontSize: '1rem', color: '#22c55e' }} title="Remaining Value (Unbilled)">
                                            Rem: ${project.remaining_value?.toLocaleString() || '0'}
                                        </span>
                                        <span className="font-medium" style={{ fontSize: '1rem', color: project.financial_progress > 100 ? 'var(--error)' : 'var(--primary)' }} title="Billed % (Not VS Budget)">
                                            Bi: {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                        </span>"""
footer_new = """{isFinancial && (
                                            <>
                                                <span className="font-medium" style={{ fontSize: '1rem' }} title="Budget">
                                                    Bu: ${project.budget?.toLocaleString() || '0'}
                                                </span>
                                                <span className="font-medium" style={{ fontSize: '1rem', color: '#22c55e' }} title="Remaining Value (Unbilled)">
                                                    Rem: ${project.remaining_value?.toLocaleString() || '0'}
                                                </span>
                                                <span className="font-medium" style={{ fontSize: '1rem', color: project.financial_progress > 100 ? 'var(--error)' : 'var(--primary)' }} title="Billed % (Not VS Budget)">
                                                    Bi: {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                                </span>
                                            </>
                                        )}"""
text = text.replace(footer_old, footer_new)

# 5. Table headers
th_old = """<th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>Budget {sortField === 'budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('remaining')} style={{ cursor: 'pointer' }}>Remaining {sortField === 'remaining' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('financial_progress')} style={{ cursor: 'pointer' }}>Billed % {sortField === 'financial_progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>"""
th_new = """<th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                {isFinancial && (
                                    <>
                                        <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>Budget {sortField === 'budget' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('remaining')} style={{ cursor: 'pointer' }}>Remaining {sortField === 'remaining' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                        <th onClick={() => handleSort('financial_progress')} style={{ cursor: 'pointer' }}>Billed % {sortField === 'financial_progress' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    </>
                                )}"""
text = text.replace(th_old, th_new)

# 6. Table body 
td_old = """<td><span className="status-badge status-active">{project.status}</span></td>
                                        <td>${project.budget?.toLocaleString() || '0'}</td>
                                        <td>${project.remaining_value?.toLocaleString() || '0'}</td>
                                        <td className="font-medium" style={{ color: project.financial_progress > 100 ? 'var(--error)' : 'inherit' }}>
                                            {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                        </td>"""
td_new = """<td><span className="status-badge status-active">{project.status}</span></td>
                                        {isFinancial && (
                                            <>
                                                <td>${project.budget?.toLocaleString() || '0'}</td>
                                                <td>${project.remaining_value?.toLocaleString() || '0'}</td>
                                                <td className="font-medium" style={{ color: project.financial_progress > 100 ? 'var(--error)' : 'inherit' }}>
                                                    {project.financial_progress ? project.financial_progress.toFixed(0) : 0}%
                                                </td>
                                            </>
                                        )}"""
text = text.replace(td_old, td_new)

with open('frontend/src/pages/ProjectList.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
