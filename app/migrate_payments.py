import os
import sys
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the app directory to the path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import models
from app.database import engine, SQLALCHEMY_DATABASE_URL

def migrate_db():
    print(f"Connecting to database at {SQLALCHEMY_DATABASE_URL}...")
    
    # 1. Ensure the new invoice_payments table exists
    models.Base.metadata.create_all(bind=engine)
    print("Ensured `invoice_payments` table exists in the schema.")
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # 2. Query all invoices that have a non-zero amount_paid
        invoices_with_payments = db.query(models.Invoice).filter(models.Invoice.amount_paid > 0).all()
        print(f"Found {len(invoices_with_payments)} invoices with existing 'amount_paid' balances.")
        
        migrated_count = 0
        for invoice in invoices_with_payments:
            # Check if this invoice already has payments (re-run safety check)
            existing_payment_count = db.query(models.InvoicePayment).filter(models.InvoicePayment.invoice_id == invoice.id).count()
            
            if existing_payment_count == 0:
                print(f"Migrating historical payment for Invoice ID {invoice.id} (${invoice.amount_paid})")
                
                # Assume existing amount_paid as a single lump-sum historical payment
                payment_date = invoice.issue_date or datetime.utcnow() # Fallback to issue_date
                
                new_payment = models.InvoicePayment(
                    invoice_id=invoice.id,
                    amount=invoice.amount_paid,
                    payment_date=payment_date,
                    payment_method="Historical Carryover",
                    notes="Auto-migrated from legacy amount_paid column",
                    created_by_id=invoice.updated_by_id, # Optional attribution
                    updated_by_id=invoice.updated_by_id
                )
                db.add(new_payment)
                migrated_count += 1
                
        if migrated_count > 0:
            db.commit()
            print(f"Successfully migrated {migrated_count} legacy payments into the active Ledger!")
        else:
            print("No new legacy payments to migrate. Ledger is up to date.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()
        
if __name__ == "__main__":
    migrate_db()
