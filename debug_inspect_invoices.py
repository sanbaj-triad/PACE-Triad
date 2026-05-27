from app.database import SessionLocal
from app.models import Invoice, LineItem, Milestone
from sqlalchemy.orm import joinedload

db = SessionLocal()
target_ids = [260015, 260016, 260017]

with open("debug_inspect_out.txt", "w", encoding="utf-8") as f:
    f.write(f"Inspecting Invoices: {target_ids}\n")
    
    invoices = db.query(Invoice).options(
        joinedload(Invoice.items),
        joinedload(Invoice.project)
    ).filter(Invoice.id.in_(target_ids)).all()
    
    for inv in invoices:
        f.write(f"\nInvoice ID: {inv.id} | Number: {inv.invoice_number}\n")
        f.write(f"  Status: {inv.status}\n")
        f.write(f"  Project ID: {inv.project_id} (Exists: {inv.project is not None})\n")
        f.write(f"  Line Items ({len(inv.items)}):\n")
        for item in inv.items:
            f.write(f"    - ID: {item.id}, Amount: {item.amount}, Milestone ID: {item.milestone_id}\n")
            
        # Check for any lingering milestones pointing to this invoice
        linked_milestones = db.query(Milestone).filter(Milestone.invoice_id == inv.id).all()
        f.write(f"  Linked Milestones (FK check) ({len(linked_milestones)}):\n")
        for m in linked_milestones:
            f.write(f"    - ID: {m.id}, Name: {m.name}, Completed: {m.is_completed}\n")

db.close()
