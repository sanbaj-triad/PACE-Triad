import traceback
try:
    from app.database import SessionLocal
    from app.models import Lead
    db = SessionLocal()
    leads = db.query(Lead).all()
    print("Found leads:", len(leads))
    for l in leads:
        print(f"ID: {l.id}, status: {l.status!r}, name: {l.name!r}")
        # test react logic equivalent
        if isinstance(l.status, str):
            _ = l.status.upper()
        else:
            print(f"ISSUE: lead {l.id} has status of type {type(l.status)}")
        if l.description:
            _ = str(l.description)[:50]
        # Check poc/contact
        print(f"POC: {l.poc_id}, contact: {l.customer_contact_id}")

except Exception as e:
    traceback.print_exc()
