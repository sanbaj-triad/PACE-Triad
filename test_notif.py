import sys
import os
import requests
import time

def test():
    # 1. Login to get token
    res = requests.post("http://localhost:8000/token", data={
        "username": "admin",
        "password": "password" # Assume standard password, or I'll just hit the DB directly
    })
    
    print(f"Login response: {res.status_code}")

if __name__ == "__main__":
    test()
