from fastapi.testclient import TestClient
from app.main import app

def test_redirect():
    client = TestClient(app)
    # Login
    login_res = client.post("/token", data={"username": "admin", "password": "admin"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # POST to /tasks (no slash)
    print("Testing POST to /tasks (no slash)...")
    res = client.post("/tasks", json={"description": "Redirect Test"}, headers=headers) # Explicitly no slash
    print(f"Status: {res.status_code}")
    print(f"History: {[r.status_code for r in res.history]}")
    print(f"URL: {res.url}")
    print(f"Body: {res.text}")

if __name__ == "__main__":
    test_redirect()
