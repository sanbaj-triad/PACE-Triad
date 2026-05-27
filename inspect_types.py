from app.database import SessionLocal, engine
from sqlalchemy import text

def check_types():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name, project_type FROM projects"))
        for row in result:
            print(f"ID: {row.id}, Name: {row.name}, Type: '{row.project_type}'")

if __name__ == "__main__":
    check_types()
