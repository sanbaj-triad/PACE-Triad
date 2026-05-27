import sys
import os
sys.path.append('/app')

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE locations ADD COLUMN pay_period_cycle VARCHAR(50) DEFAULT 'Bi-Weekly';"))
        print('Added pay_period_cycle to locations')
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text('ALTER TABLE locations ADD COLUMN weekly_work_hours FLOAT DEFAULT 40.0;'))
        print('Added weekly_work_hours to locations')
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN annual_pto_allowance FLOAT DEFAULT 0.0;'))
        print('Added annual_pto_allowance to users')
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN hourly_billing_rate FLOAT;'))
        print('Added hourly_billing_rate to users')
    except Exception as e:
        print(e)
        
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN internal_cost_rate FLOAT;'))
        print('Added internal_cost_rate to users')
    except Exception as e:
        print(e)
        
    conn.commit()
    print('Done.')
