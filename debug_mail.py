import requests
import os

API_KEY_RAW = "2cc48b29-7bcffc1e"
DOMAIN = "notify.tseot.net"
TO = "sales@triadsys.com"
SENDER = f"test@{DOMAIN}"

def try_send(name, url, key):
    print(f"--- Testing {name} ---")
    print(f"URL: {url}")
    print(f"Key: {key}")
    
    try:
        response = requests.post(
            f"{url}/{DOMAIN}/messages",
            auth=("api", key),
            data={"from": SENDER, "to": TO, "subject": "Test", "text": "Test"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("\n")

if __name__ == "__main__":
    urls = [
        "https://api.mailgun.net/v3",
        "https://api.eu.mailgun.net/v3"
    ]
    keys = [
        API_KEY_RAW,
        f"key-{API_KEY_RAW}"
    ]

    for url in urls:
        for key in keys:
             label = f"Region: {'EU' if 'eu' in url else 'US'} | Key Prefix: {'Yes' if 'key-' in key else 'No'}"
             try_send(label, url, key)
