# Helper Project Lead - Startup Guide
# Comment line
This document outlines the steps to set up and run the **Invoice Project Lead** application, which consists of a **FastAPI** backend and a **Vite (React)** frontend.

## Prerequisites

Ensure you have the following installed:
- **Python 3.10+**
- **Node.js 16+** & **npm**
- **Docker Desktop** (for the database)

---

## 1. Database Setup (Docker)

The application uses a MariaDB/MySQL database running in Docker.

1. Open a terminal in the project root: `c:\Apps\python\Invoice_Project_Lead`
2. Start the database container:
   ```powershell
   docker compose up -d
   ```
   *Note: If this command fails, ensure Docker Desktop is running and you have permissions to bind ports.*

---

## 2. Backend Setup (FastAPI)

1. **Environment Setup**:
   The project uses a virtual environment located in `.venv`.
   
   If you need to recreate it:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Start the Backend Server**:
   Run the following command from the project root:
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```
   
   - **API URL**: [http://localhost:8000](http://localhost:8000)
   - **Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Frontend Setup (Vite + React)

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install Dependencies** (First time only):
   ```powershell
   npm install
   ```

3. **Start the Development Server**:
   ```powershell
   npm run dev
   ```

   - **Frontend URL**: [https://localhost:7223](https://localhost:7223)

---

## Summary of Running Terminals

You will typically need **two** terminal windows open:

**Terminal 1 (Backend):**
```powershell
cd c:\Apps\python\Invoice_Project_Lead
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**Terminal 2 (Frontend):**
```powershell
cd c:\Apps\python\Invoice_Project_Lead\frontend
npm run dev
```
