import sys

try:
    with open('app/main.py', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if '@app.post("/leads/' in line or '@app.post("/projects' in line or 'def create_lead' in line:
                print(i+1, line.strip())
except Exception as e:
    print(e)
