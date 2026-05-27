from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE leads ADD COLUMN project_type VARCHAR"))
            print("Migration successful: Added project_type column to leads table.")
        except Exception as e:
            print(f"Migration failed (Column might already exist): {e}")

if __name__ == "__main__":
    migrate()
