from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE milestones ADD COLUMN line_item_name VARCHAR(255);"))
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print("Migration failed or already applied:", e)

if __name__ == "__main__":
    run()
