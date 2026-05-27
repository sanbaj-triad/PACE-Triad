from app.database import SessionLocal
from app import models, crud, schemas
from fastapi.encoders import jsonable_encoder

def check_api_logic():
    db = SessionLocal()
    try:
        print("Calling crud.get_users...")
        users = crud.get_users(db)
        print(f"CRUD returned {len(users)} users.")
        
        # Test Pydantic Serialization
        print("Testing Pydantic serialization...")
        valid_count = 0
        for u in users:
            try:
                pydantic_user = schemas.User.from_orm(u)
                # print(f"Valid: {pydantic_user.username}")
                valid_count += 1
            except Exception as e:
                print(f"Serialization ERROR for {u.username}: {e}")
        
        print(f"Successfully serialized {valid_count}/{len(users)} users.")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_api_logic()
