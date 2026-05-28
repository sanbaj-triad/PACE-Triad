# ADR-002: Unauthenticated Endpoint Security Audit

- **Date:** 2026-05-28
- **Status:** Accepted — Remediation Pending
- **Author:** sanbaj-traid
- **Affects:** `app/main.py`, `app/routers/system.py`, `app/calendar_router.py`

---

## Context

A full review of the FastAPI backend was conducted to identify every HTTP and WebSocket route missing `Depends(get_current_active_user)` (or any equivalent auth dependency). The audit was triggered by a prior targeted fix (`main.py:1549`) that added auth to `DELETE /line-items/{item_id}` but left the sibling `PUT /line-items/{item_id}` unprotected — indicating that auth gaps were being closed reactively, one at a time, without a systematic baseline.

**Total routes audited:** ~120  
**Routes missing auth:** 44  
**Routes with partial/alternative auth:** 1 (`/xero/webhook` — HMAC signature only)  
**Routes intentionally public (login, OAuth, forgot-password):** excluded from findings

---

## Intent

Establish a complete, point-in-time record of every unprotected API surface so that:

1. Fixes can be prioritised by risk and applied systematically rather than reactively.
2. Future engineers have a baseline to diff against when adding new routes.
3. The incomplete prior fix (`PUT /line-items` vs `DELETE /line-items`) is not repeated.

---

## Approach

### Audit method

All route decorator lines (`@app.get`, `@app.post`, `@app.put`, `@app.delete`, `@app.websocket`, `@router.*`) were enumerated across `main.py`, `routers/system.py`, `ai_router.py`, and `calendar_router.py`. For each route, the handler signature was read to confirm presence or absence of a `Depends(get_current_active_user)` parameter. Findings flagged as missing auth were verified by reading the full handler body to confirm no in-body auth check substituted for the missing dependency.

### Risk classification criteria

- **Critical** — unauthenticated write/mutation of financial records, live third-party system state, uploaded files, or the ability to impersonate any user identity.
- **High** — unauthenticated read of sensitive business data (CRM, invoices, leads, financials, internal communications) or unauthenticated triggers of external-system side effects.
- **Medium** — dev/debug artifacts left in production, low-sensitivity reads, or endpoints with partial alternative protections (e.g. URL tokens, HMAC).

---

## Findings

### Critical (8 routes)

| Method | Path | Line | Risk Description |
|--------|------|------|-----------------|
| `POST` | `/sync/task-events/` | 2077 | Writes arbitrary `TaskEvent` rows to the DB. Any caller can inject fake timesheet hours for any `user_id`/`task_id` with no identity check. |
| `POST` | `/invoices/{invoice_id}/payments` | 1163 | Pushes a payment to the **live Xero integration** (`xero.push_payment_to_xero`). Fake payments can be recorded against real invoices in the accounting system. |
| `PUT` | `/line-items/{item_id}` | 1540 | Edits invoice line item amounts and descriptions. The `DELETE` for this same model was security-patched (comment at line 1547 confirms this), but the `PUT` was missed in the same fix. |
| `POST` | `/invoices/{invoice_id}/items/` | 1364 | Creates new line items on any invoice. No auth. |
| `POST` | `/projects/{project_id}/upload-po` | 973 | Unauthenticated multipart file upload. Writes to `app/static/uploads/` with a server-generated filename. No file-type validation — potential stored-file injection. |
| `POST` | `/projects/{project_id}/attachments` | 996 | Same as above — unauthenticated multipart upload for project attachments. |
| `DELETE` | `/projects/attachments/{attachment_id}` | 1031 | Deletes any project attachment from DB with no auth. |
| `WEBSOCKET` | `/ws/notifications/{user_id}` | 2999 | No token validation on connection. Any client can open a socket as **any integer `user_id`**, receive that user's real-time notifications, and silently overwrite their `last_active_at` timestamp. |

---

### High (30 routes)

