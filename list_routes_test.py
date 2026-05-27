import requests
import json

response = requests.get('http://localhost:8000/openapi.json')
if response.status_code == 200:
    schema = response.json()
    for path in schema.get('paths', {}).keys():
        if '/ai' in path:
            print(path)
