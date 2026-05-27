from app.database import engine
from sqlalchemy import text

def fix_data():
    with engine.connect() as conn:
        # Update specific values found or expected to be wrong
        conn.execute(text("UPDATE projects SET project_type = 'Engineering' WHERE project_type = 'ENGINEERING'"))
        conn.execute(text("UPDATE projects SET project_type = 'Design' WHERE project_type = 'DESIGN'"))
        conn.execute(text("UPDATE projects SET project_type = 'Helpdesk' WHERE project_type = 'HELPDESK'"))
        conn.execute(text("UPDATE projects SET project_type = 'Other' WHERE project_type = 'OTHER'"))
        
        # Ensure any remaining upper case ones are title cased if possible, or just mapped to Other if unknown?
        # For now, let's fix the known ones.
        
        conn.commit()
        print("Data fixed.")

if __name__ == "__main__":
    fix_data()
