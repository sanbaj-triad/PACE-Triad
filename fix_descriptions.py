import sys
import os
sys.path.append('.')
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE leads MODIFY description VARCHAR(5000);"))
    db.execute(text("ALTER TABLE projects MODIFY description VARCHAR(5000);"))
    db.execute(text("ALTER TABLE milestones MODIFY description VARCHAR(5000);"))
    db.execute(text("ALTER TABLE tasks MODIFY description VARCHAR(5000);"))
    db.commit()
    print("Successfully updated description columns to VARCHAR(5000).")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
