from sqlalchemy import text
from app.database import engine

def migrate():
    print("Starting migration using SQLAlchemy engine...")
    try:
        with engine.connect() as connection:
            # Add hours_spent column to task_notes table
            print("Adding 'hours_spent' column to 'task_notes' table...")
            try:
                connection.execute(text("ALTER TABLE task_notes ADD COLUMN hours_spent FLOAT DEFAULT 0.0"))
                connection.commit()
                print("Successfully added 'hours_spent' column.")
            except Exception as e:
                # Check for duplicate column error roughly
                if "Duplicate column name" in str(e) or "1060" in str(e):
                     print("'hours_spent' column already exists (Duplicate column error).")
                else:
                    print(f"Error executing ALTER TABLE: {e}")
                    raise e
                    
        print("Migration complete.")
        
    except Exception as e:
        print(f"Migration Failed: {e}")

if __name__ == "__main__":
    migrate()
