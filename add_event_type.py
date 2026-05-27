from sqlalchemy import text
from app.database import engine

def migrate():
    print("Connecting to database engine...")
    with engine.connect() as conn:
        try:
            print("Attempting to add 'event_type' column to 'task_events' table...")
            conn.execute(text("ALTER TABLE task_events ADD COLUMN event_type VARCHAR(50) DEFAULT 'Other'"))
            conn.commit()
            print("Successfully added 'event_type' column.")
            
            # Ensure any nulls are labeled
            conn.execute(text("UPDATE task_events SET event_type = 'Other' WHERE event_type IS NULL"))
            conn.commit()
            print("Backfilled nulls to 'Other'.")
            
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'event_type' already exists. Skipping.")
            else:
                print(f"Migration error: {e}")
                
if __name__ == "__main__":
    migrate()
