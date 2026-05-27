import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    # 1. Login
    try:
        resp = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "admin"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code} {resp.text}")
            return
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful")
    except Exception as e:
        print(f"Login exception: {e}")
        return

    # 2. Get Customer
    try:
        resp = requests.get(f"{BASE_URL}/customers/", headers=headers)
        if resp.status_code != 200:
            print(f"Get Customers failed: {resp.status_code} {resp.text}")
            return
        customers = resp.json()
        if not customers:
            print("No customers found")
            return
        customer_id = customers[0]['id']
        print(f"Using Customer ID: {customer_id}")
    except Exception as e:
        print(f"Get Customers exception: {e}")
        return

    # 3. Create Location
    try:
        payload = {
            "name": "API Test Location",
            "address": "API Test Address",
            "customer_id": customer_id
        }
        resp = requests.post(f"{BASE_URL}/locations/", json=payload, headers=headers)
        if resp.status_code == 200:
            print(f"Location created successfully: {resp.json()}")
        else:
            print(f"Create Location Failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Create Location exception: {e}")

if __name__ == "__main__":
    test_api()
