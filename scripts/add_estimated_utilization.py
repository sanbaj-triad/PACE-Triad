import sys
import os

# Add the parent directory to sys.path to resolve 'app' correctly if run from scripts/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlalchemy
from app.database import SQLALCHEMY_DATABASE_URL

def add_column():
    engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.begin() as conn:
        try:
            print("Attempting to add estimated_utilization column to tasks table...")
            conn.execute(sqlalchemy.text("ALTER TABLE tasks ADD COLUMN estimated_utilization INTEGER DEFAULT 0"))
            print("Column added successfully.")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e).lower() or "1060" in str(e):
                print("Column already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
