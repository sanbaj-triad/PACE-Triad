# ADR-001: Inline PTO Approval UI in Manager Workspace

- **Date:** 2026-05-28
- **Status:** Accepted
- **Author:** sanbaj-traid
- **Affects:** `frontend/src/pages/ManagerWorkspace.jsx`

---

## Context

The PTO approval flow was functionally complete on the backend but had no proactive surface for managers. When an employee submitted a request, no notification was sent and no indicator appeared in the manager's primary workspace. Managers were required to navigate manually to a separate `PTODashboard` page to discover and action pending requests.

This created two problems:

1. **Discovery gap** — requests could sit unactioned for extended periods because managers had no prompt.
2. **Context switching** — the existing workflow forced managers out of their primary workspace (`ManagerWorkspace`) to a different page, interrupting their flow.

---

## Decision

Add a **Pending PTO Requests** section directly inside `ManagerWorkspace.jsx`, surfacing actionable approval cards inline alongside the manager's team roster, projects, and milestones.

---

## Intent

Eliminate the discovery gap without introducing a new notification infrastructure. The goal was the smallest change that gives managers visibility into pending requests at the point they are already working — their workspace — rather than requiring a separate navigation step or a new email/push system.

---

## Approach

### Why inline in ManagerWorkspace rather than a notification system?

Building a real-time notification system (email, in-app push, WebSocket) would have been a larger, riskier change touching the backend mailer, a new notifications model, and frontend state management. The immediate problem — managers not seeing pending requests — could be solved entirely in the frontend by surfacing data that the existing API already returns. The inline section was chosen as the proportionate solution.

### Why follow the ExpenseApprovals.jsx pattern?

`ExpenseApprovals.jsx` was already the established approval UI in the codebase, using a `confirm → api.put → refresh` interaction loop, `data-table` styling, and conditional action buttons based on item status. Mirroring that pattern keeps the codebase visually and behaviourally consistent, and avoids introducing a new interaction paradigm for what is functionally the same action (a manager approving or rejecting a subordinate's request).

### Two-stage approval handling

The backend enforces a two-stage flow (`Pending` → `Manager Approved` → `Finance Approved`). The UI accounts for this by:

- Always fetching `?status=Pending` and filtering results client-side to the manager's direct reports (`manager_id === user.id`), so a manager only sees requests from people they manage.
- Conditionally fetching `?status=Manager%20Approved` when `user.has_financial_access` is true, and rendering a **Finance Approve** button for those rows. Users without financial access see an **Awaiting Finance** read-only label instead, preventing accidental or unauthorized stage skipping.
- Using `Promise.all` for the two status fetches to avoid sequential round trips on page load.

### Why filter direct reports client-side rather than server-side?

The `/pto/requests` endpoint does not accept a `manager_id` filter parameter. Rather than modifying the backend endpoint (which would have required schema, CRUD, and route changes), the direct-report filter is applied at render time using the `users` list already fetched by `fetchWorkspaceData`. This keeps the backend change surface at zero for this feature.

### Why hide the section when empty?

The section is rendered conditionally (`visiblePtoRequests.length > 0`) to avoid adding permanent visual weight to the workspace when there is nothing to action. Managers with no pending requests see no change to their workspace layout.

---

## Impact

| File | Change |
|---|---|
| `frontend/src/pages/ManagerWorkspace.jsx` | Added `ptoRequests` state; extended `fetchWorkspaceData` to fetch PTO statuses in parallel; added `handlePTOAction` handler; added `directReportIds` / `visiblePtoRequests` computed values; added Pending PTO Requests JSX section |

No backend files were modified. The existing endpoints used are:

- `GET /pto/requests?status=Pending` — already existed, no changes
- `GET /pto/requests?status=Manager%20Approved` — already existed, no changes
- `PUT /pto/requests/{id}/status` — already existed, no changes

---

## Verification

- Reviewed that all three API endpoints are exercised by existing backend logic (`app/main.py:2392–2420`, `app/crud.py:2467–2525`) before wiring them to the new UI.
- Confirmed status string literals (`"Pending"`, `"Manager Approved"`, `"Finance Approved"`, `"Rejected"`) match the `PTOStatus` enum values in `app/models.py:83–87`.
- Confirmed `api.put` signature in `frontend/src/utils/api.js:69–92` accepts `(endpoint, data)` and serialises the body as JSON, matching the `PTORequestUpdateStatus` schema (`{ status: str }`).
- Confirmed the backend authorization rule (`app/main.py:2414`) — only `role === 'user'` is blocked from approving — is consistent with showing action buttons to any non-user role in the UI.
- No new dependencies were introduced; the section reuses `api`, `useAuth`, and existing CSS classes (`data-table`, `btn-primary`, `btn-secondary`, `card`).

---

## Alternatives Considered

| Alternative | Reason not chosen |
|---|---|
| Email notification to manager on submission | Would require backend mailer changes and a new `send_system_email` call in `create_pto_request`. Deferred; the inline section solves discoverability without it. |
| New dedicated PTO Approvals page (like ExpenseApprovals) | Adds a nav entry and another page to maintain. Inline in workspace is higher-value since managers already spend time there. |
| Server-side `manager_id` filter on `/pto/requests` | Clean long-term improvement, but would require backend schema + CRUD + route changes. Out of scope for this change; tracked as a future improvement. |
| WebSocket / real-time push for new requests | Significant infrastructure addition. Deferred until notification requirements are formally scoped. |
