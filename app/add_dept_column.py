import os
import sys

# Add the root project directory to sys.path so 'app' can be found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from app.database import engine

def apply_migration():
    try:
        with engine.begin() as conn:
            # Check if column exists first to avoid crashing if run repeatedly
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN department VARCHAR(50) DEFAULT NULL")
            print("Successfully added 'department' column to users table.")
    except Exception as e:
        if "Duplicate column name" in str(e):
             print("Column 'department' already exists.")
        else:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    apply_migration()
