from app.database import engine
from sqlalchemy import text

def add_col():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE milestones ADD COLUMN lead_id INTEGER REFERENCES leads(id)"))
            print("Successfully added lead_id to milestones")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    add_col()
