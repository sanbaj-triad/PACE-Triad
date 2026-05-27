import json, urllib.request

try:
    with urllib.request.urlopen("http://localhost:8000/leads/") as response:
        payload = response.read().decode()
        data = json.loads(payload)
        print("Success, leads =", len(data))
        if data:
            print("Keys of first lead:", list(data[0].keys()))
            print("Last lead:", json.dumps(data[-1], indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
