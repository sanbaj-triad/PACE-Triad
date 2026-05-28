# PACE Application Logging Infrastructure

This document provides a comprehensive overview of the production-grade, centralized logging system implemented for the PACE codebase (both backend and frontend).

---

## 1. Backend Logging Architecture

The backend logging infrastructure is built on top of Python's standard `logging` library. All configurations are centralized in [app/logger.py](file:///app/logger.py).

### Formatting
Backend logs follow this standard format:
`[TIMESTAMP] [LEVEL] [MODULE] [REQUEST_ID] MESSAGE`

* **Timestamp**: ISO format (`YYYY-MM-DD HH:MM:SS`).
* **Request ID**: Generated automatically for every incoming HTTP request by FastAPI middleware. It propagates down call stacks via `contextvars` (`request_id_var`), ensuring that log statements triggered by a single request can be correlated together across database and external service queries.

### Handlers
Logs are directed to two destinations:
1. **Console Handler**: Captures `INFO` and above for development stdout.
2. **Rotating File Handler**: Captures all levels (`DEBUG` and above) and writes to `logs/pace_app.log`.
   * **Rotation Rules**: Maximum file size is `10MB`. The logger maintains the last `5` rotated log files (`pace_app.log.1` to `pace_app.log.5`).
   * **Source Control Exclusion**: The `logs/` directory is added to `.gitignore`.

### Sensitive Data Masking & Truncation
To prevent PII and security credential leakage into log files:
* **Emails**: Automatically obfuscated so only the first 3 characters of the local part remain visible (e.g. `adm***@company.com`).
* **Credentials/Secrets**: Key-matched fields containing `password`, `secret`, `card`, or `ssn` are fully redacted as `[MASKED]`.
* **Tokens**: JWTs and Bearer tokens are truncated to their first `8` characters (e.g. `eyJhbGci...`).

---

## 2. Backend Log Integrations

We integrated logging into all critical paths of [app/main.py](file:///app/main.py), [app/crud.py](file:///app/crud.py), [app/dependencies.py](file:///app/dependencies.py), [app/mail.py](file:///app/mail.py), [app/xero.py](file:///app/xero.py), and [app/scheduler.py](file:///app/scheduler.py):

* **HTTP Middleware**: Every HTTP request is captured, logging the HTTP method, resource path, active user ID, status code, and duration in milliseconds.
* **Authentication**: Logs client IP addresses, username attempts (masked), and outcomes for standard login, Microsoft O365 SSO callbacks, and Mobile SSO exchanges.
* **WebSocket Presence**: Logs client connections, disconnect close codes, and authentication/policy rejections (WebSocket status `1008`).
* **External Storage (GCS)**: Measures latency and outcome (success/failure) for GCS bucket operations (project/expense uploads, downloads, and deletions).
* **SMTP / Mailgun Emails**: Tracks success or fail logs for all outbound invoice and system emails (with recipient addresses masked).
* **Database / CRUD**:
  * Logs rollbacks and captures `SQLAlchemyError` or `IntegrityError`.
  * Logs a `WARNING` if query requests for expected records (e.g. user, project, invoice) yield `None`.
  * Records major business events: `INVOICE CREATED`, `MILESTONE BILLED`, `PAYMENT RECORDED`, and PTO request status transitions.
* **Scheduler Decortator**: Wraps all background APScheduler tasks to capture execution duration, records affected, and complete tracebacks on error.

---

## 3. Frontend Logging Architecture

The frontend logging system is designed to provide visibility while remaining completely non-disruptive.

### Logger Utility
Defined in [frontend/src/utils/logger.js](file:///frontend/src/utils/logger.js):
* Exposes `log.debug`, `log.info`, `log.warn`, and `log.error`.
* Suppresses `DEBUG` and `INFO` levels in production (`import.meta.env.PROD === true`) to optimize browser memory and console noise, while still outputting `WARN` and `ERROR`.
* Implements `showToast(message, type)`—a pure JavaScript DOM-based notification popup. It injects a smooth glassmorphism style overlay for error or success notices, replacing generic browser `alert()` popups with non-blocking alerts.

### Client-Side Integrations
* **API Client** ([api.js](file:///frontend/src/utils/api.js)): Intercepts all REST operations (`GET`, `POST`, `PUT`, `DELETE`). Logs request URLs, response status, roundtrip durations, and tracks exceptions.
* **Contexts**:
  * **AuthContext**: Logs restored sessions, successful logins, and logouts.
  * **NotificationContext**: Tracks WebSocket lifecycle, reconnections, and auth rejections.
* **Page Catch Blocks**: Catch-blocks on all 10 major listing/dashboard pages have been refactored to log issues to console and trigger user-friendly toasts:
  * `UserList.jsx`, `PTODashboard.jsx`, `Timesheet.jsx`, `ProjectSummary.jsx`, `Reports.jsx`, `CalendarView.jsx`, `CustomerList.jsx`, `LeadList.jsx`, `ProjectList.jsx`, and `TaskList.jsx`.

---

## 4. Verification & Sample Output Logs

### Backend Sample Log Outputs (`logs/pace_app.log`)

#### 1. Successful Invoice Creation
```text
[2026-05-28 12:20:05] [INFO] [app.crud] [req-5f8a29b] INVOICE CREATED: invoice_id=14, project_id=3, amount=4500.0, created_by=4
[2026-05-28 12:20:05] [INFO] [app.crud] [req-5f8a29b] MILESTONE BILLED: milestone_id=8, amount=4500.0, invoice_id=14
```

#### 2. Failed GCS Upload
```text
[2026-05-28 12:20:05] [ERROR] [app.main] [req-3c9f11e] GCS: operation=upload, filename=po_att_3_1716912964_po.pdf, success=False, duration_ms=142.00 | Error: GCS Connection timed out
```

#### 3. WebSocket Auth Failure
```text
[2026-05-28 12:20:05] [WARNING] [app.main] [req-a1b2c3d] WS AUTH FAILED: user_id=5, ip=127.0.0.1, reason=JWT decoding failed
```

### Frontend Sample Log Outputs (Console)
```text
[INFO] [2026-05-28T12:18:02.124Z] [API] REQUEST: GET /projects/
[INFO] [2026-05-28T12:18:02.302Z] [API] RESPONSE: GET /projects/ | Status: 200 | Duration: 178ms
```
