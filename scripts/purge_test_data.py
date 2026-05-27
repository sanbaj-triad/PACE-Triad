import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import (
    MilestoneAudit, TaskEvent, ActionItem, Comment, Task,
    Notification, ExpenseAttachment, Expense, InvoicePayment, LineItem,
    Invoice, Milestone, ProjectAttachment, Project, Lead,
    DirectMessage, PTORequest, EmailLog, XeroSyncLog
)

def purge_test_data():
    db = SessionLocal()
    order_of_deletion = [
        MilestoneAudit, TaskEvent, ActionItem, Comment, Task,
        Notification, ExpenseAttachment, Expense, InvoicePayment, LineItem,
        Invoice, Milestone, ProjectAttachment, Project, Lead,
        DirectMessage, PTORequest, EmailLog, XeroSyncLog
    ]
    
    print("Initiating production database purge...")
    try:
        for model in order_of_deletion:
            count = db.query(model).delete(synchronize_session=False)
            print(f"Deleted {count} records from {model.__tablename__}.")
        db.commit()
        print("Data successfully purged and committed to the database.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred during purge: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    purge_test_data()
