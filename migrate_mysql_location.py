import sys
import os

# Ensure the app folder is in path
sys.path.append(os.path.abspath('.'))

from sqlalchemy import create_engine
from sqlalchemy.sql import text

# Read from database.py just to be safe, but we know the string
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    try:
        with engine.begin() as conn:
            print("Checking existing columns...")
            result = conn.execute(text("SHOW COLUMNS FROM leads LIKE 'location_id'"))
            if not result.fetchone():
                print("Adding location_id...")
                conn.execute(text("ALTER TABLE leads ADD COLUMN location_id INT NULL REFERENCES locations(id)"))
                print("Successfully added location_id to MariaDB/MySQL.")
            else:
                print("location_id already exists in MariaDB/MySQL.")
    except Exception as e:
        print("Migration failed:", e)

if __name__ == "__main__":
    migrate()
