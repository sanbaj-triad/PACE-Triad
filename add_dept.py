from app.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(50) DEFAULT NULL"))
        print("Success")
except Exception as e:
    print(f"Error: {e}")
