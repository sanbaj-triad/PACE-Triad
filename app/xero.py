from .config import settings
import requests
import base64
from sqlalchemy.orm import Session
from . import crud
from .logger import get_logger

logger = get_logger("app.xero")

AUTH_URL = "https://identity.xero.com/connect/token"

def get_xero_token():
    auth_str = f"{settings.xero_client_id}:{settings.xero_client_secret}"
    b64_auth_str = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {b64_auth_str}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {
        'grant_type': 'client_credentials',
        'scope': 'accounting.invoices accounting.payments accounting.contacts accounting.attachments accounting.settings'
    }
    response = requests.post(AUTH_URL, headers=headers, data=data)
    response.raise_for_status()
    return response.json()['access_token']

def get_tenant_id(access_token):
    if hasattr(settings, 'xero_tenant_id') and settings.xero_tenant_id:
        return settings.xero_tenant_id
    response = requests.get('https://api.xero.com/connections', headers={'Authorization': f'Bearer {access_token}'})
    response.raise_for_status()
    connections = response.json()
    if not connections:
        raise ValueError("No Xero connections found for this Client ID")
    return connections[0]['tenantId']

def sync_invoice_to_xero(invoice_data, db: Session):
    """Sync Invoice to Xero and return the expected Xero Invoice ID."""
    try:
        token = get_xero_token()
        tenant_id = get_tenant_id(token)
        
        customer = invoice_data.project.customer
        
        line_items = []
        for item in invoice_data.items:
            line_items.append({
                "Description": item.description,
                "Quantity": float(item.quantity) if item.quantity else 1.0,
                "UnitAmount": float(item.unit_price) if item.unit_price else 0.0,
                "AccountCode": "400",
                "TaxType": "NONE"
            })
            
        xero_invoice = {
            "Type": "ACCREC",
            "Contact": {
                "Name": customer.name,
                "EmailAddress": customer.email if customer.email else ""
            },
            "InvoiceNumber": invoice_data.invoice_number,
            "Reference": invoice_data.project.project_unique_id or "",
            "LineItems": line_items,
            "Status": "AUTHORISED"
        }
        
        if invoice_data.issue_date:
            xero_invoice["Date"] = invoice_data.issue_date.strftime("%Y-%m-%d")
        if invoice_data.due_date:
            xero_invoice["DueDate"] = invoice_data.due_date.strftime("%Y-%m-%d")
            
        payload = {
            "Invoices": [xero_invoice]
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
            json=payload
        )
        status_code = response.status_code
        if response.status_code not in (200, 201):
            logger.error(f"XERO: endpoint=Push Invoice, entity_id={invoice_data.id}, success=False, response_code={status_code} | Details: {response.text}")
            crud.log_xero_interaction(db, endpoint="Push Invoice", entity_type="Invoice", entity_id=invoice_data.id, status="ERROR", details=response.text)
        else:
            logger.info(f"XERO: endpoint=Push Invoice, entity_id={invoice_data.id}, success=True, response_code={status_code}")
            crud.log_xero_interaction(db, endpoint="Push Invoice", entity_type="Invoice", entity_id=invoice_data.id, status="SUCCESS", details=response.text)
            
        response.raise_for_status()
        
        result = response.json()
        if result.get('Invoices'):
            return result['Invoices'][0]['InvoiceID']
        return None
    except Exception as e:
        logger.error(f"XERO: endpoint=Push Invoice, entity_id={invoice_data.id}, success=False, response_code=500 | Error: {str(e)}")
        crud.log_xero_interaction(db, endpoint="Push Invoice", entity_type="Invoice", entity_id=invoice_data.id, status="ERROR", details=str(e))
        raise e

