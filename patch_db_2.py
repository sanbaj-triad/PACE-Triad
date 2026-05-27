import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@host.docker.internal/invoice_app"
engine = create_engine(DATABASE_URL)

milestone_enums = "'DESIGN', 'HARDWARE', 'REMOTE', 'ONSITE', 'PM', 'CONTINGENCY', 'FIXED', 'OTHER'"
task_enums = "'ADMIN', 'DESIGN', 'DOCUMENTATION', 'ENGINEERING', 'FAT', 'LAB', 'LEARNING', 'ONSITE', 'ORDERING', 'OTHER', 'PM', 'PTO', 'PANEL_BUILDING', 'PLANNING', 'PROGRAMMING', 'SAT', 'SHIPPING', 'SUPPORT', 'TESTING', 'TRAINING', 'FIXED'"

with engine.begin() as conn:
    print("Fixing milestones...")
    conn.execute(text(f"ALTER TABLE milestones MODIFY COLUMN milestone_type VARCHAR(255);"))
    conn.execute(text("UPDATE milestones SET milestone_type = REPLACE(UPPER(milestone_type), ' ', '_');"))
    conn.execute(text(f"ALTER TABLE milestones MODIFY COLUMN milestone_type ENUM({milestone_enums});"))
    
    print("Fixing tasks...")
    conn.execute(text(f"ALTER TABLE tasks MODIFY COLUMN task_type VARCHAR(255);"))
    conn.execute(text("UPDATE tasks SET task_type = REPLACE(UPPER(task_type), ' ', '_');"))
    conn.execute(text(f"ALTER TABLE tasks MODIFY COLUMN task_type ENUM({task_enums});"))
print("Done!")
