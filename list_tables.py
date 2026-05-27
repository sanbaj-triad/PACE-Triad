import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "invoices.db")

def list_tables():
    print(f"Connecting to: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("ERROR: Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables found:")
        for t in tables:
            print(f"- {t[0]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    list_tables()
