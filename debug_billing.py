
import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app import models

def debug_project_billing(project_id):
    print(f"--- Debugging Project {project_id} Billing ---")
    db = SessionLocal()
    try:
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            print("Project not found")
            return

        print(f"Project: {project.name}")
        print(f"Budget: {project.budget}")
        print(f"Total Billed (Property): {project.total_billed}")
        print(f"Financial Progress: {project.financial_progress}%")
        
        print("\n--- Milestones ---")
        param_total = 0
        for m in project.milestones:
            print(f"Milestone #{m.milestone_number} (ID: {m.id}, Cost: {m.cost})")
            print(f"  - Total Billed (Property): {m.total_billed}")
            print(f"  - Remaining: {m.remaining_amount}")
            
            # Inspect Line Items directly
            print("  - Line Items:")
            li_sum = 0
            for li in m.line_items:
                print(f"    - Invoice {li.invoice_id}: ${li.amount}")
                li_sum += (li.amount or 0)
            print(f"    -> Sum of Line Items: {li_sum}")
            
            param_total += m.total_billed
            
        print(f"\nCalculated Sum of Milestones.total_billed: {param_total}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_project_billing(2) # User mentioned PROJ-0002. Assuming ID 2 based on previous context.
