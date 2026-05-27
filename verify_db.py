from sqlalchemy import text
from app.database import SessionLocal

def check_tables():
    db = SessionLocal()
    tables = ["projects", "invoices", "leads", "milestones"]
    try:
        print("Checking Table Info...")
        for table in tables:
            # Query to get AUTO_INCREMENT value
            sql = f"SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'invoice_db' AND TABLE_NAME = '{table}';"
            result = db.execute(text(sql)).fetchone()
            print(f"Table {table}: Auto_Increment = {result[0] if result else 'Not Found'}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_tables()
