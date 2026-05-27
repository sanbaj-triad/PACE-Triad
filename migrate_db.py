
import sqlite3

def migrate():
    print("Connecting to database...")
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(projects)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'po_file_path' not in columns:
            print("Adding po_file_path column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN po_file_path VARCHAR")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column po_file_path already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
