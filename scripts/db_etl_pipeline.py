import sys
import os
import csv
import argparse
import re
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import User, Customer, Location, Lead, Project, Milestone
from app.auth import get_password_hash

def parse_date(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None

def parse_float(val):
    if not val: return None
    try:
        return float(val.strip().replace(',', '').replace('$', ''))
    except Exception:
        return None

def clean_row(row):
    return {k.strip(): v.strip() for k, v in row.items() if k and v and v.strip()}

def get_db():
    return SessionLocal()

def format_phone_number(p):
    if not p: return None
    has_plus = p.strip().startswith('+')
    digits = re.sub(r'\D', '', p)
    if not digits: return p
    
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+1 {digits[1:4]}-{digits[4:7]}-{digits[7:]}"
    else:
        return f"+{digits}" if has_plus else digits

def import_customers(file_path):
    db = get_db()
    count, skipped = 0, 0
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            if not c_row.get('name'):
                skipped += 1
                continue
            
            if c_row.get('phone'): c_row['phone'] = format_phone_number(c_row['phone'])
            
            existing = db.query(Customer).filter(Customer.name == c_row['name']).first()
            if not existing:
                db.add(Customer(**c_row))
                count += 1
            else:
                skipped += 1
    db.commit()
    db.close()
    print(f"Customers: Imported {count}, Skipped {skipped} (Duplicate/Missing Name)")


def import_locations(file_path):
    db = get_db()
    count, skipped, errors = 0, 0, 0
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            if not c_row.get('name') or not c_row.get('customer_name'):
                skipped += 1
                continue
            
            cust = db.query(Customer).filter(Customer.name == c_row['customer_name']).first()
            if not cust:
                errors += 1
                continue
                
            existing = db.query(Location).filter(Location.name == c_row['name'], Location.customer_id == cust.id).first()
            if not existing:
                db.add(Location(
                    name=c_row['name'],
                    address=c_row.get('address'),
                    customer_id=cust.id
                ))
                count += 1
            else:
                skipped += 1
    db.commit()
    db.close()
    print(f"Locations: Imported {count}, Skipped {skipped}, Lookup Errors {errors}")


def import_users(file_path):
    db = get_db()
    count, skipped, errors = 0, 0, 0
    default_hash = get_password_hash("Pace2026!")
    
    seen_usernames = set([u[0] for u in db.query(User.username).all()])
    
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            if not c_row.get('email'):
                skipped += 1; continue
                
            existing_user = db.query(User).filter(User.email == c_row['email']).first()
            if existing_user:
                skipped += 1; continue
            
            customer_id = None
            if c_row.get('customer_name'):
                cust = db.query(Customer).filter(Customer.name == c_row['customer_name']).first()
                if cust: customer_id = cust.id
                else: errors += 1; continue
            
            username = c_row.get('username') or c_row['email'].split('@')[0]
            original_username = username
            counter = 1
            while username in seen_usernames:
                username = f"{original_username}{counter}"
                counter += 1
            seen_usernames.add(username)
            
            new_user = User(
                email=c_row['email'],
                username=username,
                first_name=c_row.get('first_name', ''),
                last_name=c_row.get('last_name', ''),
                title=c_row.get('title'),
                phone=format_phone_number(c_row.get('phone')),
                customer_id=customer_id,
                is_employee=False,
                hashed_password=default_hash,
                is_active=True
            )
            db.add(new_user)
            count += 1
    db.commit()
    db.close()
    print(f"Users: Imported {count}, Skipped {skipped}, Lookup Errors {errors}")


def import_leads(file_path):
    db = get_db()
    count, errors = 0, 0
    all_users = db.query(User).all()
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            
            cust = db.query(Customer).filter(Customer.name == c_row.get('customer_name', '')).first()
            if not cust:
                errors += 1; continue
            
            poc = None
            if c_row.get('contact_name'):
                c_name = c_row['contact_name'].lower().strip()
                for u in all_users:
                    full_name = f"{u.first_name or ''} {u.last_name or ''}".lower().strip()
                    if c_name == full_name or c_name in full_name:
                        poc = u
                        break

            obj = Lead(
                name=c_row.get('name'),
                email=c_row.get('email') or (poc.email if poc else None),
                company=cust.name,
                description=c_row.get('description'),
                estimated_value=parse_float(c_row.get('estimated_value')),
                due_date=parse_date(c_row.get('due_date')),
                project_type=c_row.get('project_type'),
                customer_id=cust.id,
                customer_contact_id=poc.id if poc else None,
                status=c_row.get('status', 'New')
            )
            db.add(obj)
            count += 1
    db.commit()
    db.close()
    print(f"Leads: Imported {count}, Lookup Errors {errors}")


def auto_create_projects():
    db = get_db()
    # Fetch Leads without Projects
    existing_project_lead_ids = {p.lead_id for p in db.query(Project.lead_id).filter(Project.lead_id.isnot(None)).all()}
    all_leads = db.query(Lead).all()
    count = 0
    
    for lead in all_leads:
        if lead.id not in existing_project_lead_ids:
            proj = Project(
                name=lead.name,
                description=lead.description,
                customer_id=lead.customer_id,
                lead_id=lead.id,
                project_type=lead.project_type,
                due_date=lead.due_date,
                status="Active"
            )
            db.add(proj)
            count += 1
    db.commit()
    db.close()
    print(f"Projects: Auto-created {count} base projects from standalone Leads.")


def update_projects(file_path):
    db = get_db()
    count, errors = 0, 0
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            proj = db.query(Project).filter(Project.name == c_row.get('project_name', '')).first()
            if not proj:
                errors += 1; continue
                
            if c_row.get('start_date'): proj.start_date = parse_date(c_row['start_date'])
            if c_row.get('due_date'): proj.due_date = parse_date(c_row['due_date'])
            if c_row.get('budget'): proj.budget = parse_float(c_row['budget'])
            if c_row.get('priority'): proj.priority = c_row['priority']
            if c_row.get('invoice_type'): proj.invoice_type = c_row['invoice_type']
            if c_row.get('customer_po'): proj.customer_po = c_row['customer_po']
            count += 1
            
    db.commit()
    db.close()
    print(f"Projects: Hydrated {count} entries, Lookup Errors {errors}")


def import_milestones(file_path):
    db = get_db()
    count, errors = 0, 0
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            c_row = clean_row(row)
            
            proj = db.query(Project).filter(Project.name == c_row.get('project_name', '')).first()
            if not proj:
                errors += 1; continue
            
            obj = Milestone(
                project_id=proj.id,
                name=c_row.get('name'),
                description=c_row.get('description'),
                start_date=parse_date(c_row.get('start_date')),
                due_date=parse_date(c_row.get('due_date')),
                cost=parse_float(c_row.get('cost')),
                milestone_number=int(c_row['milestone_number']) if c_row.get('milestone_number') else None,
                milestone_po=c_row.get('milestone_po'),
                milestone_type=c_row.get('milestone_type'),
                budget_hours=parse_float(c_row.get('budget_hours')),
                is_global_bucket=c_row.get('is_global_bucket', '').lower() in ['true', '1', 'yes']
            )
            db.add(obj)
            count += 1
    db.commit()
    db.close()
    print(f"Milestones: Imported {count}, Lookup Errors {errors}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Smart Mapping ETL Tool")
    parser.add_argument('--stage', choices=['customers', 'locations', 'users', 'leads', 'auto_projects', 'update_projects', 'milestones'], required=True)
    parser.add_argument('--file', help="Path to CSV file (not required for auto_projects)")
    args = parser.parse_args()

    if args.stage == 'auto_projects':
        auto_create_projects()
    else:
        if not args.file or not os.path.exists(args.file):
            print(f"Error: Target file not found for stage {args.stage}.")
        else:
            if args.stage == 'customers': import_customers(args.file)
            elif args.stage == 'locations': import_locations(args.file)
            elif args.stage == 'users': import_users(args.file)
            elif args.stage == 'leads': import_leads(args.file)
            elif args.stage == 'update_projects': update_projects(args.file)
            elif args.stage == 'milestones': import_milestones(args.file)
