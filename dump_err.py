import json

with open('tmp_logs_2.txt', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

lines = text.splitlines()
found = False
for i, line in enumerate(lines):
    if "Failed to record synced bank payment to Xero" in line or "400 Client Error" in line or "Xero" in line:
        if "400 Client Error" in line:
            print("ERROR LINE:", line)
            print("CONTEXT:")
            for j in range(max(0, i-15), min(len(lines), i+15)):
                print(lines[j])
            found = True
            break
if not found:
    print("No 400 Client Error found in logs.")
