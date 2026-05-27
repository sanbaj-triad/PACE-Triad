from fastapi.testclient import TestClient
from app.main import app
from app import dependencies

def mock_user():
    class User:
        id = 1
        is_active = True
        is_employee = True
    return User()

app.dependency_overrides[dependencies.get_current_active_user] = mock_user

client = TestClient(app)

response = client.post("/projects/1/milestones/", json={
    "name": "Line Item Override Test",
    "description": "",
    "cost": 100,
    "progress": 0,
    "is_completed": False,
    "milestone_number": 0,
    "milestone_po": "",
    "milestone_type": "Other",
    "line_item_name": "My Custom Line Item Name"
})

print("POST Status:", response.status_code)
print("POST Response:", response.text)

response_put = client.put("/milestones/1", json={
    "name": "Line Item Override Test Put",
    "description": "",
    "cost": 100,
    "progress": 0,
    "is_completed": False,
    "milestone_number": 0,
    "milestone_po": "",
    "milestone_type": "Other",
    "line_item_name": "My Custom Line Item Name Put"
})

print("PUT Status:", response_put.status_code)
print("PUT Response:", response_put.text)
