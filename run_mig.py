import os
from sqlalchemy import create_engine, text

def run_migration():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found!")
        return

    engine = create_engine(db_url)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE task_events ADD COLUMN work_location VARCHAR(50) DEFAULT 'Office'"))
        print("Migration successful! work_location added.")
    except Exception as e:
        print("Migration failed or already applied:", e)

if __name__ == "__main__":
    run_migration()
