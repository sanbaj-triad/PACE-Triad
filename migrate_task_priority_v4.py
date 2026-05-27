from sqlalchemy import create_engine, text

# Correct MySQL Connection String from app/database.py
DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"

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
            elif "Duplicate column name" in str(e): # MySQL specific error message often looks like this
                 print("Column 'priority' already exists in 'tasks' table.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()
