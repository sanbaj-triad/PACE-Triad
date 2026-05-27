import sys
import os
import requests
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models, crud
from app.xero import sync_invoice_to_xero

db = SessionLocal()
try:
    invoice = db.query(models.Invoice).first()
    sync_invoice_to_xero(invoice)
except requests.exceptions.HTTPError as e:
    with open("xero_debug.json", "w") as f:
        try:
            f.write(json.dumps(e.response.json(), indent=2))
        except:
            f.write(e.response.text)
finally:
    db.close()
