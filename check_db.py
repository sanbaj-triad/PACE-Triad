from app.database import SessionLocal
from app import models

def check_data():
    db = SessionLocal()
    try:
        users = db.query(models.User).count()
        customers = db.query(models.Customer).count()
        projects = db.query(models.Project).count()
        leads = db.query(models.Lead).count()
        milestones = db.query(models.Milestone).count()
        invoices = db.query(models.Invoice).count()

        print(f"Users: {users}")
        print(f"Customers: {customers}")
        print(f"Projects: {projects}")
        print(f"Leads: {leads}")
        print(f"Milestones: {milestones}")
        print(f"Invoices: {invoices}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
