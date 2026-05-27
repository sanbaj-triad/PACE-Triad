import sqlite3

def check_raw_data():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, milestone_type FROM milestones")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} milestones (raw query):")
        for row in rows:
            print(f"ID: {row[0]}, Type: '{row[1]}'")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_raw_data()
