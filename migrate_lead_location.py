import sqlite3
import os

DB_FILE = "sql_app.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print(f"Database file {DB_FILE} not found!")
        return

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(leads)")
        columns = [info[1] for info in cursor.fetchall()]

        if "location_id" not in columns:
            print("Adding location_id to leads table...")
            cursor.execute("ALTER TABLE leads ADD COLUMN location_id INTEGER REFERENCES locations(id)")
            conn.commit()
            print("Successfully added location_id.")
        else:
            print("location_id already exists.")

        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
