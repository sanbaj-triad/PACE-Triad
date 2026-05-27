```text
backend-1  | INFO:     172.19.0.5:47706 - "GET /projects/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:54898 - "GET /projects/260009 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:54906 - "GET /projects/260009/milestones/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:57346 - "GET /invoices/?t=1774827242096 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:57360 - "GET /projects/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:49276 - "GET /projects/260009/milestones/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:57606 - "POST /invoices/generate HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:57612 - "GET /invoices/?t=1774827290787 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:44110 - "GET /invoices/260032 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:44126 - "GET /invoices/260032/items/ HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:38092 - "PUT /line-items/33 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:38094 - "PUT /line-items/34 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:38098 - "PUT /line-items/35 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:55196 - "PUT /line-items/36 HTTP/1.1" 200 OK
backend-1  | INFO:     172.19.0.5:45160 - "PUT /line-items/37 HTTP/1.1" 200 OK
backend-1  | Sync error: This Session's transaction has been rolled back due to a previous exception during flush. To begin a new transaction with this Session, first issue Session.rollback(). Original exception was: (pymysql.err.DataError) (1406, "Data too long for column 'details' at row 1")
backend-1  | [SQL: INSERT INTO xero_sync_logs (timestamp, endpoint, entity_type, entity_id, status, details) VALUES (now(), %(endpoint)s, %(entity_type)s, %(entity_id)s, %(status)s, %(details)s) RETURNING xero_sync_logs.id, xero_sync_logs.timestamp]
backend-1  | [parameters: {'endpoint': 'Push Invoice', 'entity_type': 'Invoice', 'entity_id': 260032, 'status': 'SUCCESS', 'details': '{\r\n  "Id": "23bc5e03-bdf5-4b98-bf72-dce0a4d54117",\r\n  "Status": "OK",\r\n  "ProviderName": "TSE-LPMI",\r\n  "DateTimeUTC": "\\/Date(1774827325961 ... (5025 characters truncated) ... }\r\n      ],\r\n      "SubTotal": 50000.00,\r\n      "TotalTax": 0.00,\r\n      "Total": 50000.00,\r\n      "UpdatedDateUTC": "\\/Da ... (truncated)'}]
backend-1  | (Background on this error at: https://sqlalche.me/e/20/9h9h) (Background on this error at: https://sqlalche.me/e/20/7s2a)
backend-1  | INFO:     172.19.0.5:45162 - "POST /invoices/260032/sync HTTP/1.1" 500 Internal Server Error

```