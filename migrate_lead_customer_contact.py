import pymysql
import os

DB_USER = os.getenv("MYSQL_USER", "invoice_user")
DB_PASS = os.getenv("MYSQL_PASSWORD", "invoice_password")
DB_HOST = os.getenv("DB_HOST", "host.docker.internal")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("MYSQL_DATABASE", "invoice_app")

print(f"Adding customer_contact_id column to leads connecting to {DB_HOST}:{DB_PORT}...")

try:
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT
    )
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE leads ADD COLUMN customer_contact_id INT;")
        print("Successfully added customer_contact_id column to leads table.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Column customer_contact_id already exists!")
        else:
            print(f"Error altering table: {e}")

    try:
        cursor.execute("ALTER TABLE leads ADD CONSTRAINT fk_leads_customer_contact FOREIGN KEY (customer_contact_id) REFERENCES users(id);")
        print("Successfully added foreign key constraint.")
    except Exception as e:
        if "Duplicate key name" in str(e) or "already exists" in str(e):
            print("Foreign key constraint already exists!")
        else:
            print(f"Error adding constraint or constraint might exist: {e}")

    conn.commit()
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Failed to connect to database: {e}")
