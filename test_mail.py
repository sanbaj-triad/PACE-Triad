from app.mail import send_invoice_email
import os

def test_email():
    print("Testing Email Sending...")
    
    # Fake PDF bytes
    pdf_bytes = b"%PDF-1.4 header..."
    
    to = ["sales@triadsys.com"] # Send to yourself/sales to test
    subject = "Test Invoice Email"
    body = "This is a test email."
    
    success, msg = send_invoice_email(
        to_emails=to,
        subject=subject,
        text_body=body,
        pdf_bytes=pdf_bytes,
        filename="test_invoice.pdf"
    )
    
    print(f"Success: {success}")
    print(f"Message: {msg}")

if __name__ == "__main__":
    test_email()
