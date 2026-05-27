from app.database import SessionLocal
from app.models import Project, Lead

def check_structure():
    db = SessionLocal()
    projects = db.query(Project).all()
    print(f"Total Projects: {len(projects)}")
    
    for p in projects:
        link_status = f"LeadID: {p.lead_id}" if p.lead_id else "No Lead Link"
        print(f"Project [{p.id}] {p.name}: {link_status}")

    print("\n--- Leads ---")
    leads = db.query(Lead).all()
    for l in leads:
        print(f"Lead [{l.id}] {l.name} (Status: {l.status})")

if __name__ == "__main__":
    check_structure()
