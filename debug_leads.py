from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def check_leads():
    db: Session = SessionLocal()
    try:
        leads = db.query(models.Lead).all()
        print(f"Total Leads: {len(leads)}")
        for lead in leads:
            print(f"Lead {lead.id} ({lead.name}): Status={lead.status}")
            if lead.status == models.LeadStatus.CONVERTED:
                # Check for linked project
                project = db.query(models.Project).filter(models.Project.lead_id == lead.id).first()
                if project:
                    print(f"  -> Linked Project Found: {project.id} ({project.name})")
                    print(f"  -> Project Relationship on Lead object: {lead.project}")
                else:
                    print(f"  -> WARNING: Converted Lead {lead.id} has NO linked project!")
            
            # Check reverse: Project with this lead_id
            proj_reverse = db.query(models.Project).filter(models.Project.lead_id == lead.id).all()
            if proj_reverse:
                 print(f"  -> Projects claiming this lead: {[p.id for p in proj_reverse]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_leads()
