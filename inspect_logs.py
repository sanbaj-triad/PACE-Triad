import traceback

try:
    with open("tmp_logs.txt", "r", encoding="utf-16le") as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if "Exception" in line or "Traceback" in line or "Error" in line:
            start = max(0, i - 10)
            end = min(len(lines), i + 30)
            print("".join(lines[start:end]))
            break
except Exception as e:
    print(e)
