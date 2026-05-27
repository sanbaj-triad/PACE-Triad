from app.database import SessionLocal
from app import models, auth
from fastapi.testclient import TestClient
from app.main import app
import json

def debug_create_task():
    db = SessionLocal()
    try:
        # 1. Login to get token
        client = TestClient(app)
        login_res = client.post("/token", data={"username": "admin", "password": "admin"})
        if login_res.status_code != 200:
            print(f"Login Failed: {login_res.json()}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get a valid user ID for assignment
        user = db.query(models.User).filter(models.User.username == "admin").first()
        
        # 3. Construct Payload (Exact match to frontend failure case)
        payload = {
            "description": "Debug Task Fail Check",
            "task_type": "Other",
            "status": "Open", # Enum check
            "start_date": None,
            "due_date": None,
            "estimated_effort": 0,
            "progress": 0,
            "assigned_to_id": user.id
        }
        
        # Test 1: Date String Payload
        payload['start_date'] = "2025-01-01"
        payload['due_date'] = "2025-01-31"
        
        print(f"Sending Payload 1 (With Dates): {json.dumps(payload, indent=2, default=str)}")
        res = client.post("/tasks/", json=payload, headers=headers)
        print(f"Response Code 1: {res.status_code}")
        print(f"Response Body 1: {res.text}")

        # Test 2: Null Assignment
        payload2 = payload.copy()
        payload2['assigned_to_id'] = None
        print(f"Sending Payload 2: {json.dumps(payload2, indent=2, default=str)}")
        res2 = client.post("/tasks/", json=payload2, headers=headers)
        print(f"Response Code 2: {res2.status_code}")
        print(f"Response Body 2: {res2.text}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_create_task()
