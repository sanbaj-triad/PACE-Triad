import zipfile
import os
from datetime import datetime

def create_backup():
    # Setup paths
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backups_dir = os.path.join(root_dir, 'backups')
    
    if not os.path.exists(backups_dir):
        os.makedirs(backups_dir)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f'backup_{timestamp}_Milestones.zip'
    backup_path = os.path.join(backups_dir, backup_name)
    
    print(f"Creating backup: {backup_path}...")
    
    excludes = {'.venv', 'backups', '__pycache__', '.git', '.pytest_cache', 'tests', 'node_modules'}
    
    try:
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(root_dir):
                # Filter directories
                dirs[:] = [d for d in dirs if d not in excludes]
                
                for file in files:
                    if file.endswith('.zip') or file.endswith('.db-journal'):
                        continue
                        
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, root_dir)
                    
                    # Double check we aren't backing up the backup folder itself
                    if arcname.startswith('backups') or arcname.startswith('.venv'):
                        continue
                        
                    print(f"Zipping: {arcname}")
                    zipf.write(file_path, arcname)
                    
        print(f"Backup created successfully: {backup_path}")
    except Exception as e:
        print(f"Error creating backup: {e}")

if __name__ == "__main__":
    create_backup()
