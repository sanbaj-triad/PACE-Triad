
import sqlite3

def migrate():
    print("Connecting to database...")
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='project_attachments'")
        if not cursor.fetchone():
            print("Creating project_attachments table...")
            cursor.execute("""
                CREATE TABLE project_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    file_path VARCHAR,
                    filename VARCHAR,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                )
            """)
            conn.commit()
            print("Migration successful.")
        else:
            print("Table project_attachments already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
