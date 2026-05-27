import sys
import os
from sqlalchemy import text
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine

def migrate():
    print("Migrating MariaDB...")
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SHOW COLUMNS FROM invoices LIKE 'amount_paid'"))
            if result.fetchone() is None:
                print("Adding amount_paid column...")
                conn.execute(text("ALTER TABLE invoices ADD COLUMN amount_paid FLOAT DEFAULT 0.0"))
                conn.commit()
                print("Success: Column added.")
            else:
                print("Column already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
