from app.database import engine, Base
from app import models
from sqlalchemy import text

def add_region_to_users():
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE users ADD COLUMN region VARCHAR(50) DEFAULT 'US/Headquarters'"))
            print("Successfully added region to users table")
        except Exception as e:
            print("Could not add region (maybe it already exists?):", e)
        connection.commit()
        
    # Also create new tables if they don't exist
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    add_region_to_users()
