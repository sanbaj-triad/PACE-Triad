from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
print("On-Site Tasks:", db.execute(text("SELECT count(*) FROM tasks WHERE task_type = 'On-Site';")).scalar())
print("Onsite Tasks:", db.execute(text("SELECT count(*) FROM tasks WHERE task_type = 'Onsite';")).scalar())
db.close()
