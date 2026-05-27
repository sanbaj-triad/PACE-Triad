from sqlalchemy import text
from app.database import SessionLocal
from app.models import Invoice

def force_delete_invoice(invoice_id):
    db = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            print(f"Invoice {invoice_id} not found")
            return
            
        print(f"Invoice {inv.invoice_number} found. Items: {len(inv.items)}")
        
        # Manually unlink
        if inv.items:
            print("Unlinking milestones via items...")
            for item in inv.items:
                if item.milestone_id:
                     item.milestone_id = None
            db.commit()
            db.refresh(inv)
            print("Milestones unlinked.")
            
        # Delete
        db.delete(inv)
        db.commit()
        print("Invoice deleted successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        force_delete_invoice(int(sys.argv[1]))
    else:
        print("Usage: python debug_delete_invoice.py <ID>")
