from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as con:
        # Add latitude
        try:
            con.execute(text("ALTER TABLE task_events ADD COLUMN latitude FLOAT;"))
            print("Added latitude column.")
        except Exception as e:
            print("Latitude column might already exist:", str(e))
        
        # Add longitude
        try:
            con.execute(text("ALTER TABLE task_events ADD COLUMN longitude FLOAT;"))
            print("Added longitude column.")
        except Exception as e:
            print("Longitude column might already exist:", str(e))
            
        con.commit()

if __name__ == "__main__":
    print("Patching MariaDB for GPS coordinates...")
    migrate()
    print("Database patched successfully.")
