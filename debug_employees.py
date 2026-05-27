from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def check_employees():
    db: Session = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"Total Users: {len(users)}")
        employees = [u for u in users if u.is_employee]
        print(f"Total Employees: {len(employees)}")
        for u in users:
             print(f"User: {u.username}, Is Employee: {u.is_employee}, Role: {u.role}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_employees()
