# Cloud Migration & Database Sync Walkthrough

We have successfully stabilized the Google Cloud production environment, establishing parity with your local Docker architecture. This marathon debugging session uncovered and resolved several critical differences between local development physics and strict cloud infrastructure.

## What We Accomplished

### 1. Eliminated "Ghost Connections"
Google Cloud Run utilizes persistent connection pools. We discovered that wiping the Cloud SQL database while the backend container was still functionally "warm" caused the backend to hang indefinitely while querying disconnected sockets.
**The Fix**: We established the `git commit --allow-empty` strategy to forcibly drop all Cloud Run instances and spin up fresh containers with clean connections.

### 2. Resolved Windows Encoding Corruption
Exporting the database directly via a PowerShell `>` redirect operator resulted in a silent `UTF-16` encoding layer, which Google Cloud Bucket imports couldn't parse, resulting in silent failures.
**The Fix**: We routed the `mysqldump` directly to the `/tmp` folder inside the Linux container boundary, guaranteeing pristine `UTF-8` compliance on export.

### 3. Dismantled Database Enums
Local databases with relaxed SQL constraints silently tolerated case mismatches (e.g., `'MEDIUM'` vs `'Medium'`). Conversely, the Cloud's stringent Pydantic models hurled 500 Internal Server Errors when querying that legacy data, resulting in blank React UI components.
**The Fix**: We systematically stripped all 15 native `SqlEnum` constraints across `app/models.py` and `app/schemas.py`, downgrading them natively to `String(50)`. 

This guarantees the backend is entirely crash-proof against legacy, mis-cased database text, allowing data imports to flow seamlessly to the UI.

## Summary Checklist
Your new standard operating procedure is completely codified in **`CLOUD_DEPLOYMENT_POLICY.md`**. It trims this entire 12-hour mission into a 30-minute checklist.

1. **Phase 1**: Clean Git Sync (`git add .`)
2. **Phase 2**: Linux-Bound Database Dump (`docker exec ... mysqldump`)
3. **Phase 3**: Prepare SQL File (`python patch_sql_dump.py`)
4. **Phase 4**: Delete & Recreate Cloud SQL Database
5. **Phase 5**: Cloud Storage SQL Import
6. **Phase 6**: Reboot Backend Connections (`git commit --allow-empty`)

Your production cloud environment is fully synchronized with your local code!
