import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app import models, crud, schemas
from datetime import datetime, timedelta, date

def advance_date(current_date, freq):
    if not current_date:
        return None
    freq = freq.upper() if freq else ""
    if freq == 'MONTHLY':
        return current_date + timedelta(days=30)
    elif freq == 'QUARTERLY':
        return current_date + timedelta(days=90)
    elif freq == 'SEMI_ANNUAL':
        return current_date + timedelta(days=180)
    elif freq == 'ANNUAL':
        return current_date + timedelta(days=365)
    return None

def run_recurring_invoices():
    db = SessionLocal()
    try:
        today = date.today()
        system_user = db.query(models.User).filter(models.User.role == "admin").first()
        
        # 1. PROJECT LEVEL SCHEDULES
        projs = db.query(models.Project).filter(
            models.Project.use_project_billing_schedule == True,
            models.Project.next_invoice_date != None,
            models.Project.next_invoice_date <= today,
            models.Project.recurring_invoice_frequency != None,
            models.Project.recurring_invoice_frequency != ""
        ).all()
        
        print(f"[{datetime.now()}] Found {len(projs)} PROJECTS awaiting recurring billing.")
        
        for p in projs:
            print(f"--- Generating bulk invoice for Project {p.id} ({p.name}) ---")
            items = []
            for m in p.milestones:
                if not m.is_completed:
                    pct = p.recurring_invoice_percentage or 100.0
                    items.append(schemas.MilestoneBillItem(milestone_id=m.id, percentage=pct))
                    
            if not items:
                print("  > No incomplete milestones to bill.")
                continue
                
            gen_data = schemas.InvoiceGenerate(
                project_id=p.id,
                items=items,
                issue_date=datetime.now(),
                due_date=datetime.now() + timedelta(days=30)
            )
            
            try:
                new_inv = crud.generate_invoice_from_milestones(db=db, data=gen_data, current_user=system_user)
                print(f" => Successfully Created Invoice: {new_inv.invoice_number}")
                
                # Advance project date
                p.next_invoice_date = advance_date(p.next_invoice_date, p.recurring_invoice_frequency)
                print(f" => Advanced Project {p.id} next invoice to {p.next_invoice_date}")
                
                db.commit()
            except Exception as e:
                import traceback
                print(f"Failed to generate invoice for project {p.id}: {e}\n{traceback.format_exc()}")
                db.rollback()


        # 2. MILESTONE LEVEL SCHEDULES
        milestones = db.query(models.Milestone).join(models.Project).filter(
            models.Project.use_project_billing_schedule == False,
            models.Milestone.next_invoice_date != None,
            models.Milestone.next_invoice_date <= today,
            models.Milestone.recurring_invoice_frequency != None,
            models.Milestone.recurring_invoice_frequency != "",
            models.Milestone.is_completed == False
        ).all()
        
        print(f"[{datetime.now()}] Found {len(milestones)} MILESTONES awaiting recurring billing.")
        
        project_map = {}
        for m in milestones:
            if m.project_id not in project_map:
                project_map[m.project_id] = []
            project_map[m.project_id].append(m)
            
        for project_id, ms in project_map.items():
            print(f"--- Generating bulk invoice for Project {project_id} (Milestone subset) ---")
            
            items = []
            for m in ms:
                pct = m.recurring_invoice_percentage or 100.0
                print(f"  > Line Item: Milestone #{m.milestone_number} ({m.name}) at {pct}%")
                items.append(schemas.MilestoneBillItem(milestone_id=m.id, percentage=pct))
                
            gen_data = schemas.InvoiceGenerate(
                project_id=project_id,
                items=items,
                issue_date=datetime.now(),
                due_date=datetime.now() + timedelta(days=30)
            )
            
            try:
                new_inv = crud.generate_invoice_from_milestones(db=db, data=gen_data, current_user=system_user)
                print(f" => Successfully Created Invoice: {new_inv.invoice_number}")
                
                # Advance dates
                for m in ms:
                    m.next_invoice_date = advance_date(m.next_invoice_date, m.recurring_invoice_frequency)
                    print(f" => Advanced Milestone {m.id} next invoice to {m.next_invoice_date}")
                    
                db.commit()
            except Exception as e:
                import traceback
                print(f"Failed to generate invoice for project {project_id} milestones: {e}\n{traceback.format_exc()}")
                db.rollback()

    except Exception as e:
        print("Fatal Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    run_recurring_invoices()
