import sys
import os
sys.path.append('/app')

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE locations ADD COLUMN auto_pto_calculation BOOLEAN DEFAULT FALSE;"))
        print('Added auto_pto_calculation to locations')
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text('ALTER TABLE locations ADD COLUMN payroll_start_date DATE;'))
        print('Added payroll_start_date to locations')
    except Exception as e:
        print(e)
        
    conn.commit()
    print('Done.')
