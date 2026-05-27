import requests
import json

def check_projects():
    base_url = "http://127.0.0.1:8000"
    login_url = f"{base_url}/token"
    projects_url = f"{base_url}/projects/"
    
    try:
        # Login
        resp = requests.post(login_url, data={"username": "admin", "password": "admin"})
        if resp.status_code != 200:
            print(f"Login Failed: {resp.status_code} {resp.text}")
            return
        
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get Projects
        print("Fetching Projects...")
        resp = requests.get(projects_url, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Got {len(data)} projects.")
            if len(data) > 0:
                print("First Project Sample:", json.dumps(data[0], indent=2))
        else:
            print("Error Response:", resp.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_projects()
