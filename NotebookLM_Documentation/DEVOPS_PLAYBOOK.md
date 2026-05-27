# PACE SecureDevOps CI/CD Playbook

This document is the master operational playbook for the PACE Application. It defines the standardized procedures for local development, Git source control, local database management via phpMyAdmin, and secure Google Cloud deployment pathways.

---

## 1. Local Development Environment

To begin modifying the PACE application, you must run your local architecture stack. This isolates your changes from the live cloud environment, allowing you to test code changes safely.

### A. Booting the Local Docker Stack
The PACE ecosystem utilizes a Docker compose wrapper to build the database securely.
```powershell
# 1. Open your terminal in the root PACE directory:
cd c:\Apps\python\Invoice_Project_Lead

# 2. Boot the background Docker Database Containers:
docker compose up -d
```
*Your local MariaDB/MySQL server is now violently shielded within Docker, listening on port 3306.*

### B. Booting the Application Servers
You must boot **two** independent terminals for the split architecture: Let them run in the background.

**Terminal 1 (Python Backend):**
```powershell
cd c:\Apps\python\Invoice_Project_Lead
.\.venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

**Terminal 2 (React Frontend UI):**
```powershell
cd c:\Apps\python\Invoice_Project_Lead\frontend
npm run dev
```

---

## 2. Source Control Operations (Git)

Git is your save-state matrix. When you finish an architectural change or a new UI component, you must stage your changes and push them to the repository.

### Standard CI/CD Payload Command Sequence:
Once you have tested the frontend (`https://localhost:7223`) and confirmed stability:

```powershell
# 1. Stage all modified files to the payload bay:
git add .

# 2. Package the modifications with a descriptive blueprint label:
git commit -m "UI: Rebuilt the Analytics Charts and adjusted margin spacing"

# 3. Fire the payload out into the Cloud Repository:
git push
```
> [!NOTE] 
> Because of our SecureDevOps pipeline setup, typing `git push` **automatically** alerts Google Cloud Build. Cloud Build will quietly clone your code, compile the Python and Nginx Docker images, and cleanly upgrade the live Cloud Run containers on the internet. **Users will experience exactly zero downtime for pure code changes.**

---

## 3. Local Database Construction (phpMyAdmin)

If you need to add a new column to a table, build a new data model, or wipe test data, use the native phpMyAdmin interface that boots via Docker.

### Accessing Local Data
1. Navigate to: `http://localhost:8080/`
2. **Server:** `db`
3. **Username:** `invoice_user`
4. **Password:** `invoice_password`

### Migrating Schemas (Creating the `.sql` File)
If you build a new table or add new columns to a table inside phpMyAdmin, you need to capture those mathematical structure differences so we can sync them to the Google Cloud!

1. Inside phpMyAdmin, click the **`invoice_app`** database.
2. Click the **Export** tab on the top menu.
3. Select **Custom - display all possible options**.
4. Scroll down to *Object Creation Options* and check:
   - `Add DROP TABLE / VIEW / PROCEDURE... statement`
5. Click **Export** at the bottom to download your local database capture locally (e.g. `invoice_app_perfect_export.sql`).

---

## 4. Pre-Production Database Validation

Before overriding the live database, you must sanitize and patch your `.sql` export so the Live Cloud MySQL doesn't crash on restrictive key checks or invalid Enum architectures.

### The Patch Protocol
We wrote a local script specifically to prepare your export files for the cloud.
```powershell
# Ensure your downloaded SQL file is placed alongside the python script in root
python patch_sql_dump.py invoice_app_perfect_export.sql
```
*This prepends `SET FOREIGN_KEY_CHECKS=0;` to your file and strips environment-specific definers.*

### The Cloud Storage Hand-off
1. Open up the **Google Cloud Console**.
2. Navigate into **Cloud Storage -> Buckets**.
3. Locate the `tsepace-db-backups` (or your defined sync bucket).
4. **Upload** your newly patched `invoice_app_perfect_export.sql` file into this Bucket. The cloud now holds the schema definitions.

---

## 5. Live Production Deployment & Maintenance Mode

> [!WARNING]
> Pushing Database structure modifications directly interrupts running systems. **You MUST engage Maintenance Mode before wiping or upgrading Live Cloud Data.**

If your `git push` included major database alterations, follow the absolute synchronization cycle below to avoid 422 Server Output errors on live clients:

### Step 1: Engage Maintenance Mode (The Killswitch)
1. Open the Google Cloud Console -> **Cloud Run**.
2. Stop the `pace-backend` container, or Edit its Environment Variables.
3. Add a Variable: `MAINTENANCE_MODE` value `true`.
4. Hit Deploy.
*Within seconds, the API seizes, and all active React interface users are thrown into the offline "System Maintenance" splash screen. You hold exclusive administrative clearance.*

### Step 2: Swap the Live Cloud SQL Data
1. Go to Google Cloud Console -> **SQL**.
2. Select your `pace-db` server instance and navigate to the **Databases** node.
3. Delete the old `invoice_app` database entirely. (This flushes all dead connections).
4. Hit **Create Database** and recreate `invoice_app`.
5. On the main SQL pane, click **Import**.
6. Select the `invoice_app_perfect_export.sql` file you dumped into the Bucket in Phase 4.
*The cloud database perfectly mimics your completed local sandbox architecture.*

### Step 3: Reboot Cloud Run
Because the underlying SQL server dropped, your running Python Backend has dead socket connections hanging helplessly. You must trigger a fresh container build to rewire the framework.

```powershell
cd c:\Apps\python\Invoice_Project_Lead
git commit --allow-empty -m "Flushing Cloud Socket Ties for Database Upgrade"
git push
```
*Cloud Build packages a fresh, responsive container dynamically hooked into your newly imported SQL Architecture.*

### Step 4: Disengage Maintenance Mode
1. Once Cloud Build signifies success, go back to **Cloud Run**.
2. Edit the `pace-backend` Environment Variables.
3. Swap `MAINTENANCE_MODE` to `false`.
4. Deploy.

*Within 60 seconds, all logged-in user endpoints will automatically resume routing to the now-upgraded PACE Architecture.*
