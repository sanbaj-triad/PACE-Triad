from app.database import SessionLocal
from app import models, schemas
from pydantic import TypeAdapter

def debug_validation():
    db = SessionLocal()
    try:
        projects = db.query(models.Project).all()
        print(f"Found {len(projects)} projects in DB.")
        
        for p in projects:
            print(f"Checking Project ID {p.id}: {p.name} (Type: {p.project_type})")
            try:
                # Attempt to validate using Pydantic schema
                schemas.Project.model_validate(p)
                print("  - Validation OK")
            except Exception as e:
                print(f"  - VALIDATION ERROR: {e}")
                
    finally:
        db.close()

if __name__ == "__main__":
    debug_validation()
