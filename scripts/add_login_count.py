import sqlite3
import os

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./sql_app.db")
DB_PATH = "sql_app.db"

def add_login_count_column():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if login_count exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'login_count' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0")
            print("Successfully added 'login_count' column to 'users' table.")
            
            # Since existing records will have NULL instead of the default 0 in older SQLite
            cursor.execute("UPDATE users SET login_count = 0 WHERE login_count IS NULL")
            print("Set existing users 'login_count' to 0.")
        else:
            print("'login_count' column already exists in 'users' table.")
            
        conn.commit()
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_login_count_column()
