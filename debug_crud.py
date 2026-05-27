
import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import crud, models

def debug_crud_projects():
    print("Testing crud.get_projects()...")
    db = SessionLocal()
    try:
        projects = crud.get_projects(db)
        print(f"Projects found: {len(projects)}")
        for p in projects:
            print(f"- {p.name}")
            # Access joined fields to trigger any loading errors
            print(f"  Milestones: {len(p.milestones)}")
            if len(p.milestones) > 0:
                print(f"  First MS Audits: {len(p.milestones[0].audits)}")
                try:
                    # Depending on model modification, check line_items
                    print(f"  First MS Line Items: {len(p.milestones[0].line_items)}") 
                except Exception as e:
                    print(f"  Error accessing line_items: {e}")
                    
    except Exception as e:
        print("Exception caught in crud.get_projects:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_crud_projects()
