import sys
import os
import traceback

sys.path.append(os.getcwd())

try:
    from app import database, models, auth
    
    # Check static dir
    if not os.path.exists("app/static"):
        print("app/static does not exist!")
    else:
        print("app/static exists.")

    db = database.SessionLocal()
    print("DB Session created")
    
    customer = db.query(models.Customer).first()
    print(f"Customer query done: {customer}")
    
    if not customer:
        print("Creating default customer")
        customer = models.Customer(name="Default Customer", email="admin@example.com")
        db.add(customer)
        db.commit()
        db.refresh(customer)
        print("Customer created")

    user = db.query(models.User).first()
    print(f"User query done: {user}")
    
    if not user:
        print("Creating admin user")
        hashed_pw = auth.get_password_hash("admin")
        user = models.User(username="admin", email="admin@example.com", hashed_password=hashed_pw, role="admin", customer_id=customer.id)
        db.add(user)
        db.commit()
        print("User created")
        
    db.close()
    print("Seed Logic Successful")

except Exception:
    with open('seed_error.log', 'w') as f:
        traceback.print_exc(file=f)
    traceback.print_exc()
