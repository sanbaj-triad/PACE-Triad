import os

css_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.css"

with open(css_path, "a", encoding="utf-8") as f:
    f.write("\n\n/* Fix Actuals Gantt hover popup visibility */\n.gantt-event-bar:hover .gantt-hover-details {\n    display: block;\n    animation: fadeIn 0.2s;\n}\n")

print("Hover fix applied successfully.")
