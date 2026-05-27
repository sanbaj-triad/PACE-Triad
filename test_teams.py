import os
import sys

# temporarily append app dir to use teams.py
sys.path.append('c:\\Apps\\python\\Invoice_Project_Lead')

from app.teams import send_teams_alert

if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv('c:\\Apps\\python\\Invoice_Project_Lead\\.env')
    print("Testing teams alert with URL:", os.environ.get("TEAMS_WEBHOOK_URL", "")[:30])
    send_teams_alert("Test Alert", "This is a test from the backend.", "/portal/dashboard", "Open Dashboard")

