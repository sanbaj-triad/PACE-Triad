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
            print("Attempting to add user_id column to expenses table...")
            conn.execute(sqlalchemy.text("ALTER TABLE expenses ADD COLUMN user_id INTEGER DEFAULT NULL"))
            print("Column user_id added successfully.")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e).lower() or "1060" in str(e):
                print("Column user_id already exists.")
            else:
                print(f"Error adding user_id: {e}")

if __name__ == "__main__":
    add_column()
