import urllib.request
import json

url = "http://127.0.0.1:8000/pto/requests"
data = json.dumps({
    "start_date": "2026-04-05T00:00:00Z",
    "end_date": "2026-04-06T00:00:00Z",
    "hours_requested": 8,
    "notes": "hello"
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.getcode())
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
