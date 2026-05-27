import sys
import os
import requests
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.xero import get_xero_token, get_tenant_id

db = SessionLocal()
invoice_data = db.query(models.Invoice).first()

token = get_xero_token()
tenant_id = get_tenant_id(token)

customer = invoice_data.project.customer
line_items = [{"Description": "Test Item", "Quantity": 1.0, "UnitAmount": 10.0, "AccountCode": "200"}]
xero_invoice = {
    "Type": "ACCREC",
    "Contact": {"Name": customer.name},
    "Date": invoice_data.issue_date.strftime("%Y-%m-%d") if invoice_data.issue_date else "2024-01-01",
    "DueDate": invoice_data.due_date.strftime("%Y-%m-%d") if invoice_data.due_date else "2024-01-31",
    "InvoiceNumber": invoice_data.invoice_number,
    "LineItems": line_items,
    "Status": "AUTHORISED"
}

headers = {
    'Authorization': f'Bearer {token}',
    'Xero-tenant-id': tenant_id,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://api.xero.com/api.xro/2.0/Invoices',
    headers=headers,
    json=xero_invoice
)
with open("xero_debug2.json", "w") as f:
    f.write(json.dumps(response.json(), indent=2))
