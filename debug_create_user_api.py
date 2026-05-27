import requests
import json

def test_api_create():
    url = "http://127.0.0.1:8000/users/"
    # Get token for admin first (assuming admin exists/password is admin)
    login_url = "http://127.0.0.1:8000/token"
    try:
        resp = requests.post(login_url, data={"username": "admin", "password": "admin"})
        if resp.status_code != 200:
            print(f"Login Failed: {resp.text}")
            return
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Payload mimicking Frontend
        payload = {
            "username": "testfrontend",
            "email": "frontend@test.com",
            "first_name": "",
            "last_name": "",
            "password": "password",
            "role": "user",
            "is_employee": False,
            "customer_id": None,
            "phone": "",
            "start_date": None,
            "last_login": None,
            "manager_id": None
        }
        
        print(f"Sending payload: {json.dumps(payload, indent=2)}")
        resp = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api_create()
