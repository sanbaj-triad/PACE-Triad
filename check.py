import json
from datetime import datetime, date, time
from app.database import SessionLocal
from app.models import TaskEvent

db = SessionLocal()
evs = db.query(TaskEvent).order_by(TaskEvent.id.desc()).limit(3).all()

def default(o):
    if hasattr(o, "value"):
        return o.value
    return str(o)

res = []
for e in evs:
    d = {}
    for c in e.__table__.columns:
        val = getattr(e, c.name)
        d[c.name] = val.value if hasattr(val, "value") else val
    res.append(d)

with open("tmp_dump.json", "w") as f:
    json.dump(res, f, default=default, indent=2)
