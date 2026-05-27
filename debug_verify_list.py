from app.database import SessionLocal
from app.crud import get_invoices
from app.models import Invoice

db = SessionLocal()

print("Calling crud.get_invoices(db, skip=0, limit=100)...")
results = get_invoices(db, skip=0, limit=100)

with open("verify_list_out.txt", "w", encoding="utf-8") as f:
    f.write(f"Result count: {len(results)}\n")
    for inv in results:
        f.write(f"ID: {inv.id} | No: {inv.invoice_number} | Project: {inv.project_id}\n")
        f.write(f"  Project Name: {inv.project.name if inv.project else 'None'}\n")
        f.write(f"  Customer: {inv.project.customer.name if inv.project and inv.project.customer else 'None'}\n")
        f.write("-" * 20 + "\n")
    if len(results) == 0:
        raw_count = db.query(Invoice).count()
        f.write(f"Raw Invoice Count: {raw_count}\n")

db.close()
