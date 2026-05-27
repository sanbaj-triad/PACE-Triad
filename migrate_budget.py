import sqlite3
import os

# Database Path
DB_FILE = "./sql_app.db"

def add_column():
    if not os.path.exists(DB_FILE):
        print(f"Database not found at {DB_FILE}")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN budget FLOAT DEFAULT 0.0")
        conn.commit()
        print("Successfully added 'budget' column to 'projects' table.")
    except sqlite3.OperationalError as e:
        print(f"Error (column might already exist): {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
