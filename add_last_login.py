import sqlite3
import os

def add_last_login_column():
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
        
        # Add last_login
        if 'last_login' not in columns:
            print("Adding last_login column...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column last_login already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_last_login_column()