def get_invoice_from_xero(xero_id: str, db: Session = None):
    """Fetch invoice details from Xero API using InvoiceID."""
    try:
        token = get_xero_token()
        tenant_id = get_tenant_id(token)
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Xero-tenant-id': tenant_id,
            'Accept': 'application/json'
        }
        
        response = requests.get(
            f'https://api.xero.com/api.xro/2.0/Invoices/{xero_id}',
            headers=headers
        )
        status_code = response.status_code
        logger.info(f"XERO: endpoint=Fetch Invoice, entity_id={xero_id}, success=True, response_code={status_code}")
        response.raise_for_status()
        result = response.json()
        
        if db:
            crud.log_xero_interaction(db, endpoint="Fetch Invoice", entity_type="Invoice", status="SUCCESS", details=response.text)
            
        if result.get('Invoices'):
            return result['Invoices'][0]
        return None
    except Exception as e:
        logger.error(f"XERO: endpoint=Fetch Invoice, entity_id={xero_id}, success=False | Error: {str(e)}")
        if db:
            crud.log_xero_interaction(db, endpoint="Fetch Invoice", entity_type="Invoice", status="ERROR", details=str(e))
        return None

def push_payment_to_xero(invoice_xero_id: str, amount: float, date_str: str, account_code: str, reference: str, db: Session):
    """Push a single payment mapped against an existing Xero Invoice."""
    try:
        if not invoice_xero_id:
            raise ValueError("Invoice must be synced to Xero before applying payments.")
            
        token = get_xero_token()
        tenant_id = get_tenant_id(token)
        
        # Dynamically determine if user passed a GUID or a legacy Code
        account_mapping = {}
        if len(account_code) == 36 and '-' in account_code:
            account_mapping["AccountID"] = account_code
        else:
            account_mapping["Code"] = account_code
            
        payload = {
            "Payments": [
                {
                    "Invoice": {
                        "InvoiceID": invoice_xero_id
                    },
                    "Account": account_mapping,
                    "Date": date_str,
                    "Amount": float(amount),
                    "Reference": reference
                }
            ]
        }
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Xero-tenant-id': tenant_id,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            'https://api.xero.com/api.xro/2.0/Payments',
            headers=headers,
            json=payload
        )
        status_code = response.status_code
        if response.status_code not in (200, 201):
            logger.error(f"XERO: endpoint=Push Payment, entity_id={invoice_xero_id}, success=False, response_code={status_code} | Details: {response.text}")
            crud.log_xero_interaction(db, endpoint="Push Payment", entity_type="Payment", status="ERROR", details=response.text)
        else:
            logger.info(f"XERO: endpoint=Push Payment, entity_id={invoice_xero_id}, success=True, response_code={status_code}")
            crud.log_xero_interaction(db, endpoint="Push Payment", entity_type="Payment", status="SUCCESS", details=response.text)
            
        response.raise_for_status()
        
        result = response.json()
        if result.get('Payments'):
            return result['Payments'][0]
        return None
    except Exception as e:
        logger.error(f"XERO: endpoint=Push Payment, entity_id={invoice_xero_id}, success=False, response_code=500 | Error: {str(e)}")
        crud.log_xero_interaction(db, endpoint="Push Payment", entity_type="Payment", status="ERROR", details=str(e))
        raise e

def get_bank_accounts(db: Session = None):
    """Fetch Bank Accounts from Xero"""
    try:
        token = get_xero_token()
        tenant_id = get_tenant_id(token)
        headers = {
            'Authorization': f'Bearer {token}',
            'Xero-tenant-id': tenant_id,
            'Accept': 'application/json'
        }
        # Filter strictly for Bank accounts
        response = requests.get(
            'https://api.xero.com/api.xro/2.0/Accounts?Where=Type=="BANK"',
            headers=headers
        )
        status_code = response.status_code
        logger.info(f"XERO: endpoint=Get Bank Accounts, success=True, response_code={status_code}")
        response.raise_for_status()
        result = response.json()
        return result.get('Accounts', [])
    except Exception as e:
        logger.error(f"XERO: endpoint=Get Bank Accounts, success=False | Error: {str(e)}")
        return []
