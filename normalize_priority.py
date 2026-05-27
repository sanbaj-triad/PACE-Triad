from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"

def normalize_data():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Update UPPERCASE to Title Case
            conn.execute(text("UPDATE tasks SET priority = 'Medium' WHERE priority = 'MEDIUM'"))
            conn.execute(text("UPDATE tasks SET priority = 'Low' WHERE priority = 'LOW'"))
            conn.execute(text("UPDATE tasks SET priority = 'High' WHERE priority = 'HIGH'"))
            conn.execute(text("UPDATE tasks SET priority = 'Critical' WHERE priority = 'CRITICAL'"))
            
            # Catch nulls again
            conn.execute(text("UPDATE tasks SET priority = 'Medium' WHERE priority IS NULL"))
            
            conn.commit()
            print("Successfully normalized Priority values.")
            
            # Verify
            print("Verifying values:")
            result = conn.execute(text("SELECT DISTINCT priority FROM tasks"))
            for row in result:
                print(row)
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    normalize_data()
