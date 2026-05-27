# PACE Application Source Inventory

## 1. Codebase Breakdown by File Type
The PACE Application is primarily a hybrid Python/React stack. Here is the aggregate structure of all source files compiled within the repository architecture:

| Extension | Language / Asset Type | File Count | Description |
|-----------|-----------------------|------------|-------------|
| `.py` | Python Backend | 210 | Core API Routes, SQLAlchemy ORMs, Pydantic Schemas, and Utilities. |
| `.txt` | Plain Text | 93 | Requirements, Configuration Logs, and Operational Backups. |
| `.jsx` | React UI Component | 64 | Nginx frontend routing pages, Gantt views, Navbars, and layout dashboards. |
| `.md` | Markdown Documentation | 29 | Cloud deployment policies, procedure walkthroughs, and DevOps playbooks. |
| `.log` | Diagnostic Logs | 23 | Docker build outputs and background CRON job execution trails. |
| `.tsx` | TypeScript React UI | 20 | Strongly typed frontend components. |
| `.png/.svg` | Graphics & SVG | 21 | Web App icons, logo matrices, and system graphic assets. |
| `.json` | JSON Objects | 16 | Package manifest scripts, local React build settings, schema templates. |
| `.js` | JavaScript Utility | 13 | Service Workers, API wrappers, hierarchy verifiers. |
| `.pdf` | PDF Analytics | 12 | System architecture renders and cached report outputs. |
| `.sql` | SQL Definitions | 7 | Pure schema matrices exported via phpMyAdmin. |
| `.css` | Cascading Style Sheets | 5 | Application native dark-mode styling variables and structural limits. |
| `Misc.` | Configs | ~15 | Docker files, .env, SSL certificates (.crt/.key), gitignore constraints. |

---

## 2. Python Modules & Dependency Stack

The React Web Server securely feeds REST requests down into the isolated Python Container. The Python Container enforces strict architectural requirements dictating exactly which modules are permitted to compile.

### Core Internal Application Modules (`app/`)
These are the physical, customly engineered modules establishing the PACE nervous system:
* `models.py` - Core mathematical boundaries generating the Database relationships.
* `schemas.py` - FastAPI verification matrices ensuring UI JSON data matches backend constraints.
* `database.py` - The pure Python-to-MySQL connection pipeline via Docker networking limits.
* `main.py` - Uvicorn server root initializing socket routes and launching Background jobs.
* `dependencies.py` - Oauth2 security verifier trapping incoming tokens against Active User states.
* `routers/` - Separated REST domains orchestrating Users, Projects, Timesheets, Auth, and System Ops.

### Explicit External pip Modules (`requirements.txt`)
These are the global Python frameworks bundled dynamically via pip inside the Docker container sequence:

* **Framework Routing:** `fastapi>=0.100.0`, `uvicorn>=0.23.0`
* **Data Management:** `sqlalchemy>=2.0.0`, `alembic>=1.11.0`, `pydantic>=2.0.0`, `pymysql`
* **Security & Auth:** `python-jose[cryptography]`, `passlib[bcrypt]`, `python-dotenv`
* **Network Hooks:** `requests`, `httpx`, `websockets`
* **Integrations:** `apscheduler>=3.10.4`, `openai>=1.14.0`, `msal>=1.26.0`, `xhtml2pdf`
