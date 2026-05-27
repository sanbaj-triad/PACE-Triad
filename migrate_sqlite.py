import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "sql_app.db")

def migrate():
    print(f"Migrating database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Add is_master_po to projects
        try:
            print("Adding is_master_po to projects...")
            cursor.execute("ALTER TABLE projects ADD COLUMN is_master_po BOOLEAN DEFAULT 0")
            print("Done.")
        except sqlite3.OperationalError as e:
            print(f"Skipping projects update: {e}")

        # 2. Add milestone_po to milestones
        try:
            print("Adding milestone_po to milestones...")
            cursor.execute("ALTER TABLE milestones ADD COLUMN milestone_po VARCHAR")
            print("Done.")
        except sqlite3.OperationalError as e:
            print(f"Skipping milestones update: {e}")

        conn.commit()
        print("Migration committed.")
            
    except Exception as e:
        print(f"Migration Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
