import sys
import os

# Ensure we can import from app
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def migrate():
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Add priority column
            conn.execute(text("ALTER TABLE tasks ADD COLUMN priority VARCHAR(50) DEFAULT 'Medium'"))
            conn.commit() # IMPORTANT for some drivers
            print("Successfully added 'priority' column to 'tasks' table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'priority' already exists in 'tasks' table.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()
