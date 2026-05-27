# Task: Global System Announcements & Version Control

- `[x]` **Documentation Updates**
  - Update `CLOUD_DEPLOYMENT_POLICY.md` explicitly defining "Incremental Updates" workflow vs "Nuclear / Maintenance Syncs"

- `[x]` **Backend Structural Insertion**
  - Synthesize the `SystemState` table in `app/models.py`.
  - Architect Pydantic validators in `app/schemas.py`.
  - Build `app/routers/system.py` encompassing global `GET` and protected Admin `PUT` mechanisms.
  - Wire the router directly into `app/main.py`.

- `[x]` **Frontend Execution Matrix**
  - Construct `SystemContext.jsx` globally wrapping the React engine.
  - Inject the dynamic Warning Banner conditionally into `Layout.jsx`.
  - Map the active configuration Version into the User Dropdown in `Topbar.jsx`.
  - Intersect a "Global App Settings" Admin tile directly inside `UserList.jsx`.

- `[x]` **Validation**
  - Execute a local native compilation.
  - Spin Docker containers fully natively activating SQLAlchemy `create_all` without invoking data loss algorithms.
