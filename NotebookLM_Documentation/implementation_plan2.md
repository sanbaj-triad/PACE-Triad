# Forced Password Reset Architecture

Currently, the bulk import tool defaults all new users to the password: `Welcome123!`. 

To force users to change this upon their first login *without* requiring you to restructure your SQL database tables again, we can use a highly secure **"JWT Payload Embedding"** strategy.

## How it Works (No DB Changes Required)

1. **Backend Validation (`app/main.py`)**: When a user attempts to log in at the `/token` endpoint, the backend natively compares their input password. If they successfully log in using `"Welcome123!"`, the backend injects a strict `"force_reset": True` flag directly inside the cryptographically signed JWT token payload.
2. **Frontend Interception (`AuthContext.jsx`)**: When the React UI decodes the token and sees the `force_reset` flag, it instantly disables the global router.
3. **Modal Lock (`App.jsx`)**: The UI overlays your existing `ChangePasswordModal.jsx` over the entire screen, preventing the user from closing it or accessing the dashboard until the `/users/change-password` API returns a success code.

---

## Proposed Implementation Steps

### 1. Update JWT Generator to flag the default password
#### [MODIFY] [main.py](file:///c:/Apps/python/Invoice_Project_Lead/app/main.py)
* Around line `112` inside the `/token` route, modify the `data` payload sent to `auth.create_access_token()`.
* Add logic: `data={"sub": user.username, "force_reset": form_data.password == "Welcome123!"}`.

### 2. Update Global UI to parse the token and enforce the lock
#### [MODIFY] [AuthContext.jsx](file:///c:/Apps/python/Invoice_Project_Lead/frontend/src/context/AuthContext.jsx)
* Intercept the login logic to natively read the `force_reset` flag from the JWT payload.
* Expose `forcePasswordReset` as a global application state variable.

### 3. Display the Uncloseable Modal
#### [MODIFY] [App.jsx](file:///c:/Apps/python/Invoice_Project_Lead/frontend/src/App.jsx)
* Import the existing `ChangePasswordModal`.
* If `forcePasswordReset === true`, render the modal globally and forcefully strip its `close` button/background-dismiss properties so the user is physically trapped until they submit a new password.

---

## Why this is the "Best" way:
1. **Security**: They literally cannot interact with the portal because the React router is suspended.
2. **Convenience**: You don't have to `ALTER TABLE` or wipe out your Google Cloud database to add a `must_reset_password` column.
3. **Simplicity**: You can safely email your 40-person team and tell them: *"Your username is your email, your temporary password is `Welcome123!`. The system will mandate a secure password change immediately upon entry."*
