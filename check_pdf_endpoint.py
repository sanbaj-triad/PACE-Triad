
import requests

BASE_URL = "http://127.0.0.1:8000"

def check_pdf_endpoint():
    # Login first
    token = None
    try:
        auth = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "password"})
        if auth.status_code == 200:
            token = auth.json()["access_token"]
        else:
             auth = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "admin"})
             if auth.status_code == 200:
                token = auth.json()["access_token"]
    except:
        pass
        
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    print(f"Checking {BASE_URL}/invoices/5/pdf ...") # Use ID 5 from earlier debug output
    resp = requests.get(f"{BASE_URL}/invoices/5/pdf", headers=headers)
    print(f"Status Code: {resp.status_code}")
    print(f"Content Type: {resp.headers.get('Content-Type')}")
    print(f"Content Start: {resp.content[:100]}")

if __name__ == "__main__":
    check_pdf_endpoint()
