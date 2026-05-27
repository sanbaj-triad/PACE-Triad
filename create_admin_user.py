from app import models, database, auth
from sqlalchemy.orm import Session

def create_admin_user():
    db = database.SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if user:
            print("Admin user already exists.")
            return

        hashed_password = auth.get_password_hash("admin")
        admin_user = models.User(
            username="admin",
            email="admin@example.com",
            hashed_password=hashed_password,
            is_active=True,
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully: admin / admin")
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
