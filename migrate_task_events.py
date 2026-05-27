from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def migrate():
    print(f"Connecting to {SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.begin() as conn:
        print("Renaming task_notes to task_events...")
        try:
            conn.execute(text("ALTER TABLE task_notes RENAME TO task_events;"))
        except Exception as e:
            print("Error renaming table (may already exist):", e)

        print("Adding new columns...")
        cols = [
            "ALTER TABLE task_events ADD COLUMN event_date DATETIME;",
            "ALTER TABLE task_events ADD COLUMN start_time TIME;",
            "ALTER TABLE task_events ADD COLUMN end_time TIME;",
            "ALTER TABLE task_events ADD COLUMN entry_date DATETIME;"
        ]
        
        for col in cols:
            try:
                conn.execute(text(col))
                print(f"Added column successfully: {col}")
            except Exception as e:
                print(f"Column may already exist. {e}")
        
        print("Backfilling dates...")
        try:
            conn.execute(text("UPDATE task_events SET event_date = created_at WHERE event_date IS NULL;"))
            conn.execute(text("UPDATE task_events SET entry_date = created_at WHERE entry_date IS NULL;"))
        except Exception as e:
            print("Error backfilling:", e)

if __name__ == "__main__":
    migrate()
