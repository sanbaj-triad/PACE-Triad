from sqlalchemy import create_engine, text

# Hardcoded to match verified database.py or default
DATABASE_URL = "sqlite:///./invoice_app.db"

def migrate():
    print(f"Connecting to database at {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Add priority column
            conn.execute(text("ALTER TABLE tasks ADD COLUMN priority VARCHAR(50) DEFAULT 'Medium'"))
            conn.commit()
            print("Successfully added 'priority' column to 'tasks' table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'priority' already exists in 'tasks' table.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()
