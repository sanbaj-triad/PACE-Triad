import sys
import os
import requests
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.xero import sync_invoice_to_xero

db = SessionLocal()
try:
    invoice = db.query(models.Invoice).first()
    sync_invoice_to_xero(invoice)
    print("Success!")
except requests.exceptions.HTTPError as e:
    try:
        err = e.response.json()
        print("Xero Error Encountered:")
        if 'Elements' in err:
            for elem in err['Elements']:
                for val in elem.get('ValidationErrors', []):
                    print(f" -> {val.get('Message')}")
        else:
            print(json.dumps(err, indent=2))
    except:
        print(e.response.text)
finally:
    db.close()
