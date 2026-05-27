import sqlite3


def get_token():
    # Login as admin to get token
    # Looking at other scripts or default credentials, we don't have one readily available.
    # Instead, let's just test using the requests module if we can bypass auth, or we can use the local DB directly.
    pass

import sys
import os

sys.path.append(r"c:\Apps\python\Invoice_Project_Lead")
from app.database import SessionLocal
from app import models, crud

db = SessionLocal()
from app.main import get_calendar_events
class DummyUser:
    id = 1
    role = 'admin'

try:
    events = get_calendar_events(db=db, current_user=DummyUser())
    print("SUCCESS, found", len(events), "events")
    for e in events[:2]:
        print(e)
except Exception as e:
    import traceback
    traceback.print_exc()
