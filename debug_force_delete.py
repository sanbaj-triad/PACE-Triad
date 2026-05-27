from app.database import SessionLocal
from app.crud import delete_invoice
from app.models import Invoice

db = SessionLocal()
target_id = 260015 # One of the stuck invoices

print(f"Attempting to delete Invoice {target_id}...")
try:
    success = delete_invoice(db, target_id)
    if success:
        print("Success! Invoice deleted.")
    else:
        print("Invoice not found or failed to delete (returned False).")
except Exception as e:
    print(f"FAILED with Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
