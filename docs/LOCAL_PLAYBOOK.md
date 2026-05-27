# PACE Local Development Playbook

This playbook provides a step-by-step terminal guide on how to safely build, boot, seed, test, and view logs for the PACE application locally using Docker Compose.

---

## 1. Prerequisites

Ensure you have the following installed on your host system:
- **Docker Desktop** (version 20.10+)
- **Node.js** (version 18 or 20) & **npm**
- **Python** (version 3.10 or 3.11)

---

## 2. Environment Configuration

1. Copy the template `.env.example` file in the root directory to `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Open the `.env` file and review key integrations (default configuration maps database URLs automatically inside the Docker network, so you typically do not need to modify database variables for local run).

---

## 3. Host-Side Frontend Compilation (Crucial Pre-Build Step)

Due to memory limit errors (e.g. `EPIPE` exceptions) when building Vite/React bundles inside resource-constrained Docker containers, the frontend Dockerfile is structured to copy a host-compiled production build. Therefore, **you must build the frontend locally on your host machine before launching the Docker stack.**

### Step 1: Install Node Modules
Navigate to the `frontend/` directory and run npm install with legacy peer-dependency overrides (necessary to resolve version conflicts between React 19 and third-party Gantt calendar plugins):
```powershell
cd frontend
npm install --legacy-peer-deps
```

### Step 2: Compile Static Bundle
Compile the Vite application into static production assets:
```powershell
npm run build
```
This creates a `frontend/dist/` directory on your host containing compiled JS, CSS, and HTML resources.

---

## 4. Booting the Docker Compose Stack

Return to the project root directory and spin up the multi-container stack:
```powershell
cd ..
docker compose up -d --build
```

### Checking Container Health
Verify that all four containers are running and in healthy states:
```powershell
docker compose ps
```
You should see:
- `invoice_project_lead-db-1` (MariaDB database on port `3306`)
- `pace-backend` (FastAPI backend API on port `8000`)
- `pace-frontend` (React + Nginx on ports `7223` [HTTPS] and `7224` [HTTP])
- `pace-phpmyadmin` (Database admin UI on port `8080`)

---

## 5. Database Seeding

Once the database and backend containers are active, you must run the database seeder to establish tables, relationships, and default admin credentials. Execute this script inside the running backend container:

```powershell
docker exec -it pace-backend python seed_data.py
```

### Verify Seeding via phpMyAdmin
Open [http://localhost:8080](http://localhost:8080) in your web browser and login using:
- **Server**: `db`
- **Username**: `invoice_user`
- **Password**: `invoice_password`

Confirm that the tables under `invoice_app` are generated and seeded with mock rows.

---

## 6. Local Application Access Credentials

With the stack running, navigate to [https://localhost:7223](https://localhost:7223) in your browser. (Accept the self-signed certificate warning for local development).

Sign in using one of the pre-seeded developer profiles:

* **Administrator Profile**:
  - **Username**: `admin`
  - **Password**: `admin`
  - **Privilege**: Global system administration, finance access, offboarding, and invoice generation.

* **Standard User / PM Profile**:
  - **Username**: `pm_user`
  - **Password**: `password`
  - **Privilege**: Logging timesheets, viewing project dashboards, and task management.

---

## 7. Operational Operations (Logs, Stops, Tests)

### Viewing Container Logs
To follow stdout/stderr logs from the backend API:
```powershell
docker compose logs -f backend
```
To inspect logs across the entire container swarm:
```powershell
docker compose logs -f
```

### Stopping the Stack
To stop the application while preserving database persistence (internal volumes remain intact):
```powershell
docker compose down
```

To stop the application and clean up all volumes (wiping the database data entirely):
```powershell
docker compose down -v
```

### Rebuilding Containers
If you modify Python source code or settings in `/app`:
```powershell
docker compose restart backend
```
If you modify frontend files, you must rebuild host-side first:
```powershell
cd frontend
npm run build
cd ..
docker compose build frontend
docker compose restart frontend
```

---

## 8. Mobile App Local Development (Expo Router)

The mobile application is built using React Native and Expo. It runs on your host machine and connects to the running Docker backend.

### Step 1: Start the Metro Bundler
Navigate to the `mobile/` directory and run:
```powershell
cd mobile
npx expo start --offline
```
> [!TIP]
> The `--offline` flag forces Expo to start Metro immediately without trying to validate remote credentials, sign manifest signatures online, or prompting for Expo logins, which can get stuck in headlessly-run or nested terminal sessions.

### Step 2: Connect via Expo Go
1. Install **Expo Go** on your Android or iOS device.
2. Ensure your phone and development computer are connected to the **same local Wi-Fi network**.
3. Scan the QR code displayed in your terminal using the Expo Go app.
4. The app will fetch the JS bundle from Metro and hot-reload changes as you edit code in the `mobile/` directory.

### Troubleshooting: Stuck Terminal / Port Occupied
If your terminal appears frozen or if you get a `Something went wrong` / `EADDRINUSE: address already in use :::8081` error when restarting Expo, follow these steps:

1. **Free the port and clear caches**:
   We have created a helper PowerShell script that force-terminates any process occupying port `8081` and cleans up temporary Metro compiler folders. Run it inside the `mobile` directory:
   ```powershell
   .\clean_expo.ps1
   ```
2. **Windows QuickEdit Mode Warning**:
   If you click inside the standard Windows PowerShell or Command Prompt window, Windows may enter "selection/QuickEdit" mode, which **suspends the execution** of Metro/Node. This freezes the app loading process and locks up port 8081.
   * **To resume execution**: Click the terminal window and press **ESC** or **ENTER**.
   * **To disable QuickEdit permanently**: Right-click the terminal title bar -> **Properties** (or **Defaults**) -> **Options** -> Uncheck **QuickEdit Mode** -> Click **OK**.

