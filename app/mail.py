import os
import requests
from datetime import datetime
from app.config import settings

MAILGUN_API_KEY = settings.mailgun_api_key
MAILGUN_DOMAIN = settings.mailgun_domain
MAILGUN_SENDER = settings.mailgun_sender or (f"invoices@{MAILGUN_DOMAIN}" if MAILGUN_DOMAIN else "invoices@localhost")

LOG_FILE = "backups/invoices_email_log.txt"

def log_email(message):
    try:
        os.makedirs("backups", exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {message}\n")
    except Exception as e:
        print(f"Failed to log email: {e}")

def send_invoice_email(to_emails, subject, text_body, pdf_bytes, filename, cc_emails=None, sender_name="Invoice System"):
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        log_email("Error: Mailgun configuration missing.")
        return False, "Mailgun configuration missing"

    url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
    auth = ("api", MAILGUN_API_KEY)
    
    # Construct Sender
    from_addr = f"{sender_name} <{MAILGUN_SENDER}>"

    # Join list to string if needed
    cc_value = ""
    if cc_emails:
        if isinstance(cc_emails, list):
            cc_value = ", ".join(cc_emails)
        else:
            cc_value = cc_emails

    # Prepare Data
    data = {
        "from": from_addr,
        "to": to_emails,
        "subject": subject,
        "text": text_body
    }
    
    if cc_value:
        data["cc"] = cc_value

    # Save to a temporary file to strictly match user's "open file" pattern
    # This avoids any ambiguity with BytesIO or in-memory streams
    import tempfile
    
    # Create a temp file path but don't keep the file open yet
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, filename)
    
    try:
        with open(temp_path, "wb") as f:
            f.write(pdf_bytes)
            
        with open(temp_path, "rb") as f:
            # Explicitly set Mime Type to ensure client treats it as PDF
            # Explicitly set Mime Type to ensure client treats it as PDF
            files = [
                ("attachment", (filename, f, "application/pdf"))
            ]
            response = requests.post(url, auth=auth, data=data, files=files)
            
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        if response.status_code == 200:
            log_email(f"Sent Email '{filename}' to {to_emails} (CC: {cc_emails}) | Subject: {subject}")
            return True, "Email sent successfully"
        else:
            error_msg = f"Failed to send email. Status: {response.status_code}, Response: {response.text}"
            log_email(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"Exception sending email: {str(e)}"
        log_email(error_msg)
        return False, error_msg

def send_system_email(to_emails, subject, text_body, sender_name="PACE System"):
    """
    Sends a generic system email without any PDF attachments.
    """
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        log_email("Error: Mailgun configuration missing.")
        return False, "Mailgun configuration missing"

    url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
    auth = ("api", MAILGUN_API_KEY)
    
    from_addr = f"{sender_name} <{MAILGUN_SENDER}>"

    data = {
        "from": from_addr,
        "to": to_emails,
        "subject": subject,
        "text": text_body
    }
    
    try:
        response = requests.post(url, auth=auth, data=data)
            
        if response.status_code == 200:
            log_email(f"Sent System Email to {to_emails} | Subject: {subject}")
            return True, "Email sent successfully"
        else:
            error_msg = f"Failed to send system email. Status: {response.status_code}, Response: {response.text}"
            log_email(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"Exception sending system email: {str(e)}"
        log_email(error_msg)
        return False, error_msg

