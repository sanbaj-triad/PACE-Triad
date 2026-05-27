import sqlite3
import os

db_path = 'sql_app.db'
if not os.path.exists(db_path):
    print(f"Database file {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        tables = ['projects', 'milestones', 'invoices', 'leads', 'users', 'customers']
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count} rows")
            except sqlite3.OperationalError:
                 print(f"{table}: table not found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
