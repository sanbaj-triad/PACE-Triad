import subprocess

res = subprocess.run(['docker', 'logs', 'invoice_project_lead-backend-1'], capture_output=True, text=True)
logs = res.stdout + res.stderr

lines = logs.splitlines()
for i, line in enumerate(lines):
    if "COMPLETED" in line and ("Error" in line or "Exception" in line):
        print(line)
        for j in range(max(0, i-15), min(len(lines), i+15)):
            print(lines[j])
        break
