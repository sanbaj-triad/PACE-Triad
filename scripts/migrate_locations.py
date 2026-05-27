import sys
import os

# Ensure app module is found
sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text, inspect

def migrate():
    inspector = inspect(engine)
    with engine.connect() as conn:
        # 1. Create 'locations' table if missing
        if not inspector.has_table("locations"):
            print("Creating 'locations' table...")
            # We can use metadata.create_all if we import models
            from app import models
            models.Base.metadata.create_all(bind=engine)
            print("Table 'locations' created (and any other missing tables).")
        else:
            print("Table 'locations' already exists.")

        # 2. Add 'location_id' to 'users' if missing
        columns_users = [c['name'] for c in inspector.get_columns("users")]
        if "location_id" not in columns_users:
            print("Adding 'location_id' to 'users'...")
            conn.execute(text("ALTER TABLE users ADD COLUMN location_id INTEGER NULL"))
            conn.execute(text("ALTER TABLE users ADD CONSTRAINT fk_users_locations FOREIGN KEY (location_id) REFERENCES locations(id)"))
            conn.commit()
            print("Column added.")
        else:
            print("Column 'location_id' already exists in 'users'.")

        # 3. Add 'location_id' to 'projects' if missing
        columns_projects = [c['name'] for c in inspector.get_columns("projects")]
        if "location_id" not in columns_projects:
            print("Adding 'location_id' to 'projects'...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN location_id INTEGER NULL"))
            conn.execute(text("ALTER TABLE projects ADD CONSTRAINT fk_projects_locations FOREIGN KEY (location_id) REFERENCES locations(id)"))
            conn.commit()
            print("Column added.")
        else:
            print("Column 'location_id' already exists in 'projects'.")

if __name__ == "__main__":
    try:
        migrate()
        print("Migration complete.")
    except Exception as e:
        print(f"Migration Failed: {e}")
