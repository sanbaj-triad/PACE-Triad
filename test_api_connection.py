
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print(f"Testing API at {BASE_URL}...")
    try:
        # 1. Login to get token (if needed, but some endpoints might be open or we can see 401)
        # Assuming we need a token, let's try to login as admin
        token = None
        try:
            auth_resp = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "password"}) # Default seed?
            # Adjust if seed uses different password ('admin'?)
            if auth_resp.status_code != 200:
                # Try 'admin' as password
                auth_resp = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "admin"})
            
            if auth_resp.status_code == 200:
                token = auth_resp.json().get("access_token")
                print("Logged in successfully.")
            else:
                print(f"Login failed: {auth_resp.status_code} {auth_resp.text}")
        except Exception as e:
            print(f"Login exception: {e}")

        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        # 2. Get Projects
        print("\n--- Projects ---")
        try:
            resp = requests.get(f"{BASE_URL}/projects/", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                print(f"Count: {len(data)}")
                for p in data:
                    print(f" - {p.get('name')} (ID: {p.get('id')})")
            else:
                print(f"Failed to get projects: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Projects exception: {e}")

        # 3. Get Milestones
        print("\n--- Milestones (All) ---")
        # Try finding an endpoint for all milestones or check per project if needed
        # Assuming we don't have a global /milestones/ endpoint easily accessible without project, 
        # let's try /projects/{id}/milestones/ if we found projects
        if resp.status_code == 200 and len(data) > 0:
            pid = data[0]['id']
            try:
                m_resp = requests.get(f"{BASE_URL}/projects/{pid}/milestones/", headers=headers)
                if m_resp.status_code == 200:
                    m_data = m_resp.json()
                    print(f"Milestones for Project {pid}: {len(m_data)}")
                else:
                    print(f"Failed to get milestones: {m_resp.status_code} {m_resp.text}")
            except Exception as e:
                print(f"Milestones exception: {e}")

    except Exception as e:
        print(f"General connection error: {e}")

if __name__ == "__main__":
    test_api()
