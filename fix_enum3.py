import sys
import traceback
from sqlalchemy import text
from app.database import SessionLocal

def run_fix():
    print("Running MySQL ALTER TABLE and UPDATE...")
    db = SessionLocal()
    try:
        # 1. Modify the native MySQL ENUM column to include all the old values AND the new values so `Onsite` is accepted.
        alter_query = """
        ALTER TABLE tasks MODIFY task_type ENUM(
            'Engineering', 'Programming', 'On-Site', 'Onsite', 'Documentation', 'Support', 'Design', 'Planning', 
            'Training', 'Learning', 'Ordering', 'Panel Building', 'Shipping', 'Admin', 'PM', 'FAT', 'SAT', 'Testing', 'Other'
        ) DEFAULT 'Other';
        """
        db.execute(text(alter_query))
        
        # 2. Update existing records
        update_query = "UPDATE tasks SET task_type = 'Onsite' WHERE task_type = 'On-Site';"
        result = db.execute(text(update_query))
        
        updated_tasks = result.rowcount
        
        # 3. Optional: Drop the 'On-Site' from the ENUM if we want it completely clean
        clean_alter_query = """
        ALTER TABLE tasks MODIFY task_type ENUM(
            'Engineering', 'Programming', 'Onsite', 'Documentation', 'Support', 'Design', 'Planning', 
            'Training', 'Learning', 'Ordering', 'Panel Building', 'Shipping', 'Admin', 'PM', 'FAT', 'SAT', 'Testing', 'Other'
        ) DEFAULT 'Other';
        """
        db.execute(text(clean_alter_query))

        db.commit()
        print(f"Successfully migrated {updated_tasks} tasks from 'On-Site' to 'Onsite' and altered MySQL ENUM schema!")
    except Exception as e:
        db.rollback()
        with open("err.txt", "w") as f:
            f.write(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    run_fix()
