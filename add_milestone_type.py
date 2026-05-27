import sqlite3
import os

def add_column():
    db_path = 'sql_app.db'
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(milestones)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'milestone_type' not in columns:
            print("Adding milestone_type column...")
            cursor.execute("ALTER TABLE milestones ADD COLUMN milestone_type VARCHAR DEFAULT 'Other'")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column milestone_type already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
