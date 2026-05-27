from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from sqlalchemy import text

def check_status():
    db: Session = SessionLocal()
    try:
        print("--- Database Connection Check ---")
        # Try a simple query
        db.execute(text("SELECT 1"))
        print("Database connection successful.")
        
        print("\n--- Data Counts ---")
        user_count = db.query(models.User).count()
        print(f"Users: {user_count}")
        
        customer_count = db.query(models.Customer).count()
        print(f"Customers: {customer_count}")
        
        project_count = db.query(models.Project).count()
        print(f"Projects: {project_count}")
        
        lead_count = db.query(models.Lead).count()
        print(f"Leads: {lead_count}")
        
        invoice_count = db.query(models.Invoice).count()
        print(f"Invoices: {invoice_count}")
        
        task_count = db.query(models.Task).count()
        print(f"Tasks: {task_count}")
        
        print("\n--- Sample User Data ---")
        users = db.query(models.User).limit(3).all()
        for u in users:
            print(f"- {u.username} (Employee: {u.is_employee})")

    except Exception as e:
        print(f"DATABASE ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_status()
