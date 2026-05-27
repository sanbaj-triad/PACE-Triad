from app.database import SessionLocal
from app.models import Invoice, Project, User, LineItem
from sqlalchemy.orm import joinedload

db = SessionLocal()
invoices = db.query(Invoice).options(
    joinedload(Invoice.project).joinedload(Project.customer),
    joinedload(Invoice.created_by_user),
    joinedload(Invoice.items)
).order_by(Invoice.id.desc()).limit(5).all()

with open("check_invoices_out.txt", "w", encoding="utf-8") as f:
    f.write(f"Found {len(invoices)} recent invoices:\n")
    for inv in invoices:
        f.write(f"ID: {inv.id} | Number: {inv.invoice_number} | Status: {inv.status}\n")
        f.write(f"  Project: {inv.project.name if inv.project else 'None'} (ID: {inv.project_id})\n")
        f.write(f"  Customer: {inv.project.customer.name if inv.project and inv.project.customer else 'None'}\n")
        f.write(f"  Created By: {inv.created_by_user.username if inv.created_by_user else 'None'} (ID: {inv.created_by_id})\n")
        f.write(f"  Items: {len(inv.items)}\n")
        f.write("-" * 40 + "\n")
db.close()
