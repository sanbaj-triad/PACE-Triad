from app import models, database
from app.models import LeadStatus

db = database.SessionLocal()

try:
    # Find orphan converted leads
    # Logic: Lead is CONVERTED, but no Project exists with this lead_id
    leads = db.query(models.Lead).filter(models.Lead.status == LeadStatus.CONVERTED).all()
    
    fixed_count = 0
    for lead in leads:
        # Check if project exists
        project = db.query(models.Project).filter(models.Project.lead_id == lead.id).first()
        if not project:
            print(f"Fixing orphan lead {lead.id} ({lead.name})... Reverting to QUALIFIED.")
            lead.status = LeadStatus.QUALIFIED
            fixed_count += 1
            
    if fixed_count > 0:
        db.commit()
        print(f"Fixed {fixed_count} orphan leads.")
    else:
        print("No orphan leads found.")

finally:
    db.close()
