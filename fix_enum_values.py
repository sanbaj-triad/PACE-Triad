
import sqlite3
import os

DB_FILE = "sql_app.db"

def fix_enums():
    print(f"Fixing Enums in {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    updates = [
        ('BILLED', 'Billed'),
        ('REVERSED', 'Reversed'),
        ('MODIFIED', 'Modified')
    ]
    
    try:
        for new_val, old_val in updates:
            cursor.execute("UPDATE milestone_audits SET action = ? WHERE action = ?", (new_val, old_val))
            if cursor.rowcount > 0:
                print(f"Updated {cursor.rowcount} rows: {old_val} -> {new_val}")
        
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
    
    print("Done.")

if __name__ == "__main__":
    fix_enums()
