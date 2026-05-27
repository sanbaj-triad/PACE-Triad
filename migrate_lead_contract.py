import pymysql
import os

DB_USER = os.getenv("MYSQL_USER", "invoice_user")
DB_PASS = os.getenv("MYSQL_PASSWORD", "invoice_password")
DB_HOST = os.getenv("DB_HOST", "host.docker.internal")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("MYSQL_DATABASE", "invoice_app")

print(f"Adding customer_contract column to leads connecting to {DB_HOST}:{DB_PORT}...")

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
        cursor.execute("ALTER TABLE leads ADD COLUMN customer_contract VARCHAR(255);")
        print("Successfully added customer_contract column to leads table.")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Column customer_contract already exists!")
        else:
            print(f"Error altering table: {e}")

    conn.commit()
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Failed to connect to database: {e}")
