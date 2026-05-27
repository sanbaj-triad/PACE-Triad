from app.database import SessionLocal
from app.models import XeroLog
import json

db = SessionLocal()
log = db.query(XeroLog).order_by(XeroLog.id.desc()).first()
if log:
    print(f"Endpoint: {log.endpoint}")
    print(f"Status: {log.status}")
    print(f"Details: {log.details}")
else:
    print("No logs found.")
db.close()
