import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_login():
    print("Testing Login...")
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data={"username": "admin", "password": "password123"} # Assuming default password reset or known
        )
        
        # Note: If password failed, try the seed password "admin"
        if response.status_code == 401:
             print("Retrying with default password 'admin'...")
             response = requests.post(
                f"{BASE_URL}/token",
                data={"username": "admin", "password": "admin"}
            )

        if response.status_code == 200:
            data = response.json()
            print("Login Successful!")
            user = data.get("user")
            last_login = user.get("last_login")
            print(f"User Last Login: {last_login}")
            if last_login:
                print("Last login field is present and populated.")
            else:
                print("WARNING: last_login is empty in response.")
        else:
            print(f"Login Failed with status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
