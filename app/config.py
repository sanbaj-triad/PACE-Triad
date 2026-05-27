from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    xero_client_id: str
    xero_client_secret: str
    xero_redirect_uri: str | None = None
    xero_tenant_id: str | None = None
    xero_webhook_key: str | None = None
    mailgun_api_key: str | None = None
    mailgun_domain: str | None = None
    mailgun_sender: str | None = None
    teams_webhook_url: str | None = None
    frontend_url: str = "https://localhost:7223"
    gcs_attachment_bucket: str = "pace-app-attachments"
    
    # MS Graph O365 Settings
    azure_tenant_id: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: str | None = None
    o365_target_calendar_email: str = "admin@yourcompany.com"
    o365_target_calendar_name: str = "Triad"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
