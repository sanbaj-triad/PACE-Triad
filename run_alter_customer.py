import sys
import os
sys.path.append('/app')

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE customers ADD COLUMN is_owner BOOLEAN DEFAULT FALSE;"))
        print('Added is_owner to customers')
    except Exception as e:
        print(e)
        
    conn.commit()
    print('Done.')
