import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import text
from app.database import engine

def apply_migration():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE pto_requests ADD COLUMN o365_event_id VARCHAR(255) DEFAULT NULL"))
            print("Successfully added o365_event_id to pto_requests.")
        except Exception as e:
            print("Error or already exists in pto_requests:", e)
            
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN o365_event_id VARCHAR(255) DEFAULT NULL"))
            print("Successfully added o365_event_id to tasks.")
        except Exception as e:
            print("Error or already exists in tasks:", e)

if __name__ == '__main__':
    apply_migration()
