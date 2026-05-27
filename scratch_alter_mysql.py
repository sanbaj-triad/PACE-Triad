from sqlalchemy import create_engine
from sqlalchemy.sql import text

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://invoice_user:invoice_password@127.0.0.1:3306/invoice_app"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE task_events ADD COLUMN clock_out_latitude FLOAT;"))
        print("Added clock_out_latitude")
    except Exception as e:
        print("Error clock_out_latitude:", e)
        
    try:
        conn.execute(text("ALTER TABLE task_events ADD COLUMN clock_out_longitude FLOAT;"))
        print("Added clock_out_longitude")
    except Exception as e:
        print("Error clock_out_longitude:", e)

    try:
        conn.execute(text("ALTER TABLE task_events ADD COLUMN entry_type VARCHAR(50) DEFAULT 'Automated';"))
        print("Added entry_type")
    except Exception as e:
        print("Error entry_type:", e)
    
    conn.commit()
    print("Database alteration complete.")
