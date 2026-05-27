import sys
import os
import requests
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models, crud
from app.xero import sync_invoice_to_xero

def debug_sync():
    db = SessionLocal()
    try:
        # Find any invoice with a related project and customer
        invoice = db.query(models.Invoice).first()
        if not invoice:
            print("No invoices found in the database to sync.")
            return

        print(f"Attempting to sync invoice: {invoice.invoice_number}")
        try:
            xero_id = sync_invoice_to_xero(invoice)
            print(f"Success! Xero ID: {xero_id}")
        except requests.exceptions.HTTPError as e:
            print("HTTP Error occurred!")
            print(f"Status: {e.response.status_code}")
            print(f"Response Body: {e.response.text}")
        except Exception as e:
            print(f"Other error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_sync()
