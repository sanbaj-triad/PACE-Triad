import traceback
from app.database import SessionLocal
from app.models import TaskEvent as DBTaskEvent
from app.schemas import TaskEvent as PydanticTaskEvent

db = SessionLocal()
ev = db.query(DBTaskEvent).order_by(DBTaskEvent.id.desc()).limit(1).first()
try:
    PydanticTaskEvent.model_validate(ev)
    print("OK")
except Exception as e:
    with open("error_decoded.txt", "w") as f:
        f.write(traceback.format_exc())
