import sys
import os
from datetime import datetime

# Provide access to the app module
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.database import SessionLocal
from app.models import User, Location, PTOBank, PTOAuditLog

def calculate_accrual(annual_allowance, cycle):
    if not annual_allowance or annual_allowance <= 0:
        return 0.0
    periods = 26
    if cycle == 'Weekly': periods = 52
    elif cycle == 'Semi-Monthly': periods = 24
    elif cycle == 'Monthly': periods = 12
    # Round to 2 decimals
    return round(annual_allowance / periods, 2)

def main():
    db = SessionLocal()
    year = datetime.utcnow().year
    
    # 1. Fetch all users
    users = db.query(User).filter(User.annual_pto_allowance > 0).all()
    print(f"Found {len(users)} users with annual PTO allowance > 0.")
    
    for u in users:
        print(f"Processing user: {u.username}")
        # Fetch their location for pay cycle rules
        loc = db.query(Location).filter(Location.id == u.location_id).first()
        if not loc:
            print(f"  -> User location does not exist. Skipping.")
            continue
            
        if not loc.auto_pto_calculation:
            print(f"  -> User location has auto PTO disabled. Proceeding anyway for the sake of the forced manual trigger!")
            
        accrual_amount = calculate_accrual(u.annual_pto_allowance, loc.pay_period_cycle)
        print(f"  -> Cycle: {loc.pay_period_cycle}, Accrual Amount: {accrual_amount} hrs")
        
        # Add to bank
        bank = db.query(PTOBank).filter(PTOBank.user_id == u.id, PTOBank.year == year).first()
        if not bank:
            bank = PTOBank(user_id=u.id, year=year, allowance_hours=0.0)
            db.add(bank)
            db.commit()
            db.refresh(bank)
            
        old_allowance = bank.allowance_hours
        new_allowance = old_allowance + accrual_amount
        
        bank.allowance_hours = new_allowance
        db.add(bank)
        
        # Log it
        audit_log = PTOAuditLog(
            user_id=u.id,
            transaction_type="Auto-Accrual",
            amount_hours=accrual_amount,
            balance_after=new_allowance,
            notes=f"CRON Auto-Accrual for {loc.pay_period_cycle} pay period (Forced simulation)."
        )
        db.add(audit_log)
        db.commit()
        print(f"  -> Accrual applied and audited! Old: {old_allowance}, New: {new_allowance}")
        
    db.close()
    print("CRON Job simulation finished!")

if __name__ == "__main__":
    main()
