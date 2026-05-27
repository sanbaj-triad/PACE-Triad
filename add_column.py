import sqlite3

def add_column():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    try:
        print("Attempting to add milestone_number column...")
        cursor.execute("ALTER TABLE milestones ADD COLUMN milestone_number INTEGER DEFAULT 0")
        conn.commit()
        print("Column added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
