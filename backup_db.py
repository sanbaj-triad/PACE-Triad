import sys
import os
import json
import datetime
from sqlalchemy.orm import class_mapper

sys.path.append(os.getcwd())

from app import database, models

def to_dict(obj):
    columns = [c.key for c in class_mapper(obj.__class__).columns]
    data = {}
    for c in columns:
        val = getattr(obj, c)
        if isinstance(val, (datetime.date, datetime.datetime)):
            val = val.isoformat()
        data[c] = val
    return data

def backup():
    db = database.SessionLocal()
    backup_data = {}
    
    try:
        models_list = [
            ('users', models.User),
            ('customers', models.Customer),
            ('projects', models.Project),
            ('locations', models.Location),
            ('invoices', models.Invoice),
            ('milestones', models.Milestone),
            ('leads', models.Lead),
            ('line_items', models.LineItem),
            ('project_attachments', models.ProjectAttachment)
        ]
        
        for name, model in models_list:
            print(f"Backing up {name}...")
            items = db.query(model).all()
            backup_data[name] = [to_dict(item) for item in items]
            
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        # Ensure backup dir exists (created in previous step, but rigorous)
        backup_dir = r"c:\Apps\python\Invoice_Project_Lead_Backups\Backup_20260117_2300"
        os.makedirs(backup_dir, exist_ok=True)
        
        filepath = os.path.join(backup_dir, "db_dump.json")
        with open(filepath, "w") as f:
            json.dump(backup_data, f, indent=2)
            
        print(f"Database backup saved to {filepath}")
        
    except Exception as e:
        print(f"Backup failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    backup()
