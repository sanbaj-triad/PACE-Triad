from app.database import SessionLocal
from app import models
from sqlalchemy import desc

def inspect_latest_task():
    db = SessionLocal()
    try:
        task = db.query(models.Task).order_by(desc(models.Task.id)).first()
        if task:
            print(f"Latest Task ID: {task.id}")
            print(f"Description: {task.description}")
            print(f"Created At: {task.created_at}")
            print(f"Assigned To: {task.assigned_to_id}")
            print(f"Items in DB: {db.query(models.Task).count()}")
        else:
            print("No tasks found in DB.")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_latest_task()
