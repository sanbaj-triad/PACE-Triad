from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN locked_out BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Successfully added locked_out column to users table.")
        except Exception as e:
            print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    migrate()
