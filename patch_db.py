import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@host.docker.internal/invoice_app"
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    print("Altering milestones...")
    conn.execute(text("ALTER TABLE milestones MODIFY COLUMN milestone_type ENUM('Design', 'Hardware', 'Remote', 'Onsite', 'PM', 'Contingency', 'FIXED', 'Other') DEFAULT 'Other';"))
    print("Altering tasks...")
    conn.execute(text("ALTER TABLE tasks MODIFY COLUMN task_type ENUM('Admin', 'Design', 'Documentation', 'Engineering', 'FAT', 'LAB', 'Learning', 'Onsite', 'Ordering', 'Other', 'PM', 'PTO', 'FIXED', 'Panel Building', 'Planning', 'Programming', 'SAT', 'Shipping', 'Support', 'Testing', 'Training') DEFAULT 'Other';"))
print("Done!")
