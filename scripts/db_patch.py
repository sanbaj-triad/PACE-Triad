import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@host.docker.internal/invoice_app"

engine = create_engine(DATABASE_URL)

try:
    with engine.begin() as conn:
        res = conn.execute(text("SHOW COLUMNS FROM users LIKE 'login_count'")).fetchall()
        if not res:
            conn.execute(text("ALTER TABLE users ADD COLUMN login_count INT DEFAULT 0"))
            conn.execute(text("UPDATE users SET login_count = 0 WHERE login_count IS NULL"))
            print("Successfully added 'login_count' column to 'users' table in database!")
        else:
            print("'login_count' column already exists in 'users' table.")
except Exception as e:
    print(f"Error updating database: {e}")
