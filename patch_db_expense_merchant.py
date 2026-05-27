from sqlalchemy import create_engine, text
import os

# Create engine
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_patch():
    try:
        with engine.begin() as conn:
            print("Checking if 'merchant_name' exists in 'expenses' table...")
            result = conn.execute(text("SHOW COLUMNS FROM expenses LIKE 'merchant_name'"))
            if not result.fetchone():
                print("Adding 'merchant_name' column to 'expenses'...")
                conn.execute(text("ALTER TABLE expenses ADD COLUMN merchant_name VARCHAR(255) NULL"))
                print("Added column successfully.")
            else:
                print("'merchant_name' column already exists.")
            
    except Exception as e:
        print(f"Error during patching: {e}")

if __name__ == "__main__":
    run_patch()
