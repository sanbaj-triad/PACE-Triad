import sys
import traceback
from app import models, database

def diagnose():
    print("Testing database connection and schema creation...")
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("Schema creation SUCCESSFUL.")
    except Exception as e:
        print("Schema creation FAILED.")
        traceback.print_exc()
        
if __name__ == "__main__":
    diagnose()
