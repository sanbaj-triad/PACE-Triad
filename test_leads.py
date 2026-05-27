from app.database import SessionLocal
from app.models import Lead

db = SessionLocal()
try:
    leads = db.query(Lead).all()
    print(f"Total leads: {len(leads)}")
    for l in leads[-5:]:
        print(f"ID={l.id} name={l.name} status={l.status} cust_id={l.customer_id} loc_id={l.location_id} poc_id={l.poc_id} contact_id={l.customer_contact_id} created_at={l.created_at}")
except Exception as e:
    print(e)
finally:
    db.close()
