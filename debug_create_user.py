from app import models, database, crud, schemas
import traceback

def test_create():
    print("Testing create_user...")
    db = database.SessionLocal()
    try:
        # Check if user exists and delete
        existing = db.query(models.User).filter(models.User.email == "test@test.com").first()
        if existing:
            db.delete(existing)
            db.commit()

        user_in = schemas.UserCreate(
            username="testuser", 
            email="test@test.com", 
            password="password",
            role="user"
        )
        
        # Simulating admin user creating it
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        
        crud.create_user(db, user_in, current_user=admin)
        print("User created SUCCESS.")
    except Exception:
        print("User creation FAILED.")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create()
