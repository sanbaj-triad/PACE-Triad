from app.database import SessionLocal
from app.models import Task, TaskPriority
import sys

# Mock standard out to force flush
sys.stdout.reconfigure(encoding='utf-8')

print("Connecting to DB...")
db = SessionLocal()
try:
    print("Querying tasks...")
    tasks = db.query(Task).all()
    print(f"Found {len(tasks)} tasks.")
    for t in tasks:
        print(f"Task {t.id}: Priority='{t.priority}'")
    print("SUCCESS: Retrieved all tasks.")
except Exception as e:
    print("----------------------------------------------------------------")
    print(f"FATAL ERROR QUERYING TASKS: {e}")
    import traceback
    traceback.print_exc()
    print("----------------------------------------------------------------")
finally:
    db.close()
