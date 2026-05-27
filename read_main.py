
path = r"c:\Apps\python\Invoice_Project_Lead\app\main.py"
print(f"Reading {path}...")
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    for i, line in enumerate(lines[-100:]): # Last 100 lines
        print(f"{len(lines)-100+i+1}: {line.rstrip()}")
