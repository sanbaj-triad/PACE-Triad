import os

schemas_path = r"c:\Apps\python\Invoice_Project_Lead\app\schemas.py"
jsx_path = r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\GanttBoard.jsx"

# --- Update schemas.py ---
with open(schemas_path, "r", encoding="utf-8") as f:
    text = f.read()

target_str = """class MilestoneReference(BaseModel):
    id: int
    name: str
    milestone_number: int"""

replacement_str = """class MilestoneReference(BaseModel):
    id: int
    name: str
    milestone_number: int
    due_date: Optional[datetime] = None"""

if "due_date: Optional[datetime]" not in text.split("class MilestoneReference")[1].split("class ")[0]:
    text = text.replace(target_str, replacement_str)

with open(schemas_path, "w", encoding="utf-8") as f:
    f.write(text)

# --- Update GanttBoard.jsx ---
with open(jsx_path, "r", encoding="utf-8") as f:
    jsx = f.read()

target_validation = "// --- ALLOCATION VALIDATION ALGORITHM (<= 100%) ---"
replacement_validation = """            // --- MILESTONE BOUNDARY VALIDATION ---
            if (ctx.task.milestone && ctx.task.milestone.due_date) {
                const mDate = new Date(ctx.task.milestone.due_date);
                // mDate.setMinutes(mDate.getMinutes() - mDate.getTimezoneOffset()); // Some environments pass clean ISO. Let's just use substring.
                const mDateCode = ctx.task.milestone.due_date.substring(0, 10);
                
                if (newEndCode > mDateCode) {
                    alert(`Action Denied! Task due date cannot be moved past its linked Milestone due date (${mDateCode}). Bouncing back.`);
                    return;
                }
            }

            // --- ALLOCATION VALIDATION ALGORITHM (<= 100%) ---"""

if "MILESTONE BOUNDARY VALIDATION" not in jsx:
    jsx = jsx.replace(target_validation, replacement_validation)

with open(jsx_path, "w", encoding="utf-8") as f:
    f.write(jsx)

print("Patch applied successfully.")
