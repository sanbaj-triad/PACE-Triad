import sqlite3

# Connect to the SQLite database
# Adjust path if your DB file is named differently or located elsewhere
conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

try:
    # Add payment_terms column to customers table
    cursor.execute("ALTER TABLE customers ADD COLUMN payment_terms INTEGER DEFAULT 30")
    print("Successfully added 'payment_terms' column to 'customers' table.")
except sqlite3.OperationalError as e:
    print(f"Error (column might already exist): {e}")

conn.commit()
conn.close()
