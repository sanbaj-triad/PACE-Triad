import csv
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Project, Milestone, Customer, User

def parse_currency(val):
    if not val:
        return 0.0
    val = str(val).replace('$', '').replace(',', '').strip()
    try:
        return float(val)
    except:
        return 0.0

def import_csv(file_path: str):
    db: Session = SessionLocal()
    try:
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            # First pass: Create Projects
            projects_data = []
            milestones_data = []
            
            for row in reader:
                is_master = row.get('Is Master', '').strip().upper()
                if is_master == 'YES':
                    projects_data.append(row)
                elif is_master == 'NO':
                    milestones_data.append(row)
                    
            print(f"Found {len(projects_data)} projects and {len(milestones_data)} milestones in CSV.")
            
            # Cache for users and customers
            user_cache = {}
            customer_cache = {}
            
            def get_user(pm_name):
                if not pm_name:
                    return None
                if pm_name in user_cache:
                    return user_cache[pm_name]
                
                # try to find by first_name + last_name
                parts = pm_name.strip().split(' ', 1)
                first = parts[0]
                last = parts[1] if len(parts) > 1 else ""
                
                # basic match
                user = db.query(User).filter(User.first_name.ilike(f"%{first}%"), User.last_name.ilike(f"%{last}%")).first()
                if not user:
                     user = db.query(User).filter(User.username.ilike(f"%{pm_name}%")).first()
                     
                user_cache[pm_name] = user
                return user
                
            def get_customer(cust_name):
                if not cust_name:
                    return None
                if cust_name in customer_cache:
                    return customer_cache[cust_name]
                
                customer = db.query(Customer).filter(Customer.name.ilike(f"%{cust_name}%")).first()
                if not customer:
                    print(f"Warning: Customer '{cust_name}' not found. Leaving customer_id=None")
                customer_cache[cust_name] = customer
                return customer

            created_projects = {}

            # Process Projects
            for row in projects_data:
                proj_num = row.get('Project Number', '').strip()
                if not proj_num:
                    proj_num = row.get('ID', '').strip()
                    
                name = row.get('Name', '').strip()
                cust_name = row.get('Customer', '').strip()
                pm_name = row.get('Project Manager', '').strip()
                po_num_full = row.get('Customer P.O.-#', '').strip()
                po_num = po_num_full[:100]
                budget = parse_currency(row.get('Budget', ''))
                invoiced = parse_currency(row.get('Invoiced To Date', ''))
                expenses = parse_currency(row.get('Expenses', ''))
                created_date_str = row.get('Created', '').strip()
                
                created_at = None
                if created_date_str:
                    try:
                        created_at = datetime.strptime(created_date_str, "%Y-%m-%d %H:%M")
                    except ValueError:
                        try:
                            created_at = datetime.strptime(created_date_str, "%m/%d/%Y %H:%M")
                        except ValueError:
                            pass
                
                customer = get_customer(cust_name)
                pm_user = get_user(pm_name)
                
                desc = f"Imported Project. Invoiced to Date: ${invoiced:.2f} | Expenses: ${expenses:.2f}"
                if len(po_num_full) > 100:
                    desc += f" | PO Notes: {po_num_full}"
                
                # Check if exists
                project = db.query(Project).filter(Project.project_unique_id == proj_num).first()
                if not project:
                    project = Project(
                        project_unique_id=proj_num,
                        name=name,
                        customer_id=customer.id if customer else None,
                        customer_po=po_num,
                        budget=budget,
                        description=desc,
                        customer_pm_id=pm_user.id if pm_user else None
                    )
                    if created_at:
                        project.created_at = created_at
                    db.add(project)
                    db.flush() # get id
                    created_projects[proj_num] = project.id
                    print(f"Created Project: {proj_num} - {name}")
                else:
                    created_projects[proj_num] = project.id
                    print(f"Project {proj_num} already exists. Skipping creation.")

            db.commit()

            # Process Milestones
            for row in milestones_data:
                proj_num = row.get('Project Number', '').strip()
                name = row.get('Name', '').strip()
                po_num_full = row.get('Customer P.O.-#', '').strip()
                po_num = po_num_full[:100]
                budget = parse_currency(row.get('Budget', ''))
                invoiced = parse_currency(row.get('Invoiced To Date', ''))
                expenses = parse_currency(row.get('Expenses', ''))
                created_date_str = row.get('Created', '').strip()
                
                created_at = None
                if created_date_str:
                    try:
                        created_at = datetime.strptime(created_date_str, "%Y-%m-%d %H:%M")
                    except ValueError:
                        try:
                            created_at = datetime.strptime(created_date_str, "%m/%d/%Y %H:%M")
                        except ValueError:
                            pass
                        
                desc = f"Imported Milestone. Invoiced to Date: ${invoiced:.2f} | Expenses: ${expenses:.2f}"
                if len(po_num_full) > 100:
                    desc += f" | PO Notes: {po_num_full}"
                
                project_id = created_projects.get(proj_num)
                if not project_id:
                    p = db.query(Project).filter(Project.project_unique_id == proj_num).first()
                    if p:
                        project_id = p.id
                    else:
                        print(f"Warning: Project {proj_num} not found for milestone '{name}'. Skipping.")
                        continue
                
                ms = db.query(Milestone).filter(Milestone.project_id == project_id, Milestone.name == name).first()
                if not ms:
                    ms = Milestone(
                        project_id=project_id,
                        name=name,
                        cost=budget,
                        milestone_po=po_num,
                        description=desc
                    )
                    if created_at:
                        ms.created_at = created_at
                    db.add(ms)
                    print(f"Created Milestone '{name}' for project {proj_num}.")
                else:
                    print(f"Milestone '{name}' for project {proj_num} already exists.")
                    
            db.commit()
            print("Import completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_projects_csv.py <path_to_csv>")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    import_csv(csv_file)
