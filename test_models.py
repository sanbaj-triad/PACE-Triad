import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

db = SessionLocal()
try:
    print("Testing Projects...")
    projects = db.query(models.Project).all()
    print(f"Projects count: {len(projects)}")
    
    print("Testing Invoices...")
    invoices = db.query(models.Invoice).all()
    print(f"Invoices count: {len(invoices)}")
    if invoices:
        print(f"Invoice 1 amount_paid: {invoices[0].amount_paid}")
        print(f"Invoice 1 balance: {invoices[0].balance_due}")
        
    print("Testing Milestones...")
    milestones = db.query(models.Milestone).all()
    print(f"Milestones count: {len(milestones)}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
