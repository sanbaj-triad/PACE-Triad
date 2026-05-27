from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT details FROM xero_logs ORDER BY id DESC LIMIT 2"))
    for row in result:
        print(row[0])
