from app.database import SessionLocal
from app.crud import generate_invoice_from_milestones
from app.schemas import InvoiceGenerate, MilestoneBillItem
from app.models import User, Project, Milestone
from datetime import datetime

db = SessionLocal()
user = db.query(User).first()
project = db.query(Project).first()

if not user or not project:
    print("User or Project missing")
    exit()

# Find a milestone or create one
milestone = db.query(Milestone).filter(Milestone.project_id == project.id).first()
if not milestone:
    print("Creating dummy milestone")
    milestone = Milestone(
        project_id=project.id,
        name="Debug Milestone",
        cost=1000.0,
        milestone_number=1,
        owner_id=user.id
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)

try:
    print(f"Generating invoice for Project {project.id} from Milestone {milestone.id}")
    
    # Mock Payload
    payload = InvoiceGenerate(
        project_id=project.id,
        invoice_number="AUTO",
        issue_date=datetime.now(),
        items=[
            MilestoneBillItem(milestone_id=milestone.id, amount=500.0)
        ]
    )
    
    inv = generate_invoice_from_milestones(db, payload, user)
    print(f"Success! Generated Invoice {inv.invoice_number} (ID: {inv.id})")
    print(f"Items: {[i.description for i in inv.items]}")

except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
