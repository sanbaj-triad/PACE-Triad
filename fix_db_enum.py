import sqlite3

def fix_enum_values():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    try:
        print("Updating milestone_type to use Enum Names (UPPERCASE keys)...")
        # Map values to keys: 'Other' -> 'OTHER', 'Design' -> 'DESIGN', etc.
        # Since my Enum names are just UPPER(value), I can use raw SQL upper() 
        # CAUTION: 'Hardware' -> 'HARDWARE'. Key is HARDWARE. Value is "Hardware".
        # So yes, UPPER(value) == KEY.
        
        cursor.execute("UPDATE milestones SET milestone_type = UPPER(milestone_type)")
        conn.commit()
        print("Update complete.")
        
        print("Verifying:")
        cursor.execute("SELECT id, milestone_type FROM milestones")
        for row in cursor.fetchall():
            print(f"ID: {row[0]}, Type: '{row[1]}'")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_enum_values()
