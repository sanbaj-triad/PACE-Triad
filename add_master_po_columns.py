from sqlalchemy import create_engine, text
import os

# Get absolute path to the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "invoices.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

def add_columns():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # 1. Add is_master_po to projects
            print("Adding is_master_po to projects...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN is_master_po BOOLEAN DEFAULT 0"))
            print("Done.")
        except Exception as e:
            print(f"Error adding is_master_po: {e}")

        try:
            # 2. Add milestone_po to milestones
            print("Adding milestone_po to milestones...")
            conn.execute(text("ALTER TABLE milestones ADD COLUMN milestone_po VARCHAR"))
            print("Done.")
        except Exception as e:
            print(f"Error adding milestone_po: {e}")

if __name__ == "__main__":
    add_columns()
