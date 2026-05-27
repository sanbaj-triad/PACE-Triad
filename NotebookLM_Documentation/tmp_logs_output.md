# Backend
```
﻿backend-1  | INFO:     Started server process [1]
backend-1  | INFO:     Waiting for application startup.
backend-1  | INFO:     Application startup complete.
backend-1  | INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
backend-1  | INFO:     172.19.0.5:56374 - "WebSocket /ws/notifications/28" [accepted]
backend-1  | /app/app/main.py:1770: SAWarning: relationship 'Project.created_by_user' will copy column users.id to column projects.created_by_id, which conflicts with relationship(s): 'User.projects_created' (copies users.id to projects.created_by_id). If this is not the intention, consider if these relationships should be linked with back_populates, or if viewonly=True should be applied to one or more if they are read-only. For the less common case that foreign key constraints are partially overlapping, the orm.foreign() annotation can be used to isolate the columns that should be written towards.   To silence this warning, add the parameter 'overlaps="projects_created"' to the 'Project.created_by_user' relationship. (Background on this warning at: https://sqlalche.me/e/20/qzyx) (This warning originated from the `configure_mappers()` process, which was invoked automatically in response to a user-initiated operation.)
backend-1  |   user = db.query(models.User).filter(models.User.id == user_id).first()
backend-1  | INFO:     connection open
backend-1  | INFO:     172.19.0.5:56378 - "WebSocket /ws/notifications/4" [accepted]
backend-1  | INFO:     connection open
backend-1  | INFO:     connection closed
backend-1  | INFO:     172.19.0.5:55586 - "WebSocket /ws/notifications/4" [accepted]
backend-1  | INFO:     connection open
backend-1  | APScheduler Background Process Initialized: Deadlines checked strictly at 08:00 AM
backend-1  | INFO:     172.19.0.5:55566 - "GET /notifications/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55564 - "GET /users/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55578 - "GET /invoices/260032 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55602 - "GET /invoices/260032/items/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55616 - "POST /invoices/260032/sync HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55632 - "GET /invoices/260032 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55638 - "GET /invoices/260032/items/ HTTP/1.1" 200 OK
backend-1  | Error fetching bank accounts from Xero: 401 Client Error: Unauthorized for url: https://api.xero.com/api.xro/2.0/Accounts?Where=Type==%22BANK%22
backend-1  | INFO:     172.19.0.5:46778 - "GET /xero/api/bank-accounts HTTP/1.1" 200 OK
backend-1  | Xero Payment Push Error: {
backend-1  |   "ErrorNumber": 10,
backend-1  |   "Type": "ValidationException",
backend-1  |   "Message": "A validation exception occurred",
backend-1  |   "Elements": [
backend-1  |     {
backend-1  |       "Date": "\/Date(1774742400000+0000)\/",
backend-1  |       "Amount": 50000.00,
backend-1  |       "Reference": "Parital 50% Payment received via direct deposit. ",
backend-1  |       "HasAccount": true,
backend-1  |       "Account": {
backend-1  |         "AccountID": "00000000-0000-0000-0000-000000000000",
backend-1  |         "Code": "100",
backend-1  |         "ValidationErrors": []
backend-1  |       },
backend-1  |       "Invoice": {
backend-1  |         "InvoiceID": "6e126bf1-a011-4110-866c-9b1866a9f906",
backend-1  |         "Payments": [],
backend-1  |         "CreditNotes": [],
backend-1  |         "Prepayments": [],
backend-1  |         "Overpayments": [],
backend-1  |         "IsDiscounted": false,
backend-1  |         "InvoiceAddresses": [],
backend-1  |         "HasErrors": false,
backend-1  |         "InvoicePaymentServices": [],
backend-1  |         "LineItems": [],
backend-1  |         "ValidationErrors": []
backend-1  |       },
backend-1  |       "HasValidationErrors": true,
backend-1  |       "ValidationErrors": [
backend-1  |         {
backend-1  |           "Message": "Account could not be found"
backend-1  |         }
backend-1  |       ]
backend-1  |     }
backend-1  |   ]
backend-1  | }
backend-1  | Error pushing payment to Xero: 400 Client Error: Bad Request for url: https://api.xero.com/api.xro/2.0/Payments
backend-1  | INFO:     172.19.0.5:36332 - "POST /invoices/260032/payments HTTP/1.1" 500 Internal Server Error

```