| Method | Path | Line | Risk Description |
|--------|------|------|-----------------|
| `GET` | `/customers/` | 806 | Returns entire CRM customer list. Default `limit=500000` — full dump in one request. |
| `GET` | `/customers/{customer_id}` | 810 | Individual customer record. |
| `GET` | `/invoices/` | 1074 | All invoice records. |
| `GET` | `/invoices/{invoice_id}` | 1079 | Individual invoice detail. |
| `GET` | `/invoices/{invoice_id}/pdf` | 1229 | Renders and returns invoice PDF. |
| `GET` | `/invoices/{id}/download-pdf` | 1789 | Second unprotected invoice PDF download route (duplicate path pattern). |
| `GET` | `/invoices/{invoice_id}/items/` | 1368 | Line items (amounts, descriptions) for any invoice. |
| `GET` | `/invoices/{invoice_id}/payments/` | 1373 | Payment records for any invoice. |
| `GET` | `/reports/financial` | 1194 | Returns total revenue and outstanding receivables in plaintext JSON. |
| `GET` | `/reports/leads` | 1206 | Sales pipeline report. |
| `GET` | `/leads/` | 1310 | Full sales leads list. |
| `GET` | `/projects/` | 880 | All project records. |
| `GET` | `/projects/{project_id}` | 891 | Project detail. |
| `GET` | `/projects/{project_id}/report/pdf` | 943 | Project report PDF. |
| `GET` | `/projects/attachments/{attachment_id}/download` | 1046 | Download any project file by ID. |
| `GET` | `/attachments/{attachment_id}/download` | 2830 | Download any attachment (including expense receipts) by guessing sequential integer IDs. |
| `GET` | `/tasks/` | 1825 | All tasks across all users and projects. |
| `GET` | `/tasks/{task_id}` | 1837 | Task detail. |
| `GET` | `/tasks/{task_id}/pdf` | 2092 | Task PDF. |
| `GET` | `/milestones/` | 1397 | All milestones. |
| `GET` | `/projects/{project_id}/milestones/` | 1393 | Project milestones. |
| `GET` | `/projects/{project_id}/comments` | 1402 | Internal project comments. |
| `GET` | `/tasks/{task_id}/comments` | 1451 | Internal task comments. |
| `GET` | `/users/{user_id}/offboard-stats` | 735 | Exposes any user's open projects, PTO queue depth, task count, and lead assignments by integer ID enumeration. |
| `GET` | `/xero/logs` | 1612 | Full Xero API audit log — entity types, IDs, endpoints called, timestamps. |
| `GET` | `/xero/logs/download` | 1634 | Downloadable version of the same. |
| `GET` | `/emails/logs` | 1662 | Email communication log — recipients, subjects, entity references, timestamps. |
| `GET` | `/emails/logs/download` | 1671 | Downloadable version of the same. |
| `POST` | `/invoices/{invoice_id}/sync` | 1102 | Triggers a Xero sync for any invoice (causes live external API calls). No auth. |
| `POST` | `/invoices/{invoice_id}/refresh` | 1120 | Pulls latest state from Xero for any invoice. No auth. |

---

### Medium (5 routes)

| Method | Path | Line | Risk Description |
|--------|------|------|-----------------|
| `GET` | `/calendar/test` | 2457 | Dev/debug endpoint left in production. Calls `get_calendar_events` with a hardcoded `MockUser(id=1)`. Returns full Python traceback on error — information disclosure. Should be removed entirely. |
| `GET` | `/xero/api/bank-accounts` | 1187 | Returns Xero bank account list. Xero OAuth is server-side, but there is no user-level gate. |
| `GET` | `/locations/` | 840 | Office location list including addresses and GPS coordinates. |
| `GET` | `/system/state` | system.py:36 | Returns maintenance mode flag. Intentionally semi-public, but undocumented. |
| `GET` | `/calendar/onsite.ics` | calendar_router.py | Uses a URL token instead of session auth (intentional for calendar subscription clients). Token scope and expiry are not validated in the handler body. |

---

## Notable Prior Incomplete Fix

`main.py:1547` contains the comment:

```python
# SECURITY FIX: Added authentication requirement to delete line item endpoint
```

