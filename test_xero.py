import sys
import os
import requests
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.xero import get_xero_token, get_tenant_id

try:
    print("Testing get_xero_token...")
    token = get_xero_token()
    print("Token retrieved successfully. Length:", len(token))
    
    print("Testing get_tenant_id with token...")
    tenant_id = get_tenant_id(token)
    print(f"Tenant ID retrieved successfully: {tenant_id}")
except requests.exceptions.HTTPError as e:
    print("HTTP Error!")
    print(e.response.text)
except Exception as e:
    import traceback
    traceback.print_exc()
