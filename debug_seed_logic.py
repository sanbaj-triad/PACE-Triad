
import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app import models, auth

def debug_seed():
    print("Starting debug_seed...")
    try:
        models.Base.metadata.create_all(bind=engine)
        print("Metadata created (again).")
        
        db = SessionLocal()
        print("Session created.")
        
        # Check for Customer
        print("Querying Customer...")
        customer = db.query(models.Customer).first()
        if not customer:
            print("Seeding Default Customer...")
            customer = models.Customer(name="Default Customer", email="admin@example.com")
            db.add(customer)
            db.commit()
            db.refresh(customer)
            print("Customer seeded.")
        else:
            print(f"Customer exists: {customer.id}")
        
        # Check for User
        print("Querying User...")
        user = db.query(models.User).first()
        if not user:
            print("Seeding Admin User...")
            hashed_pw = auth.get_password_hash("admin")
            # Use dynamic customer.id
            user = models.User(username="admin", email="admin@example.com", hashed_password=hashed_pw, role="admin", customer_id=customer.id)
            db.add(user)
            db.commit()
            print("User seeded.")
        else:
            print(f"User exists: {user.username}")
            
        db.close()
        print("Done.")
        
    except Exception as e:
        print("Error caught:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_seed()
