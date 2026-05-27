from app.database import SessionLocal
from app import models

def verify_user_fields():
    db = SessionLocal()
    try:
        user = db.query(models.User).first()
        if user:
            print(f"User: {user.username}")
            print(f"Phone: {user.phone}")
            print(f"Start Date: {user.start_date}")
            print(f"Manager ID: {user.manager_id}")
            print("Fields accessed successfully.")
        else:
            print("No users found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_user_fields()
