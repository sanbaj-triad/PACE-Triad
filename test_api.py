import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint):
    print(f"Testing {endpoint}...")
    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Retrieved {len(data)} items.")
            # print(json.dumps(data[0], indent=2)) # Print first item to check structure
        else:
            print(f"Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error accessing {endpoint}: {e}")

if __name__ == "__main__":
    test_endpoint("/projects/")
    test_endpoint("/milestones/")
    test_endpoint("/invoices/")
    test_endpoint("/leads/")
    test_endpoint("/users/")
