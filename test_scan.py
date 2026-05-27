import requests

url = 'http://localhost:8000/ai/scan-receipt'
payload = {'image_base64': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='}

try:
    response = requests.post(url, json=payload)
    print(f'Status Code: {response.status_code}')
    print(f'Response: {response.text}')
except Exception as e:
    print(f'Exception: {e}')
