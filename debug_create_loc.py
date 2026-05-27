import sys
import os
import traceback
sys.path.append(os.getcwd())

from app import database, models, schemas, crud

try:
    db = database.SessionLocal()
    
    # Get User
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if not user:
        print("Admin user not found, using first available")
        user = db.query(models.User).first()
        
    # Get Customer
    customer = db.query(models.Customer).first()
    if not customer:
        print("No customer found for testing")
        sys.exit(1)
        
    print(f"Testing with User: {user.username}, Customer: {customer.name} ({customer.id})")
    
    # Create Schema
    loc_data = schemas.LocationCreate(
        name="Test Location Debug",
        address="123 Debug Lane",
        customer_id=customer.id
    )
    
    print("calling crud.create_location...")
    try:
        loc = crud.create_location(db, loc_data, user)
        print(f"Location created with ID: {loc.id}")
        
        # Cleanup
        # crud.delete_location(db, loc.id) # verify delete too?
        # print("Location deleted")
    except AttributeError as e:
        print(f"AttributeError: {e}")
        if "model_dump" in str(e):
             print("Likely Pydantic V1 usage. 'model_dump' not found.")
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        
    db.close()
    
except Exception as e:
    traceback.print_exc()
