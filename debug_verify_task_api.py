from fastapi.testclient import TestClient
from app.main import app

def verify_api():
    client = TestClient(app)
    # Login
    login_res = client.post("/token", data={"username": "admin", "password": "admin"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get Task 6 (Assuming it's the latest)
    print("Fetching Task 6...")
    res = client.get("/tasks/6", headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")

if __name__ == "__main__":
    verify_api()
