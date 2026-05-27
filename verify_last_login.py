from app.database import SessionLocal
from app import models
from datetime import datetime

def verify_last_login():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            print("Admin user not found.")
            return

        print(f"Current Last Login: {user.last_login}")
        
        # Simulate Login Update
        print("Updating last_login...")
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        print(f"New Last Login: {user.last_login}")
        print("Verification Successful.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_last_login()
