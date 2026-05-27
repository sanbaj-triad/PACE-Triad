
import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import models

def check_counts():
    db = SessionLocal()
    try:
        users = db.query(models.User).count()
        customers = db.query(models.Customer).count()
        projects = db.query(models.Project).count()
        milestones = db.query(models.Milestone).count()
        invoices = db.query(models.Invoice).count()
        line_items = db.query(models.LineItem).count()
        audits = db.query(models.MilestoneAudit).count()
        
        print(f"Users: {users}")
        print(f"Customers: {customers}")
        print(f"Projects: {projects}")
        print(f"Milestones: {milestones}")
        print(f"Invoices: {invoices}")
        print(f"LineItems: {line_items}")
        print(f"MilestoneAudits: {audits}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_counts()
