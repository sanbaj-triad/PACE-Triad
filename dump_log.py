import sqlite3
import json

conn = sqlite3.connect('database.db')
cursor = conn.cursor()
cursor.execute("SELECT details FROM xero_logs ORDER BY id DESC LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(row[0])
conn.close()
