import os

jsx_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.jsx"

with open(jsx_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add hook import
if "useSessionState" not in text:
    text = text.replace("import { hasFinancialAccess } from '../utils/rbac';", 
                        "import { hasFinancialAccess } from '../utils/rbac';\nimport useSessionState from '../hooks/useSessionState';")

# 2. Replace state variables
# Replace viewMode
text = text.replace("const [viewMode, setViewMode] = useState('month');",
                    "const [viewMode, setViewMode] = useSessionState('gantt_viewMode', 'month');")

# Replace baseDate
if "const [baseDateStr, setBaseDateStr] = useSessionState('gantt_baseDate'" not in text:
    text = text.replace("const [baseDate, setBaseDate] = useState(new Date());",
                        "const [baseDateStr, setBaseDateStr] = useSessionState('gantt_baseDate', new Date().toISOString());\n    const baseDate = useMemo(() => new Date(baseDateStr), [baseDateStr]);")

# Replace filterUserId
text = text.replace("const [filterUserId, setFilterUserId] = useState('all');",
                    "const [filterUserId, setFilterUserId] = useSessionState('gantt_filterUserId', 'all');")

# Replace Date Setter
text = text.replace("setBaseDate(nd);", "setBaseDateStr(nd.toISOString());")

# 3. Fix dependency array bug!
text = text.replace("}, [tasks, users, dragCtx]);", "}, [tasks, users, dragCtx, filterUserId]);")

with open(jsx_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Patch applied successfully.")
