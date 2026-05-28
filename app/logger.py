import os
import logging
from logging.handlers import RotatingFileHandler
import contextvars
import re

# Context variable to store request ID
request_id_var = contextvars.ContextVar("request_id", default="-")

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get()
        return True

def mask_email(email: str) -> str:
    if not email or "@" not in email:
        return email
    parts = email.split("@")
    local = parts[0]
    domain = parts[1]
    if len(local) <= 3:
        masked_local = local + "***"
    else:
        masked_local = local[:3] + "***"
    return f"{masked_local}@{domain}"

def mask_sensitive(key: str, value) -> str:
    if not isinstance(value, str):
        return value
    key_lower = key.lower()
    if any(k in key_lower for k in ["password", "secret", "card", "ssn"]):
        return "[MASKED]"
    if any(k in key_lower for k in ["token", "jwt"]):
        return value[:8] + "..." if len(value) > 8 else value
    if "email" in key_lower:
        return mask_email(value)
    return value

def get_logger(name: str):
    logger = logging.getLogger(name)
    if logger.hasHandlers():
        return logger
        
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    
    # [TIMESTAMP] [LEVEL] [MODULE] [REQUEST_ID] MESSAGE
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s] [%(request_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    req_filter = RequestIdFilter()
    
    # Console handler (INFO and above)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(req_filter)
    logger.addHandler(console_handler)
    
    # Rotating file handler (logs/pace_app.log)
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    file_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, "pace_app.log"),
        maxBytes=10 * 1024 * 1024, # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG) # File captures debug logs
    file_handler.setFormatter(formatter)
    file_handler.addFilter(req_filter)
    logger.addHandler(file_handler)
    
    return logger
