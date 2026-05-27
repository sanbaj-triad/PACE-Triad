from app.database import SessionLocal
from app.models import Project, Lead

def fix_links():
    db = SessionLocal()
    projects = db.query(Project).filter(Project.lead_id == None).all()
    print(f"Checking {len(projects)} unlinked projects...")
    
    count = 0
    for p in projects:
        # Try exact name match
        lead = db.query(Lead).filter(Lead.name == p.name).first()
        if lead:
            print(f"Linking Project '{p.name}' (ID: {p.id}) -> Lead '{lead.name}' (ID: {lead.id})")
            p.lead_id = lead.id
            db.commit()
            count += 1
        else:
             # Try partial match if needed, or manual fix
             print(f"No exact match lead found for Project '{p.name}'")

    print(f"Fixed {count} links.")

if __name__ == "__main__":
    fix_links()
