
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Connect to SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_sqlite():
    print(f"Checking database at: {os.path.abspath('sql_app.db')}")
    if not os.path.exists('sql_app.db'):
        print("ERROR: sql_app.db file not found!")
        return

    db = SessionLocal()
    try:
        # Check Users
        result = db.execute(text("SELECT count(*) FROM users"))
        count = result.scalar()
        print(f"Users found in SQLite: {count}")
        
    except Exception as e:
        print(f"Error querying SQLite: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sqlite()
