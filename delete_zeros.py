from app.database import SessionLocal
from app.models import TaskEvent

db = SessionLocal()
deleted = db.query(TaskEvent).filter(TaskEvent.hours_spent == 0.0).delete()
db.commit()
print(f"Deleted {deleted} 0-hour entries")
