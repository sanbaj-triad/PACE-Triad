try:
    from app.database import SessionLocal
    from app import models, auth
    from fastapi.testclient import TestClient
    from app.main import app
except Exception:
    import traceback
    with open("traceback.log", "w") as f:
        f.write(traceback.format_exc())
    print("Import error logged to traceback.log")
    exit(1)

def debug_login():
    db = SessionLocal()
    try:
        # 1. Check User in DB
        user = db.query(models.User).filter(models.User.username == "admin").first()
        print(f"User found: {user.username}")
        print(f"Stored Hash: {user.hashed_password}")
        print(f"Is Active: {user.is_active}")
        
        # 2. Test Password Verification
        is_valid = auth.verify_password("admin", user.hashed_password)
        print(f"Password 'admin' valid in DB? {is_valid}")
        
        # 3. Test API Endpoint
        client = TestClient(app)
        response = client.post("/token", data={"username": "admin", "password": "admin"})
        print(f"API Response Code: {response.status_code}")
        print(f"API Response Body: {response.json()}")
        
    except Exception as e:
        import traceback
        with open("traceback.log", "w") as f:
            f.write(traceback.format_exc())
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_login()
