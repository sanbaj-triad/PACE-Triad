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
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(leads)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Current columns under analysis: {columns}")

        new_columns = {
            "customer_id": "INTEGER",
            "poc_id": "INTEGER"
        }

        changes_made = False
        for col, dtype in new_columns.items():
            if col not in columns:
                print(f"Adding column: {col} ({dtype})")
                try:
                    cursor.execute(f"ALTER TABLE leads ADD COLUMN {col} {dtype}")
                    # Add foreign key constraint? SQLite supports it but altering to add constraint is complex.
                    # We usually leave it loose in SQLite or rebuild table. leaving loose is fine for dev.
                    changes_made = True
                except Exception as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column '{col}' already exists.")

        if changes_made:
            conn.commit()
            print("Migration committed successfully.")
        else:
            print("No changes needed.")

        conn.close()

    except Exception as e:
        print(f"Migration failed completely: {e}")

if __name__ == "__main__":
    migrate()
