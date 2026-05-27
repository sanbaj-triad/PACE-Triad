from fastapi.testclient import TestClient
from app.main import app

def test_val():
    client = TestClient(app)
    # Login
    login_res = client.post("/token", data={"username": "admin", "password": "admin"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Send garbage data to trigger 422
    res = client.post("/tasks/", json={"wrong_field": "garbage"}, headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")

if __name__ == "__main__":
    test_val()
