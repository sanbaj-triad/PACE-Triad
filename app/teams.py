import os
import requests
import logging

from .config import settings

logger = logging.getLogger(__name__)

def send_teams_alert(title: str, message: str, action_url: str = None, action_name: str = "View Details"):
    # Fallback Webhook URL or defined via ENV
    TEAMS_WEBHOOK_URL = getattr(settings, 'teams_webhook_url', None) or os.environ.get("TEAMS_WEBHOOK_URL", "")
    
    # Case insensitive search in OS environ
    env_keys = {k.lower(): k for k in os.environ.keys()}
    actual_key = env_keys.get("frontend_url")
    front_url_env = os.environ.get(actual_key) if actual_key else None
    
    front_url = front_url_env or getattr(settings, 'frontend_url', "https://localhost:7223")
    front_url = front_url.rstrip('/')
    
    print(f"[DEBUG TEAMS] Found matched env key: {actual_key} -> {front_url_env}")
    print(f"[DEBUG TEAMS] Final resolved front_url is: {front_url}")
    
    if not TEAMS_WEBHOOK_URL:
        # Silently skip if no config
        return

    payload = {
        "text": f"**{title}**\n\n{message}"
    }

    # If the user is using the modern Adaptive Card template exactly:
    adaptive_payload = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.2",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": title,
                            "weight": "Bolder",
                            "size": "Medium"
                        },
                        {
                            "type": "TextBlock",
                            "text": message,
                            "wrap": True
                        }
                    ],
                    "actions": []
                }
            }
        ]
    }

    if action_url:
        if action_url.startswith("/"):
            action_url = f"{front_url}{action_url}"
        
        adaptive_payload["attachments"][0]["content"]["actions"].append({
            "type": "Action.OpenUrl",
            "title": action_name,
            "url": action_url
        })
        
        # Fallback text format
        payload['text'] = payload['text'] + f"\n\n[🔗 {action_name}]({action_url})"

    try:
        print(f"Sending Teams Alert: {title} to {TEAMS_WEBHOOK_URL[:30]}...")
        # We trigger it with the Adaptive payload first!
        response = requests.post(TEAMS_WEBHOOK_URL, json=adaptive_payload, timeout=5)
        
        print(f"Teams Adaptive response: {response.status_code} - {response.text}")
        
        # If the user built a raw custom HTTP flow expecting simple text
        if response.status_code >= 400:
            print("Adaptive card rejected, trying fallback text payload...")
            resp2 = requests.post(TEAMS_WEBHOOK_URL, json=payload, timeout=5)
            print(f"Teams Fallback response: {resp2.status_code} - {resp2.text}")
            if resp2.status_code >= 400:
                logger.error(f"Teams fallback also failed. Status: {resp2.status_code}, Body: {resp2.text}")
    except Exception as e:
        print(f"Exception during Teams Webhook: {e}")
        logger.error(f"Failed to post to Teams: {e}")
