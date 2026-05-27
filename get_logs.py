import subprocess
try:
    output = subprocess.check_output(['docker', 'logs', '--tail', '100', 'invoice_project_lead_backend_1'], stderr=subprocess.STDOUT).decode('utf-8')
    with open('logs.txt', 'w') as f:
        f.write(output)
except Exception as e:
    print(f"Error: {e}")
