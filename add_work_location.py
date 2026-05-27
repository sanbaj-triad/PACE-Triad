import os
from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1/invoice_app"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def add_work_location():
    with engine.begin() as conn:
        print("Checking if column exists...")
        try:
            conn.execute(text("ALTER TABLE task_events ADD COLUMN work_location VARCHAR(50) DEFAULT 'Office'"))
            print("Successfully patched 'work_location' into task_events.")
        except Exception as e:
            err_msg = str(e).lower()
            if "duplicate column" in err_msg or "already exists" in err_msg or "duplicate key" in err_msg:
                print("work_location column already exists.")
            else:
                print("An error occurred. It may already exist or syntax is unsupported:", e)

if __name__ == "__main__":
    add_work_location()