This confirms a targeted security patch was applied to `DELETE /line-items/{item_id}` (line 1549). The `PUT /line-items/{item_id}` at line 1540 — which mutates the same resource — was not included in that patch. This is the clearest example of an incomplete fix and illustrates the need for a systematic audit over one-off patches.

---

## Impact

All findings are in existing routes — no new files were created during this audit. Files with unauthenticated routes:

| File | Unauthenticated Routes |
|------|----------------------|
| `app/main.py` | 42 |
| `app/routers/system.py` | 1 (`GET /system/state`) |
| `app/calendar_router.py` | 1 (`GET /calendar/onsite.ics` — partial) |

`app/ai_router.py` — all 3 routes are correctly authenticated.  
`app/xero.py` — utility module only, no route decorators.

---

## Verification

- Each finding was verified by reading the full handler body, not only the decorator signature, to rule out in-body auth checks substituting for a missing `Depends`.
- The `POST /sync/task-events/` body was confirmed to write directly to the DB (`db.add`, `db.commit`) with no identity resolution.
- The `WEBSOCKET /ws/notifications/{user_id}` body was confirmed to skip token parsing entirely and accept any integer `user_id` from the path.
- The `PUT /line-items/{item_id}` body was confirmed to call `crud.update_line_item` directly with no user context, while its patched sibling `DELETE /line-items/{item_id}` correctly requires `current_user`.
- The `POST /invoices/{invoice_id}/payments` body was confirmed to call `xero.push_payment_to_xero` — a live external integration call — with no auth gate.
- Auth-positive routes (e.g. `POST /invoices/{invoice_id}/payments/` at line 1183, which is a near-duplicate path) were cross-checked to confirm the distinction between protected and unprotected variants.

---

## Remediation Plan

### Standard fix (all Critical and High routes except WebSocket)

Add the auth dependency to the function signature:

```python
current_user: models.User = Depends(dependencies.get_current_active_user)
```

This is a one-line change per endpoint and does not require any handler body changes for read-only routes. Write routes should additionally pass `current_user` to the relevant CRUD function for audit-trail purposes.

### WebSocket `/ws/notifications/{user_id}` (Critical — needs different approach)

Browser WebSocket clients cannot send `Authorization` headers. The standard pattern is to accept a `token` query parameter on connection and validate it before upgrading:

```python
@app.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, token: str = Query(...)):
    payload = verify_token(token)  # raises if invalid
    if payload.get("sub") != str(user_id):
        await websocket.close(code=1008)
        return
    ...
```

### `POST /sync/task-events/` (Critical — needs design decision)

This endpoint was likely built for a mobile offline-sync flow. Simply adding session auth breaks offline clients that submit queued events on reconnect. Options:

1. Require the same bearer token as all other endpoints (simplest — mobile clients already hold a token).
2. Issue a short-lived device token scoped to a specific `user_id`, validated on sync submission.

Option 1 is recommended unless there is a confirmed requirement for tokenless device sync.

### `GET /calendar/test` (Medium — remove entirely)

This is a debug endpoint that should be deleted, not protected. It exists only for developer convenience and exposes tracebacks.

### `GET /calendar/onsite.ics` (Medium — validate token expiry)

The URL token mechanism is intentional (calendar apps cannot attach auth headers to ICS subscription URLs). The handler should be updated to validate token expiry and scope rather than accepting any token value indefinitely.

---

## Alternatives Considered

| Alternative | Reason not chosen |
|---|---|
| Apply a global auth middleware to all routes | FastAPI's `Depends` model is more explicit and testable than middleware-level auth. Some routes are legitimately public (login, OAuth). A blanket middleware would require an allowlist of exceptions, which is harder to audit than the current per-route pattern. |
| Fix all 44 routes in a single commit | Higher blast radius and harder to review. Recommended approach is Critical fixes first in one PR, High in a follow-up, Medium last. |
| Ignore Medium findings | `/calendar/test` exposes tracebacks and `MockUser(id=1)` access in production — this warrants removal regardless of risk tier. |
