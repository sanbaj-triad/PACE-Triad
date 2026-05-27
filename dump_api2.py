import json, urllib.request

try:
    with urllib.request.urlopen("http://localhost:8000/leads/") as response:
        payload = response.read().decode()
        data = json.loads(payload)
        with open("last_lead.json", "w") as f:
            json.dump(data[-1], f, indent=2)
        print("Keys:", list(data[0].keys()))
except Exception as e:
    import traceback
    traceback.print_exc()
