import subprocess
out = subprocess.check_output(['docker', 'logs', 'invoice_project_lead-backend-1'])
print(out.decode('utf-8', errors='ignore')[-2000:])
