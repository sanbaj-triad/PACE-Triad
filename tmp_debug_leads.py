import requests
import json

try:
    response = requests.get('http://localhost:7223/api/v1/leads/')
    data = response.json()
    print(f"Total leads: {len(data)}")
    for d in data[-5:]:  # Last 5 leads
        print(f"ID: {d.get('id')} | Name: {d.get('name')} | Status: {d.get('status')} | Created: {d.get('created_at')} | Value: {d.get('estimated_value')} | Type: {type(d.get('estimated_value'))}")
except Exception as e:
    print(e)
