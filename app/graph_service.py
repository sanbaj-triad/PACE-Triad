import os
import httpx
from msal import ConfidentialClientApplication
from app.config import settings

def get_msal_app():
    if not settings.azure_client_id or not settings.azure_tenant_id or not settings.azure_client_secret:
        return None
    
    authority = f"https://login.microsoftonline.com/{settings.azure_tenant_id}"
    app = ConfidentialClientApplication(
        settings.azure_client_id,
        authority=authority,
        client_credential=settings.azure_client_secret
    )
    return app

def get_access_token():
    app = get_msal_app()
    if not app:
        return None
        
    result = app.acquire_token_silent(["https://graph.microsoft.com/.default"], account=None)
    if not result:
        result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        
    if "access_token" in result:
        return result["access_token"]
    else:
        print("[O365 ERROR] Failed to acquire token:", result.get("error"), result.get("error_description"))
        return None

# The target calendar email.
TARGET_CALENDAR_EMAIL = settings.o365_target_calendar_email
TARGET_CALENDAR_NAME = settings.o365_target_calendar_name.strip('"')

def get_target_calendar_id(token: str, client: httpx.Client) -> str:
    """
    Finds the specific calendar ID for a secondary calendar, if specified.
    Returns None if trying to use the default calendar.
    """
    if not TARGET_CALENDAR_NAME:
        return None # Uses default root calendar
        
    url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/calendars"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        for cal in data.get("value", []):
            if TARGET_CALENDAR_NAME.lower() in cal.get("name", "").lower():
                return cal.get("id")
    
    print(f"[O365 WARNING] Could not find secondary calendar containing name '{TARGET_CALENDAR_NAME}'. Defaulting to primary calendar.")
    return None

def push_event_to_o365(subject: str, start_dt: str, end_dt: str, content: str = "", existing_event_id: str = None) -> str:
    """
    Pushes an event to the target O365 Master Calendar.
    Returns the new o365_event_id on success, or None on failure.
    If existing_event_id is provided, it PATCHes the existing event.
    """
    token = get_access_token()
    if not token:
        print("[O365] Skipping push - credentials not configured.")
        return None
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "subject": subject,
        "body": {
            "contentType": "HTML",
            "content": content
        },
        "start": {
            "dateTime": start_dt, # Format: "2024-05-15T08:00:00"
            "timeZone": "America/New_York"
        },
        "end": {
            "dateTime": end_dt, # Format: "2024-05-15T17:00:00"
            "timeZone": "America/New_York"
        }
    }
    
    try:
        with httpx.Client() as client:
            cal_id = get_target_calendar_id(token, client)
            if cal_id:
                base_url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/calendars/{cal_id}/events"
            else:
                base_url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/events"
                
            if existing_event_id:
                # Update existing
                url = f"{base_url}/{existing_event_id}"
                response = client.patch(url, headers=headers, json=payload, timeout=10.0)
                
                if response.status_code == 200:
                    return existing_event_id
                elif response.status_code == 404:
                    print(f"[O365] Event {existing_event_id} not found to patch, creating new instead.")
                    # Continue down to POST instead
                else:
                    print(f"[O365 ERROR] Failed to patch event: {response.text}")
                    return None
            
            # Create new
            response = client.post(base_url, headers=headers, json=payload, timeout=10.0)
            if response.status_code == 201:
                return response.json().get("id")
            else:
                print(f"[O365 ERROR] Failed to create event: {response.text}")
                return None
    except Exception as e:
        print(f"[O365 EXCEPTION] {str(e)}")
        return None

def delete_event_from_o365(event_id: str):
    token = get_access_token()
    if not token or not event_id:
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/events/{event_id}"
    
    try:
        with httpx.Client() as client:
            response = client.delete(url, headers=headers, timeout=10.0)
            if response.status_code != 204:
                print(f"[O365 ERROR] Failed to delete event: {response.text}")
    except Exception as e:
        print(f"[O365 EXCEPTION] Delete failed: {str(e)}")

def pull_events_from_o365():
    """
    Retrieves events from the master calendar that were modified recently.
    """
    token = get_access_token()
    if not token:
        return []
        
    headers = {"Authorization": f"Bearer {token}"}
    try:
        with httpx.Client() as client:
            cal_id = get_target_calendar_id(token, client)
            if cal_id:
                base_url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/calendars/{cal_id}/events"
            else:
                base_url = f"https://graph.microsoft.com/v1.0/users/{TARGET_CALENDAR_EMAIL}/events"
            
            from datetime import datetime, timedelta
            now = datetime.utcnow() - timedelta(days=30)
            now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            url = f"{base_url}?$filter=lastModifiedDateTime ge {now_str}&$select=id,subject,start,end,lastModifiedDateTime"
            
            response = client.get(url, headers=headers, timeout=10.0)
            if response.status_code == 200:
                return response.json().get("value", [])
            else:
                print(f"[O365 ERROR] Failed to pull events: {response.text}")
                return []
    except Exception as e:
        print(f"[O365 EXCEPTION] Pull failed: {str(e)}")
        return []
