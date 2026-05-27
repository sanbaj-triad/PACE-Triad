from sqlalchemy import text
from app.database import SessionLocal

def set_autoincrement():
    db = SessionLocal()
    tables = ["projects", "invoices", "leads", "milestones"]
    try:
        print("Setting AUTO_INCREMENT to 260000...")
        for table in tables:
            # Query to get current max id to avoid error if max > 260000
            # But simpler to just run ALTER TABLE. If max > 260000, it effectively does nothing or warns.
            # MySQL syntax: ALTER TABLE table_name AUTO_INCREMENT = 260000;
            sql = f"ALTER TABLE {table} AUTO_INCREMENT = 260000;"
            print(f"Executing: {sql}")
            db.execute(text(sql))
        db.commit()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    set_autoincrement()
