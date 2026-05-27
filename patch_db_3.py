from app.models import TaskType, MilestoneType
from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@host.docker.internal/invoice_app"
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Fixing tasks...")
    # First revert constraint to VARCHAR
    conn.execute(text("ALTER TABLE tasks MODIFY COLUMN task_type VARCHAR(255);"))
    
    # Restore 'PANEL_BUILDING' -> 'Panel Building'
    conn.execute(text("UPDATE tasks SET task_type = 'Panel Building' WHERE task_type = 'PANEL_BUILDING';"))
    
    # Restore the rest from UPPERCASE -> Titlecase using pure python mapping for accuracy
    mapping = {t.name: t.value for t in TaskType if t.name != 'PANEL_BUILDING'}
    for name, value in mapping.items():
        conn.execute(text("UPDATE tasks SET task_type = :val WHERE task_type = :name"), {"val": value, "name": name})
        
    # Re-apply ENUM column
    task_enums = ", ".join([f"'{t.value}'" for t in TaskType])
    conn.execute(text(f"ALTER TABLE tasks MODIFY COLUMN task_type ENUM({task_enums}) DEFAULT 'Other';"))
print("Done!")
