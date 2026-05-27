import sqlite3

try:
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE task_events ADD COLUMN clock_out_latitude FLOAT;")
        print("Added clock_out_latitude")
    except sqlite3.OperationalError as e:
        print("Skip clock_out_latitude:", e)

    try:
        cursor.execute("ALTER TABLE task_events ADD COLUMN clock_out_longitude FLOAT;")
        print("Added clock_out_longitude")
    except sqlite3.OperationalError as e:
        print("Skip clock_out_longitude:", e)

    try:
        cursor.execute("ALTER TABLE task_events ADD COLUMN entry_type VARCHAR(50) DEFAULT 'Automated';")
        print("Added entry_type")
    except sqlite3.OperationalError as e:
        print("Skip entry_type:", e)

    conn.commit()
    conn.close()
    print("Database alteration complete.")
except Exception as e:
    print(f"Error: {e}")
