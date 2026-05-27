from app.database import SessionLocal, engine
from sqlalchemy import text

def add_project_due_date():
    db = SessionLocal()
    try:
        # SQLite specific command. For Postgres use "ALTER TABLE projects ADD COLUMN due_date TIMESTAMP"
        # Checking if column exists first would be better but simple ALTER is fine for this task
        try:
            db.execute(text("ALTER TABLE projects ADD COLUMN due_date DATETIME"))
            db.commit()
            print("Successfully added due_date column to projects table.")
        except Exception as e:
            print(f"Column might already exist or error: {e}")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_project_due_date()
