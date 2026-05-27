import subprocess
import re

res = subprocess.run(['docker', 'logs', 'invoice_project_lead-backend-1'], capture_output=True, text=True)
logs = res.stdout + res.stderr

# We want to find the last traceback in the logs
occurrences = [m.start() for m in re.finditer(r"Traceback \(most recent call last\):", logs)]
if occurrences:
    last_idx = occurrences[-1]
    print(logs[last_idx:])
else:
    print("No traceback found.")
