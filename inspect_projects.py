
from app.database import SessionLocal
from app.models import Project, User

def inspect_projects():
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        print(f"Total Projects: {len(projects)}")
        for p in projects:
            print(f"ID: {p.id} | Name: {p.name} | Created By: {p.created_by_id}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_projects()
