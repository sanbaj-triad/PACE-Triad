import os
# Force dotenv loading in the script
from dotenv import load_dotenv
load_dotenv('.env')

from app.graph_service import push_event_to_o365

def test():
    print("Testing O365 Calendar Integration...")
    print(f"Azure Tenant: {os.environ.get('AZURE_TENANT_ID')}")
    print(f"Target Email: {os.environ.get('O365_TARGET_CALENDAR_EMAIL')}")
    
    from app.graph_service import get_access_token, get_target_calendar_id
    import httpx
    
    token = get_access_token()
    with httpx.Client() as client:
        cal_id = get_target_calendar_id(token, client)
        print(f"Discovered Target Calendar ID: {cal_id}")
    
    o365_id = push_event_to_o365(
        subject="PACE API TEST",
        start_dt="2024-06-15T10:00:00",
        end_dt="2024-06-15T11:00:00",
        content="This is a test event from PACE local debugging script."
    )
    
    print(f"Resulting O365 Event ID: {o365_id}")

if __name__ == '__main__':
    test()
