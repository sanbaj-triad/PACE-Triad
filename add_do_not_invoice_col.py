import os
from sqlalchemy import text
from app.database import engine

def apply_migration():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN do_not_invoice BOOLEAN DEFAULT FALSE"))
            print("Successfully added do_not_invoice to projects.")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == '__main__':
    apply_migration()
