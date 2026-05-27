import shutil
import os
import sys
import datetime
import glob

DB_FILE = "sql_app.db"
BACKUP_DIR = "backups"

def backup():
    if not os.path.exists(DB_FILE):
        print(f"Database file {DB_FILE} not found.")
        return

    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(BACKUP_DIR, f"sql_app_{timestamp}.db")
    
    try:
        shutil.copy2(DB_FILE, backup_file)
        print(f"Backup created successfully: {backup_file}")
    except Exception as e:
        print(f"Backup failed: {e}")

def restore(timestamp=None):
    if not os.path.exists(BACKUP_DIR):
        print("No backups folder found.")
        return

    if timestamp:
        backup_file = os.path.join(BACKUP_DIR, f"sql_app_{timestamp}.db")
    else:
        # Get latest
        list_of_files = glob.glob(os.path.join(BACKUP_DIR, '*.db')) 
        if not list_of_files:
            print("No backup files found.")
            return
        backup_file = max(list_of_files, key=os.path.getctime)

    if not os.path.exists(backup_file):
        print(f"Backup file {backup_file} not found.")
        return

    try:
        shutil.copy2(backup_file, DB_FILE)
        print(f"Database restored from: {backup_file}")
    except Exception as e:
        print(f"Restore failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python manage_db.py [backup|restore]")
    else:
        command = sys.argv[1]
        if command == "backup":
            backup()
        elif command == "restore":
            timestamp = sys.argv[2] if len(sys.argv) > 2 else None
            restore(timestamp)
        else:
            print("Unknown command. Use 'backup' or 'restore'.")
