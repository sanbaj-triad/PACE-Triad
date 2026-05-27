import os
from sqlalchemy import create_engine
from sqlalchemy.sql import text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app")

engine = create_engine(DB_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE task_events ADD COLUMN status VARCHAR(50) DEFAULT 'Draft';"))
        conn.commit()
        print("Success: added status column")
    except Exception as e:
        print("Failed or already added:", e)
