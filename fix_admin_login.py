from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, auth

def fix_admin():
    db: Session = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if user:
            print("Admin user found. Resetting password...")
            user.hashed_password = auth.get_password_hash("admin")
            db.commit()
            print("Password reset to 'admin'.")
        else:
            print("Admin user NOT found. Creating...")
            hashed_pw = auth.get_password_hash("admin")
            new_admin = models.User(
                username="admin",
                email="admin@example.com",
                hashed_password=hashed_pw,
                role="admin",
                is_active=True,
                is_employee=True,
                first_name="Admin",
                last_name="User"
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created with password 'admin'.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_admin()
