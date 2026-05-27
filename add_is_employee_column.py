from app.database import engine, Base
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_employee BOOLEAN DEFAULT 0"))
            print("Added is_employee column to users table")
        except Exception as e:
            print(f"Error adding column (might already exist): {e}")

if __name__ == "__main__":
    add_column()
