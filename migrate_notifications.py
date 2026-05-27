from sqlalchemy import create_engine, text
import sqlalchemy
import os

from app import models
from app.database import engine

def migrate():
    # 1. Add columns to users table
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;"))
            print("Added is_online to users")
        except sqlalchemy.exc.OperationalError as e:
            if "Duplicate column name" in str(e):
                pass
            else:
                print(f"Error adding is_online: {e}")
                
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_active_at DATETIME;"))
            print("Added last_active_at to users")
        except sqlalchemy.exc.OperationalError as e:
            if "Duplicate column name" in str(e):
                pass
            else:
                print(f"Error adding last_active_at: {e}")

    # 2. Create the new notifications table
    models.Base.metadata.create_all(bind=engine)
    print("Database synced successfully.")

if __name__ == "__main__":
    migrate()
