# PACE App: Cloud Deployment & Database Sync Policy

*This document outlines the codified procedure for synchronizing major architectural changes and local database data up to the Google Cloud production environment, ensuring a 12-hour debugging process is reduced to a 30-minute standardized checklist.*

## When to Use This Policy
1. **Incremental Updates (No Database Sync Required):** For UI modifications (React components, CSS), API logic adjustments, or inserting non-destructive SQLAlchemy tables, you DO NOT need to engage `MAINTENANCE_MODE` or drop databases. Simply commit and push your code (`git add .`, `git commit`, `git push`). Google Cloud Build will sequentially and safely upgrade the active Cloud Run container seamlessly behind the scenes without user interruption.
2. **Structural Updates (The "Nuclear Sync"):** If you have significantly altered the database schema locally, executed massive data migrations, or completely refactored backend Data Models (e.g., removing SqlEnums), you **must** execute this full protocol to guarantee Cloud parity.

---

## The "Nuclear Sync" Protocol

### Phase 1: Capture the Codebase
Ensure 100% of your local modifications (React, Python, Scripts, CSS) are packaged for Google Cloud Build.
```powershell
git add .
git commit -m "Capture all local architecture and schema changes for Cloud sync"
git push
```
*Wait for Google Cloud Build to successfully deploy the new container before proceeding to Phase 2. This guarantees the backend tables match your incoming data.*

### Phase 2: Export the Local Database
Do **not** use standard PowerShell redirect operators (`>`) as they corrupt the SQL file with Windows UTF-16 encoding. Extract the database purely from inside the Linux docker container:
```powershell
docker exec invoice_project_lead-db-1 sh -c "mysqldump -u invoice_user -pinvoice_password invoice_app > /tmp/PERFECT_BACKUP.sql"
docker cp invoice_project_lead-db-1:/tmp/PERFECT_BACKUP.sql PERFECT_BACKUP.sql
```

### Phase 3: Patch the SQL Dump
Ensure legacy Enum types and Foreign Key checks do not crash the Cloud import. Run the patch script:
```powershell
python patch_sql_dump.py PERFECT_BACKUP.sql
```
*(This script prepends `SET FOREIGN_KEY_CHECKS=0;` and scrubs environment-specific definers).*

### Phase 4: Wipe and Rebuild Cloud SQL
1. Open Google Cloud Console -> **SQL** -> your database instance -> **Databases**.
2. **Delete** the `invoice_app` database (this instantly severs all hanging connections).
3. **Recreate** the `invoice_app` database.

### Phase 5: Reload Cloud Data
1. Navigate to your Google Cloud Storage Bucket.
2. Upload the `PERFECT_BACKUP.sql` file.
3. Go back to Cloud SQL -> **Import**, and select the uploaded file to securely populate the fresh database.

### Phase 6: Flush Dead Cloud Run Connections
Because the Cloud SQL Database was deleted and recreated while the Backend Container was running, the Backend's connection pool is now dead. You must force the container to reboot and establish fresh connections:
```powershell
git commit --allow-empty -m "Reboot cloud backend to flush dead database connections"
git push
```

---
*Following this exact sequence prevents 500 Server Errors, 422 Unprocessable Entities, and Cloud SQL Data Truncation crashes.*

---

## Phase II: The Production Safe-Migration Protocol

When PACE structurally transitions into live production, you can no longer natively execute the destructive "Nuclear Sync" without massive data loss. Instead, all changes must be verified locally against a cloned payload, while guaranteeing no active users are mutating data.

### Step 1: Engage the Global Killswitch
Open the Google Cloud Run Console. Edit the `pace-backend` container's environment variables and set `MAINTENANCE_MODE=true`. 
*This instantly forces the container to reboot, physically severing all open SQL transaction lines and websocket connections. The React frontend will immediately detect the 503 HTTP status and trap all user sessions inside a strict "System Offline" UI.*

### Step 2: Clone the Production Payload
Navigate to the Google Cloud SQL Console -> Export. Formulate a pure SQL dump to your Bucket (e.g., `prod_backup.sql`), download it to your local environment, and import it into your local Docker DB (`invoice_app`). 
*Your local developer sandbox is now perfectly mathematically identical to your halted production environment.*

### Step 3: Script & Verify Natively
Draft pure SQL `ALTER TABLE` or `UPDATE` schema patch scripts (`migration_v2.sql`). Execute them against your perfectly-cloned local database. Verify the frontend renders flawlessly and throws no cascading HTTP errors in the terminal.

### Step 4: Depoloy Sequence
1. Execute your tested `migration_v2.sql` directly into your halted Cloud SQL database terminal.
2. Formulate your final GitHub code delivery:
```powershell
git add .
git commit -m "Live Production Schema Upgrade Deployment"
git push
```
3. Wait for Google Cloud Build to safely assemble the new container architectures.
4. Set `MAINTENANCE_MODE=false`. Cloud Run will cycle the container one final time, un-clamping the 503 Error status and returning all active personnel to the live, upgraded Environment.

> **Rollback Safe-guard:** If the deploy fatally cascades, re-import your `prod_backup.sql` directly back into Cloud SQL and execute a `git revert` to the previous commit branch. Your downtime remains capped, and data loss guarantees sit at absolute zero.
