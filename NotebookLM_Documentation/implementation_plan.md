# Production Setup: Maintenance Mode & Migration Strategy

To safely handle major database schema updates in a live Cloud environment without causing race conditions or corrupted tables, we must guarantee that **zero users** are actively reading from or writing to the database while migrations occur. 

This plan details a structural "Maintenance Mode" killswitch that natively severs all Cloud Run connections, throws up a sleek lockout screen on the frontend, and documents the step-by-step SQL procedure for executing safe local-to-cloud schemas.

## Requirements & Setup

### 1. The Global Backend Killswitch (`app/main.py`)
We will inject a highest-priority global `Middleware` into FastAPI. 
- If the environment variable `MAINTENANCE_MODE=true` is set, the API will instantly reject all incoming traffic with a `503 Service Unavailable` response.
- Because changing an Environment Variable in Google Cloud Run automatically forces a container restart, throwing this switch will natively terminate every single existing user session, websocket, and database connection. The database becomes an isolated, quiet, untouchable island.

### 2. Frontend Interceptor (`frontend/src/utils/api.js`)
We will upgrade the core API pipeline in React so that if **any** request returns a `503 Maintenance Mode` error payload, the frontend automatically traps it and ejects the user to a dedicated `/maintenance` blackout route, stopping all further background network polling.

### 3. The Blackout Screen (`frontend/src/pages/Maintenance.jsx` [NEW])
We will construct a sleek, full-screen UI overlay letting employees know the application is currently offline for structural updates to prevent them from reporting 404s/Server errors to IT.

### 4. Expansion of `CLOUD_DEPLOYMENT_POLICY.md`
I will author **Phase II: The Production Migration Protocol** detailing the exact linear steps you requested:
1. Throw the `MAINTENANCE_MODE=true` Cloud Run switch.
2. Formulate a live snapshot of the Cloud SQL Server via the built-in GCP Console Export.
3. Download the exact production data payload to the local dev environment to perfectly seat it.
4. Draft standard SQL `ALTER TABLE`/`UPDATE` execution scripts on your local system and test they do not break the UI.
5. Execute the verified SQL patch direct into your Cloud SQL database.
6. Push the finalized App Code to GitHub for Cloud Build.
7. Flip `MAINTENANCE_MODE=false` returning the users to a live, structurally-sound environment.

## User Review Required
> [!IMPORTANT]  
> Are there any exceptions to the Maintenance Mode? Do you want Administrator accounts to bypass it? (Be warned: bypassing a connection-level lockout defeats the safety mechanism since the administrator might accidentally write to a table being actively altered natively in SQL). 
> **Recommendation:** Total System Lockout except for `/health` checks.

If you approve this flow, I will code the Middleware, construct the frontend blackout screens, and append the `CLOUD_DEPLOYMENT_POLICY.md` file.
