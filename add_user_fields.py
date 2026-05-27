import sqlite3
import os

def add_user_columns():
    db_path = 'sql_app.db'
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check existing columns
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        # Add phone
        if 'phone' not in columns:
            print("Adding phone column...")
            cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR DEFAULT NULL")
        else:
            print("Column phone already exists.")

        # Add start_date
        if 'start_date' not in columns:
            print("Adding start_date column...")
            cursor.execute("ALTER TABLE users ADD COLUMN start_date DATETIME DEFAULT NULL")
        else:
            print("Column start_date already exists.")

        # Add manager_id
        if 'manager_id' not in columns:
            print("Adding manager_id column...")
            cursor.execute("ALTER TABLE users ADD COLUMN manager_id INTEGER REFERENCES users(id) DEFAULT NULL")
        else:
            print("Column manager_id already exists.")
            
        conn.commit()
        print("Migration complete.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_user_columns()
