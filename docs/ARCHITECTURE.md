# PACE Architecture Guide

Welcome to the PACE (Project, Activity, and Customer Engagement) System Architecture documentation. This guide details the orchestration model, system boundaries, and runtime data flows for the full-stack system.

---

## 1. System Topology & Orchestration

The application is orchestrated locally using Docker Compose, consisting of four primary services communicating over an isolated bridge network (`app-network`).

```text
                               +-----------------------------+
                               |     Developer Browser       |
                               +--------------+--------------+
                                              |
                        HTTP (Port 7224)      | HTTPS (Port 7223)
                        ----------------------+----------------------
                                              |
                                              v
                              +---------------+---------------+
                              |    pace-frontend (Nginx)      |
                              +---------------+---------------+
                                              |
                                              | Proxies /api/ to http://backend:8000
                                              v
                              +---------------+---------------+
                              |    pace-backend (FastAPI)     |
                              +-------+---------------+-------+
                                      |               |
             mysql+pymysql://         |               | Visual DB Inspection
             -------------------------+               | (Port 8080)
                                      v               v
                     +----------------+---+   +-------+---------------+
                     | invoice_project_lead-  |   |   pace-phpmyadmin    |
                     | db-1 (MariaDB 10.6)   |   |   (Developer Tool)    |
                     +--------------------+   +-----------------------+
```

### Component Details
1. **Frontend (`pace-frontend`)**:
   - Built on React 19 and Vite.
   - Served by Nginx. Handles routing and serves static assets.
   - Exposes port `7223` for secure HTTPS traffic and port `7224` for automated HTTP testing.
   - Proxies backend requests matching `/api/` to the FastAPI backend container (`http://backend:8000`) and WebSocket requests (`/ws/`) for real-time notifications.
2. **Backend (`pace-backend`)**:
   - Built with FastAPI.
   - Loaded from Pydantic settings (`app/config.py`) and `.env`.
   - Runs on Uvicorn inside the container, exposing port `8000`.
   - Mounts native Windows volumes for persistent uploads:
     - Windows `./attachments` -> Container `/app/attachments` (for expense receipts).
     - Windows `./app/static/uploads` -> Container `/app/app/static/uploads` (for project-related deliverables).
3. **Database (`db`)**:
   - Runs MariaDB 10.6.
   - Bound to standard port `3306` inside the isolated network.
   - Uses a named Docker volume (`db_data`) mapped to `/var/lib/mysql` for persistence across container life cycles.
4. **phpMyAdmin (`phpmyadmin`)**:
   - Bound to port `8080` on the developer's machine to provide a direct web dashboard for inspecting tables.

---

## 2. System Boundaries & Role Permissions

The system implements rigid role-based access control (RBAC) defined via user roles: `user`, `pm` (Project Manager), and `admin`. There is also a Boolean override flag `has_financial_access` used to grant access to financial tools and reports.

| Access Level / Role | Allowed Operations & Scope |
| :--- | :--- |
| **Public / Guest** | Anonymous authentication (`/token`), Microsoft O365 OAuth initiation, password resets, public ICS calendar feed retrieval. |
| **Standard User (`role = "user"`)** | Logging timesheet events for themselves, submitting their own timesheets, viewing assigned projects and tasks, creating tasks, uploading expense receipts. |
| **Project Manager (`role = "pm"`)** | All standard operations, plus: creating/modifying projects, defining project milestones, viewing direct report statistics, assigning tasks. |
| **Admin (`role = "admin"`)** | Full system privileges: adding/editing users, offboarding users, locking and unlocking project time entries, bulk-approving expenses and timesheets. |
| **Financial Access Override** | Allows a PM or Admin (with `has_financial_access=True`) to view PTO audits, detailed financial reports, invoice generation dashboards, and execute Xero accounting syncs. |

---

## 3. End-to-End Data Flow Trace

To understand how data flows through the stack, the following section traces a user logging a **Timesheet Event** from the UI down to the MariaDB engine.

```text
[React UI] 
    |  
    | Axios POST request with payload (task_id, hours_spent, latitude, longitude, content)
    v
[Nginx Proxy] 
    | 
    | Re-routes request from /api/events to http://pace-backend:8000/events
    v
[FastAPI Router] 
    |
    | 1. Intercepts request at `@app.post("/events")` in `app/main.py`
    | 2. Validates JSON payload against `schemas.TaskEventCreate` Pydantic model
    | 3. Resolves `current_user` dependency via `dependencies.get_current_active_user`
    v
[SQLAlchemy CRUD Layer] 
    |
    | 1. Dispatches to `crud.create_task_event()` in `app/crud.py`
    | 2. Queries user record to extract home coordinates
    | 3. Computes Haversine distances to resolve work location (Home vs Location vs Office)
    | 4. Inserts new `models.TaskEvent` database row
    v
[SQL Database Commit] 
    |
    | 1. DB Session issues SQL INSERT statement via PyMySQL connection pool
    | 2. Triggers auto-increment on `task_events.id`
    | 3. Transaction commits and returns raw record to SQLAlchemy
    v
[FastAPI Serialization]
    |
    | 1. Maps database object properties to `schemas.TaskEvent` output structure
    | 2. Returns serialized JSON (HTTP 200 OK) back to Nginx -> React Client
    v
[React Component Refresh]
    |
    | Redux store / local state receives new record; views re-render to display logged hours
```

### Trace Step Highlights:

#### Step 1: Frontend Dispatch
A user enters hours worked on the timesheet board (`frontend/src/pages/Timesheet.jsx`). Upon clicking "Log Time", the UI triggers an Axios request:
```javascript
axios.post("/api/events", {
  task_id: 42,
  hours_spent: 4.5,
  event_date: "2026-05-22",
  content: "PLC Programming at Onsite Location",
  latitude: 35.1234,
  longitude: -80.5678,
  entry_type: "Manual"
});
```

#### Step 2: FastAPI Routing & Validation
The request is routed to `app/main.py:create_global_event`. FastAPI enforces type safety using the Pydantic schema:
- `event_date` is checked to prevent logging in the future.
- User authentication is validated by verifying the bearer JWT token in headers.

#### Step 3: Location Resolution & CRUD Execution
Within `app/crud.py:create_task_event`, the backend automatically resolves the `work_location` attribute by comparing the coordinates against user coordinates and customer site coordinates using the **Haversine Formula**:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- If the event coordinate is within **150 meters** of the user's `home_latitude`/`home_longitude`, `work_location` is marked as `"Home"`.
- If the coordinate is within **150 meters** of any `Location` record, `work_location` is populated with that location's name.
- Otherwise, it defaults to `"Office"`.

#### Step 4: SQLAlchemy Core Commit
A transaction is committed via `db.commit()`. The connection pool routes this to MariaDB, updating the `task_events` table and mapping properties back up to the frontend response model.
