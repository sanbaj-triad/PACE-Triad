# Feature Addition: Live System State & Announcements

You raised a fantastic point. Small iterations should never warrant a database freeze. Because the `MAINTENANCE_MODE` system we just built acts exclusively as an *opt-in* environment variable, you can freely push standard UI updates by strictly leaving `MAINTENANCE_MODE` alone. I will explicitly append this structural clarification to the `CLOUD_DEPLOYMENT_POLICY.md` documentation so that procedure is locked in.

To accomplish the Global Admin Banner and dynamic Versioning without tearing down the existing production database, we will use a "Soft-Model" insertion technique.

## 1. Non-Destructive Database Injection (`app/models.py`)
We will introduce a tiny, mathematically isolated table named `SystemState`:
- `announcement_message`: String
- `is_announcement_active`: Boolean
- `app_version`: String

**Why this is safe:** When the Google Cloud backend boots up, SQLAlchemy's `create_all` initializer natively intercepts new class definitions and executes a `CREATE TABLE IF NOT EXISTS` command. Because we are *adding* a new table rather than *altering* an existing one, the database will silently construct the isolated schema without dropping or corrupting any of your live user data. Zero downtime or Nuclear Syncs are required!

## 2. API Data Layer (`app/routers/system.py`)
- **GET `/api/system/state`:** Publicly accessible by all authenticated users. It returns the current version and any active broadcast banners.
- **PUT `/api/system/state`:** Highly guarded Admin-Only route to edit the active broadcast message or bump the App Version when releasing code.

## 3. Global React Interceptor (`frontend/src/context/SystemContext.jsx`)
We will construct a background React Context layer that fetches the `SystemState` exactly once on login and mounts it globally.

## 4. Administrative Control Panel & Universal Banner
- **Global Banner:** A sleek, high-visibility orange/red banner will render at the absolute top of the viewport (above the navigation bar) for *all users* identically if `is_announcement_active` is flagged True by an Admin.
- **Version Number:** The `App Version: X.X.X` will be injected squarely at the bottom of the User Profile dropdown matrix, exactly as requested.
- **Admin Command Post:** We will embed a tiny "System Config" tile inside the Admin Dashboard (or User Administration view) allowing you to rapidly toggle the banner message on the fly and push dynamic version updates when releasing code.

## User Approval Checkpoint
> [!IMPORTANT]
> If authorized, I will completely execute this architecture. It avoids all destructive SQL logic. Since you are performing final manual checks, do you want me to append the "System Config" controls into your existing `UserList.jsx` Admin matrix, or create a distinct Administrator tile / modal?

*(I will default to slipping it cleanly into your existing User Administration view for consolidated oversight if you flatly approve).*
