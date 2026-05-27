from app.database import SessionLocal
from app.crud import create_invoice
from app.schemas import InvoiceCreate
from app.models import User, Project
from datetime import datetime

db = SessionLocal()
# Get a user and project
user = db.query(User).first()
project = db.query(Project).first()

if not user:
    print("No user found")
    exit()
if not project:
    print("No project found - create one first")
    exit()

project_id = project.id # Adjust based on previous output or known project

try:
    print(f"Creating invoice for Project {project_id} by User {user.username}")
    # Minimal schema
    inv_schema = InvoiceCreate(
        project_id=project_id
    )
    print(f"Schema dump: {inv_schema.model_dump()}")
    
    # This calls the problematic function
    new_inv = create_invoice(db, inv_schema, user)
    print(f"Success! Created Invoice {new_inv.id} with Number {new_inv.invoice_number}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
