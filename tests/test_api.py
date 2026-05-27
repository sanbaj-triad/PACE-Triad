from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app, get_db
from app.database import Base
import pytest

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_project():
    response = client.post(
        "/projects/",
        json={"name": "Test Project", "client_name": "Test Client", "description": "A test project"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

def test_read_projects():
    response = client.get("/projects/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_create_invoice():
    # First create a project to link to
    project_response = client.post(
        "/projects/",
        json={"name": "Invoice Project", "client_name": "Client B"},
    )
    project_id = project_response.json()["id"]

    response = client.post(
        "/invoices/",
        json={"invoice_number": "INV-001", "project_id": project_id, "status": "draft"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["invoice_number"] == "INV-001"
    assert data["project_id"] == project_id
