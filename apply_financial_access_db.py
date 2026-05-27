import sqlalchemy
from sqlalchemy import create_engine
from app.database import SQLALCHEMY_DATABASE_URL
import pymysql

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # 1. Add the has_financial_access column
    try:
        conn.execute(sqlalchemy.text("ALTER TABLE users ADD COLUMN has_financial_access BOOLEAN DEFAULT FALSE;"))
        print("Successfully added has_financial_access column to users table.")
    except sqlalchemy.exc.OperationalError as e:
        if "Duplicate column name" in str(e) or "1060" in str(e):
            print("Column has_financial_access already exists. Skipping alteration.")
        else:
            raise e

    # 2. Populate data based on roles
    try:
        res = conn.execute(sqlalchemy.text(
            "UPDATE users SET has_financial_access = TRUE WHERE role IN ('admin', 'project manager', 'finance');"
        ))
        conn.commit()
        print(f"Successfully migrated {res.rowcount} users to True for financial access.")
    except Exception as e:
        print(f"Error migrating existing users: {e}")
