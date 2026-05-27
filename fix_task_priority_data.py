from sqlalchemy import create_engine, text

# Database URL (MySQL)
DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"

def fix_data():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Force update all NULL or empty priorities to 'Medium'
            print("Updating NULL priorities...")
            conn.execute(text("UPDATE tasks SET priority = 'Medium' WHERE priority IS NULL OR priority = ''"))
            
            # Just to be safe, update EVERYTHING to Medium if it's not a valid enum (mock safety)
            # preventing accidental data loss of valid ones if they existed, but here we assume all are potentially broken
            # checking if we have any valid ones? 
            # simplest is just update all for now since this is a new field.
            
            # Let's count them first
            result = conn.execute(text("SELECT COUNT(*) FROM tasks WHERE priority IS NULL"))
            count = result.scalar()
            print(f"Found {count} tasks with NULL priority.")

            if count > 0:
                 conn.execute(text("UPDATE tasks SET priority = 'Medium' WHERE priority IS NULL"))
                 conn.commit()
                 print("Fixed NULL priorities.")
            
            print("Verifying data...")
            result = conn.execute(text("SELECT id, priority FROM tasks LIMIT 5"))
            for row in result:
                print(row)
                
            print("SUCCESS: Data patched.")
        except Exception as e:
            print(f"Error patching data: {e}")

if __name__ == "__main__":
    fix_data()
