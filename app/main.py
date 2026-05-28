from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, WebSocket, WebSocketDisconnect, Form, Query, Request
from google.cloud import storage
from fastapi.responses import StreamingResponse
import io
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import io
from xhtml2pdf import pisa
from pydantic import BaseModel
from . import crud, models, schemas, auth, dependencies
from .database import SessionLocal, engine
from .pdf_generator import generate_invoice_pdf, generate_project_report_pdf, generate_task_report_pdf, generate_lead_pdf, generate_event_report_pdf
from .mail import send_invoice_email
from fastapi import BackgroundTasks
import os
import shutil
from fastapi.responses import FileResponse
from .config import settings
import uuid
import time
from .logger import get_logger, request_id_var, mask_email, mask_sensitive

logger = get_logger("app.main")

UPLOAD_DIR = "attachments"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Safe auto-migrations
# Safe auto-migrations will execute during startup

app = FastAPI(title="TSE_LPMI")

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    # Retrieve request ID or generate one
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    token = request_id_var.set(request_id)
    
    start_time = time.time()
    
    # Process maintenance mode
    if os.environ.get("MAINTENANCE_MODE", "false").lower() == "true":
        if request.url.path != "/health":
            duration = (time.time() - start_time) * 1000
            logger.warning(f"Maintenance mode active: blocked {request.method} {request.url.path}")
            request_id_var.reset(token)
            return JSONResponse(status_code=503, content={"detail": "MAINTENANCE_MODE"})
            
    response = None
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        duration = (time.time() - start_time) * 1000
        logger.error(
            f"Request failed: {request.method} {request.url.path} | Error: {str(exc)} | Duration: {duration:.2f}ms",
            exc_info=True
        )
        raise exc
    finally:
        duration = (time.time() - start_time) * 1000
        user_id = getattr(request.state, "user_id", "-")
        status_code = response.status_code if response else 500
        logger.info(
            f"Request: {request.method} {request.url.path} | User: {user_id} | Status: {status_code} | Duration: {duration:.2f}ms"
        )
        request_id_var.reset(token)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Uncaught Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()}
    )

from .ai_router import router as ai_router
from .calendar_router import router as calendar_router

app.include_router(ai_router)
app.include_router(calendar_router)
@app.on_event("startup")
def startup_event():
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Failed to create models during startup: {e}")

    try:
        from .scheduler import start_scheduler
        # SLEEP MODE: Prevent background workers from locking DB during import
        # start_scheduler()
        pass
    except Exception as e:
        print(f"Failed to initialize background scheduler: {e}")

# Static files mount
# Static files mount
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Ensure upload directory exists
import os
os.makedirs("app/static/uploads", exist_ok=True)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    import traceback
    error_msg = f"Validation Error:\n{exc}\n\nBody: {exc.body}\n"
    print(f"DEBUG: Validation Error: {exc}")
    with open("validation_error.log", "w") as f:
        f.write(error_msg)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

    db.close()
    
from fastapi.responses import FileResponse, Response

from fastapi.responses import FileResponse, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta, datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: schemas.User
    force_reset: Optional[bool] = False

@app.post("/token", response_model=LoginResponse)
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ip_addr = request.client.host if request.client else "unknown"
    masked_username = mask_email(form_data.username) if "@" in form_data.username else form_data.username
    user = crud.get_user_by_username(db, username=form_data.username)

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"LOGIN FAILED: username={masked_username}, ip={ip_addr}, reason=Incorrect username or password")
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not getattr(user, 'is_active', True) or getattr(user, 'locked_out', False):
        logger.warning(f"LOGIN FAILED: username={masked_username}, ip={ip_addr}, reason=Disabled or locked out")
        raise HTTPException(
            status_code=403,
            detail="Account is disabled or locked out. Please contact your system administrator.",
        )
        
    if not getattr(user, 'login_enabled', True):
        logger.warning(f"LOGIN FAILED: username={masked_username}, ip={ip_addr}, reason=Login disabled")
        raise HTTPException(
            status_code=403,
            detail="Login is currently disabled for this record. Contact an administrator to enable system access.",
        )
    
    # Update Last Login
    user.last_login = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    
    logger.info(f"LOGIN SUCCESS: user_id={user.id}, username={masked_username}, ip={ip_addr}")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={
            "sub": user.username,
        }, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user, "force_reset": getattr(user, 'needs_password_change', False)}


# --- O365 Microsoft SSO Integration ---
import httpx
from fastapi.responses import RedirectResponse

AZURE_CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "your-client-id-here")
AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET", "your-client-secret-here")
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID", "common")

@app.get("/auth/login/microsoft")
def login_microsoft(request: Request):
    # Default to production. Developer environments must override this in .env
    base_domain = os.environ.get("SSO_DOMAIN", "https://pace-frontend-611176160748.us-east4.run.app")
    redirect_uri = f"{base_domain}/auth/callback/microsoft"
        
    auth_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/authorize"
    auth_url += f"?client_id={AZURE_CLIENT_ID}&response_type=code&redirect_uri={redirect_uri}&response_mode=query&scope=openid%20email%20profile%20User.Read"
    
    return RedirectResponse(auth_url)

@app.get("/auth/callback/microsoft")
async def callback_microsoft(code: str, request: Request, db: Session = Depends(get_db)):
    base_domain = os.environ.get("SSO_DOMAIN", "https://pace-frontend-611176160748.us-east4.run.app")
    redirect_uri = f"{base_domain}/auth/callback/microsoft"
    ip_addr = request.client.host if request.client else "unknown"
        
    token_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    
    async with httpx.AsyncClient() as client:
        res = await client.post(token_url, data={
            "client_id": AZURE_CLIENT_ID,
            "client_secret": AZURE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        })
        
        if res.status_code != 200:
            logger.warning(f"LOGIN FAILED: method=microsoft_sso, ip={ip_addr}, reason=Failed to acquire token from Microsoft")
            raise HTTPException(status_code=400, detail="Failed to acquire token from Microsoft")
            
        access_token = res.json().get("access_token")
        
        # Read profile
        graph_res = await client.get("https://graph.microsoft.com/v1.0/me", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        if graph_res.status_code != 200:
            logger.warning(f"LOGIN FAILED: method=microsoft_sso, ip={ip_addr}, reason=Failed to acquire profile from Microsoft Graph")
            raise HTTPException(status_code=400, detail="Failed to acquire profile from Microsoft Graph")
            
        profile = graph_res.json()
        email = profile.get("mail") or profile.get("userPrincipalName")
        
        if not email:
            logger.warning(f"LOGIN FAILED: method=microsoft_sso, ip={ip_addr}, reason=Microsoft account does not have a primary email")
            raise HTTPException(status_code=400, detail="Microsoft account does not have a primary email")
            
        # Verify against internal DB
        user = db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()
        if not user:
            logger.warning(f"LOGIN FAILED: method=microsoft_sso, email={mask_email(email)}, ip={ip_addr}, reason=User is not registered in PACE")
            raise HTTPException(status_code=403, detail=f"User {email} is not registered in PACE")
            
        if not getattr(user, 'is_active', True) or getattr(user, 'locked_out', False):
            logger.warning(f"LOGIN FAILED: method=microsoft_sso, email={mask_email(email)}, ip={ip_addr}, reason=Disabled or locked out")
            raise HTTPException(status_code=403, detail="Account is disabled or locked out.")
            
        user.last_login = datetime.utcnow()
        user.login_count = (user.login_count or 0) + 1
        db.commit()
        
        logger.info(f"LOGIN SUCCESS: method=microsoft_sso, user_id={user.id}, email={mask_email(user.email)}, ip={ip_addr}")
        
        # Create standard PACE JWT
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        internal_token = auth.create_access_token(
            data={"sub": user.username}, 
            expires_delta=access_token_expires
        )
        
        # Route back to the frontend with the token embedded
        base_domain = os.environ.get("SSO_DOMAIN", "https://pace-frontend-611176160748.us-east4.run.app")
        frontend_url = f"{base_domain}/auth-success?token={internal_token}"
            
        return RedirectResponse(frontend_url)

from fastapi import Body
@app.post("/auth/microsoft/mobile-exchange")
async def mobile_microsoft_exchange(request: Request, access_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    ip_addr = request.client.host if request.client else "unknown"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        profile_res = await client.get("https://graph.microsoft.com/v1.0/me", headers=headers)
        if profile_res.status_code != 200:
            logger.warning(f"LOGIN FAILED: method=microsoft_mobile, ip={ip_addr}, reason=Invalid Microsoft Token")
            raise HTTPException(status_code=401, detail="Invalid Microsoft Token")
            
        profile = profile_res.json()
        email = profile.get("mail") or profile.get("userPrincipalName")
        
        if not email:
            logger.warning(f"LOGIN FAILED: method=microsoft_mobile, ip={ip_addr}, reason=Could not extract email from Microsoft profile")
            raise HTTPException(status_code=400, detail="Could not extract email from Microsoft profile")
            
    user = db.query(models.User).filter(func.lower(models.User.email) == email.lower()).first()
    if not user:
        if email.endswith("@triadsys.com"):
            new_user_data = schemas.UserCreate(
                username=email.split("@")[0],
                email=email,
                password="AutoGeneratedSSOUser1!",
                first_name=profile.get("givenName", ""),
                last_name=profile.get("surname", ""),
                role="user"
            )
            user = crud.create_user(db, new_user_data)
            logger.info(f"USER AUTO-CREATED via SSO: user_id={user.id}, email={mask_email(user.email)}")
        else:
            logger.warning(f"LOGIN FAILED: method=microsoft_mobile, email={mask_email(email)}, ip={ip_addr}, reason=Not strictly registered in TriadSys O365 Tenant")
            raise HTTPException(status_code=403, detail="User not strictly registered in TriadSys O365 Tenant")
            
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    pace_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    logger.info(f"LOGIN SUCCESS: method=microsoft_mobile, user_id={user.id}, email={mask_email(user.email)}, ip={ip_addr}")
    return {"access_token": pace_token, "token_type": "bearer", "user": user}

class ForgotPasswordRequest(BaseModel):
    email: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@app.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email, models.User.is_active == True).first()
    if not user:
        return {"message": "If that email exists, a temporary password has been sent."}
        
    import secrets
    import string
    from .mail import send_system_email
    
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
    user.hashed_password = auth.get_password_hash(temp_password)
    db.commit()
    
    subject = "PACE - Password Reset"
    body = f"Hello {user.first_name or user.username},\n\nYour password has been reset.\n\nTemporary Password: {temp_password}\n\nPlease log in and change your password immediately."
    send_system_email([user.email], subject, body)
    
    return {"message": "If that email exists, a temporary password has been sent."}

@app.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if not auth.verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    # Re-acquire the exact user inside the local scoped DB session!
    db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    db_user.hashed_password = auth.get_password_hash(req.new_password)
    db_user.needs_password_change = False
    db.commit()
    
    return {"message": "Password updated successfully"}

from fastapi.exceptions import ResponseValidationError

@app.get("/")
def read_root():
    return {"message": "API is running. Please access the application via the Frontend URL (usually port 5173)."}

# --- Analytics Endpoints ---
# @app.get("/analytics/dashboard", response_model=schemas.DashboardMetrics)
# def read_dashboard_metrics(db: Session = Depends(get_db)):
# This is to limit the dashboard access to Admins only, since it contains global analytics data. Regular users can use /analytics/my-dashboard for their personal metrics.
@app.get("/analytics/dashboard", response_model=schemas.DashboardMetrics)
def read_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    # Now add a quick role check right here:
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view global analytics data.")
    
    try:
        return crud.get_dashboard_metrics(db)
    except Exception as e:
        import traceback
        import sys
        print(f"DASHBOARD ERROR: {traceback.format_exc()}", file=sys.stderr)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/my-dashboard", response_model=schemas.UserDashboardMetrics)
def read_user_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    try:
        return crud.get_user_dashboard_metrics(db, current_user.id)
    except Exception as e:
        import traceback
        import sys
        print(f"USER DASHBOARD ERROR: {traceback.format_exc()}", file=sys.stderr)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/active-users")
def get_active_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # Query task events for today/yesterday that indicate an active 'clocked in' session
    # Hours spent = 0 indicates that the timesheet was started but not finalized/clocked out
    query = db.query(models.TaskEvent).join(models.User)
    query = query.filter(func.date(models.TaskEvent.event_date) >= yesterday)
    query = query.filter(
        (models.TaskEvent.hours_spent == 0) | 
        (models.TaskEvent.hours_spent == None)
    )
    
    # Role-based visibility
    is_admin_or_finance = current_user.role.lower() == 'admin' or current_user.has_financial_access
    
    if not is_admin_or_finance:
        # Check if they are a manager of anyone
        direct_reports = db.query(models.User.id).filter(models.User.manager_id == current_user.id).all()
        direct_report_ids = [r[0] for r in direct_reports]
        
        if len(direct_report_ids) > 0:
            # Manager sees themselves + team
            allowed_ids = direct_report_ids + [current_user.id]
            query = query.filter(models.TaskEvent.user_id.in_(allowed_ids))
        else:
            # Standard user sees themselves
            query = query.filter(models.TaskEvent.user_id == current_user.id)
            
    events = query.all()
    
    # Check fallback for users who are merely "online" via WebSocket but not clocked into a specific task
    # To keep this strictly related to timesheets and locations, we stick to Task Events.
    # We can also add online users without an event.
    active_user_ids = [e.user_id for e in events]
    
    # Format the event details
    result = []
    
    for ev in events:
        desc = "Unknown"
        tid = ev.task_id if ev.task_id else (f"m-{ev.milestone_id}" if ev.milestone_id else "None")
        
        if ev.task:
            b_desc = ev.task.description
            p_name = ev.task.project.name if getattr(ev.task, 'project', None) else ""
            c_name = ev.task.project.customer.name if getattr(ev.task, 'project', None) and getattr(ev.task.project, 'customer', None) else ""
            prefix = f"{c_name} - {p_name}" if c_name else p_name
            desc = f"{prefix} - {b_desc}" if prefix else b_desc
        elif ev.milestone:
            b_desc = ev.milestone.name
            p_name = ev.milestone.project.name if getattr(ev.milestone, 'project', None) else ""
            c_name = ev.milestone.project.customer.name if getattr(ev.milestone, 'project', None) and getattr(ev.milestone.project, 'customer', None) else ""
            prefix = f"{c_name} - {p_name}" if c_name else p_name
            desc = f"{prefix} - {b_desc}" if prefix else b_desc

        result.append({
            "user_id": ev.user.id,
            "username": ev.user.username,
            "first_name": ev.user.first_name,
            "last_name": ev.user.last_name,
            "location": ev.work_location,
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "task_id": tid,
            "task_description": desc,
            "start_time": ev.start_time.strftime("%H:%M") if hasattr(ev.start_time, 'strftime') else ev.start_time,
            "event_date": str(ev.event_date),
            "status": "Clocked In"
        })
        
    return result

# --- System Logs Endpoints ---
@app.get("/system/logs/email")
def read_email_logs(current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    log_file = "backups/invoices_email_log.txt"
    if not os.path.exists(log_file):
        return []
        
    logs = []
    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
            for line in reversed(lines):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("[") and "]" in line:
                    idx = line.find("]")
                    timestamp_part = line[1:idx]
                    message_part = line[idx+1:].strip()
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(timestamp_part)
                        formatted_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        formatted_time = timestamp_part
                    logs.append({"timestamp": formatted_time, "message": message_part})
                else:
                    logs.append({"timestamp": "Unknown", "message": line})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return logs

import urllib.request
import urllib.parse
import json

@app.get("/system/geocode")
def proxy_geocode(address: str, current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(address)}&limit=1"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'PACE-Timesheet-App/1.0',
            'Accept': 'application/json'
        })
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Geocoding service unavailable or refused request.")

# --- User/Customer Endpoints ---
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    if user.email:
        db_email = db.query(models.User).filter(models.User.email == user.email).first()
        if db_email:
            raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user, current_user=current_user)

@app.get("/users/me", response_model=schemas.User)
def read_user_me(current_user: models.User = Depends(dependencies.get_current_active_user)):
    return current_user

class HomeGPSUpdate(BaseModel):
    home_latitude: float
    home_longitude: float

@app.put("/users/me/home_gps", response_model=schemas.User)
def update_my_home_gps(payload: HomeGPSUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.home_latitude = payload.home_latitude
    db_user.home_longitude = payload.home_longitude
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_user = crud.update_user(db, user_id=user_id, user=user, current_user=current_user)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# SECURITY FIX: Added authentication requirement
# Old: @app.delete("/users/{user_id}") had no auth — anyone could delete users
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        success = crud.delete_user(db, user_id=user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 500000, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    users = crud.get_users(db, skip=skip, limit=limit)
    if not getattr(current_user, 'has_financial_access', False) and getattr(current_user, 'role', '') != 'admin':
        for u in users:
            u.hourly_billing_rate = None
            u.internal_cost_rate = None
    return users

@app.post("/users/import")
async def import_users(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    # Check Admin
    if current_user.role != 'admin':
         raise HTTPException(status_code=403, detail="Not authorized")
    
    import csv
    import io

    content = await file.read()
    decoded = ""
    try:
        decoded = content.decode('utf-8-sig') # Handle BOM
    except UnicodeDecodeError:
        decoded = content.decode('latin-1')
        
    # Sniff dialect if possible, default to comma
    import csv
    try:
        dialect = csv.Sniffer().sniff(decoded[:1024])
        reader = csv.DictReader(io.StringIO(decoded), dialect=dialect)
    except:
        # Fallback
        reader = csv.DictReader(io.StringIO(decoded))
    
    # Normalize headers (strip whitespace, handle potential casing issues?)
    # We expect Title Case as per export, but let's be strict on stripping.
    if reader.fieldnames:
        reader.fieldnames = [x.strip() for x in reader.fieldnames]

    # Validate Headers
    # Allow "username" or "Username"
    headers_map = {x.lower(): x for x in reader.fieldnames or []}
    
    # We need 'username' column
    if 'username' not in headers_map:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format. Missing required column 'Username'. Found: {reader.fieldnames}")
        
    username_col = headers_map['username'] # Actual column name in CSV (e.g. "Username" or "username")

    created_count = 0
    updated_count = 0
    errors = []
    row_index = 0

    for row in reader:
        row_index += 1
        username = row.get(username_col)
        if not username:
            continue # Skip empty rows
            
        try:
            # Helper to clean strings
            def clean(val):
                if not val:
                    return None
                val = val.strip()
                return val if val else None

            # Map CSV Fields to User Data
            # Try to get fields by Title Case (standard export) or lower case fallback?
            # Let's keep it simple: Expect Standard Export Headers, but tolerate case for others if we wanted.
            # But we only mapped username so far.
            
            user_data = {
                "username": clean(username),
                "email": clean(row.get("Email") or row.get("email")),
                "first_name": clean(row.get("First Name") or row.get("first_name")),
                "last_name": clean(row.get("Last Name") or row.get("last_name")),
                "phone": clean(row.get("Phone") or row.get("phone")),
                "role": (clean(row.get("Role") or row.get("role")) or "user").lower(),
                "title": clean(row.get("Title") or row.get("title")),
                "department": clean(row.get("Department") or row.get("department")),
                "region": clean(row.get("Region") or row.get("region")),
                "is_active": True, 
                "is_employee": (clean(row.get("Employee") or row.get("employee")) or "") == "Yes",
                "has_financial_access": (clean(row.get("Financial Access") or row.get("Fin Access") or row.get("Fin?")) or "") == "Yes",
                "locked_out": (clean(row.get("Locked Out") or row.get("Lock?")) or "") == "Yes"
            }
            
            # Parse Date logic
            start_date_str = clean(row.get("Start Date") or row.get("start date"))
            if start_date_str and start_date_str != "-":
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                    try:
                        user_data["start_date"] = datetime.strptime(start_date_str, fmt)
                        break
                    except ValueError:
                        continue
                if "start_date" not in user_data:
                    # Log error or warning? For now we just skip setting it.
                    # But maybe helpful to include in errors list as warning.
                    # errors.append(f"Row {row_index}: Could not parse date '{start_date_str}'")
                    pass
            
            # Relations
            # Manager (Username lookup)
            manager_username = row.get("Manager") or row.get("manager")
            if manager_username and manager_username != "-":
                mgr = crud.get_user_by_username(db, manager_username)
                if mgr:
                    user_data["manager_id"] = mgr.id
            
            # Customer (Name lookup)
            customer_name = row.get("Customer") or row.get("customer")
            if customer_name and customer_name != "-":
                cust = db.query(models.Customer).filter(models.Customer.name == customer_name).first()
                if cust:
                    user_data["customer_id"] = cust.id

            # Location (Name lookup)
            location_name = row.get("Location") or row.get("location")
            if location_name and location_name != "-":
                loc = db.query(models.Location).filter(models.Location.name == location_name).first()
                if loc:
                    user_data["location_id"] = loc.id

            # Upsert
            existing_user = crud.get_user_by_username(db, username)
            
            if existing_user:
                # Update
                # Only update fields that are present/changed? 
                # For import, we usually overwrite.
                for k, v in user_data.items():
                    setattr(existing_user, k, v)
                existing_user.updated_by_id = current_user.id
                updated_count += 1
            else:
                # Create
                # Default password
                hashed_pw = auth.get_password_hash("Welcome123!")
                new_user = models.User(
                    **user_data,
                    hashed_password=hashed_pw,
                    created_by_id=current_user.id,
                    updated_by_id=current_user.id
                )
                db.add(new_user)
                created_count += 1
                
        except Exception as e:
            errors.append(f"Row {row_index} ({username}): {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")
        
    return {
        "message": "Import processed",
        "created": created_count, 
        "updated": updated_count, 
        "errors": errors
    }

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not getattr(current_user, 'has_financial_access', False) and getattr(current_user, 'role', '') != 'admin':
        db_user.hourly_billing_rate = None
        db_user.internal_cost_rate = None
    return db_user

@app.get("/users/{user_id}/offboard-stats")
def get_offboard_stats(user_id: int, db: Session = Depends(get_db)):
    try:
        active_projects_pm = db.query(models.Project).filter(models.Project.pm_id == user_id, models.Project.status.notin_(['completed', 'archived'])).count()
        active_projects_cpm = db.query(models.Project).filter(models.Project.customer_pm_id == user_id, models.Project.status.notin_(['completed', 'archived'])).count()
        
        active_tasks = db.query(models.Task).filter(models.Task.assigned_to_id == user_id, models.Task.status.in_([models.TaskStatus.OPEN, models.TaskStatus.IN_PROGRESS])).count()
        
        active_milestones = db.query(models.Milestone).filter(models.Milestone.owner_id == user_id, models.Milestone.is_completed == False).count()
        
        active_leads_poc = db.query(models.Lead).filter(models.Lead.poc_id == user_id, models.Lead.status.in_([models.LeadStatus.NEW, models.LeadStatus.CONTACTED, models.LeadStatus.QUALIFIED])).count()
        active_leads_c = db.query(models.Lead).filter(models.Lead.customer_contact_id == user_id, models.Lead.status.in_([models.LeadStatus.NEW, models.LeadStatus.CONTACTED, models.LeadStatus.QUALIFIED])).count()
        
        pending_ptos_mgr = db.query(models.PTORequest).filter(models.PTORequest.manager_id == user_id, models.PTORequest.status == models.PTOStatus.PENDING).count()
        pending_ptos_fin = db.query(models.PTORequest).filter(models.PTORequest.finance_id == user_id, models.PTORequest.status == models.PTOStatus.MANAGER_APPROVED).count()
        
        return {
            "active_projects": active_projects_pm + active_projects_cpm,
            "active_tasks": active_tasks,
            "active_milestones": active_milestones,
            "active_leads": active_leads_poc + active_leads_c,
            "pending_ptos": pending_ptos_mgr + pending_ptos_fin
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/offboard")
def offboard_user(user_id: int, request: schemas.OffboardRequest, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    source_user = crud.get_user(db, user_id=user_id)
    target_user = crud.get_user(db, user_id=request.target_user_id)
    
    if not source_user:
        raise HTTPException(status_code=404, detail="Source user not found")
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    if not target_user.is_active or target_user.locked_out:
        raise HTTPException(status_code=400, detail="Target user is not active")

    try:
        if request.transfer_projects:
            db.query(models.Project).filter(models.Project.pm_id == source_user.id, models.Project.status.notin_([models.ProjectStatus.COMPLETED, models.ProjectStatus.ARCHIVED])).update({"pm_id": target_user.id}, synchronize_session=False)
            db.query(models.Project).filter(models.Project.customer_pm_id == source_user.id, models.Project.status.notin_([models.ProjectStatus.COMPLETED, models.ProjectStatus.ARCHIVED])).update({"customer_pm_id": target_user.id}, synchronize_session=False)

        if request.transfer_tasks:
            db.query(models.Task).filter(models.Task.assigned_to_id == source_user.id, models.Task.status.in_([models.TaskStatus.OPEN, models.TaskStatus.IN_PROGRESS])).update({"assigned_to_id": target_user.id}, synchronize_session=False)

        if request.transfer_milestones:
            db.query(models.Milestone).filter(models.Milestone.owner_id == source_user.id, models.Milestone.is_completed == False).update({"owner_id": target_user.id}, synchronize_session=False)
            
        if request.transfer_leads:
            db.query(models.Lead).filter(models.Lead.poc_id == source_user.id, models.Lead.status.in_([models.LeadStatus.NEW, models.LeadStatus.CONTACTED, models.LeadStatus.QUALIFIED])).update({"poc_id": target_user.id}, synchronize_session=False)
            db.query(models.Lead).filter(models.Lead.customer_contact_id == source_user.id, models.Lead.status.in_([models.LeadStatus.NEW, models.LeadStatus.CONTACTED, models.LeadStatus.QUALIFIED])).update({"customer_contact_id": target_user.id}, synchronize_session=False)

        if request.transfer_pto_approvals:
            db.query(models.PTORequest).filter(models.PTORequest.manager_id == source_user.id, models.PTORequest.status == models.PTOStatus.PENDING).update({"manager_id": target_user.id}, synchronize_session=False)
            db.query(models.PTORequest).filter(models.PTORequest.finance_id == source_user.id, models.PTORequest.status == models.PTOStatus.MANAGER_APPROVED).update({"finance_id": target_user.id}, synchronize_session=False)

        if request.deactivate_user:
            source_user.is_active = False
            source_user.locked_out = True
            
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "User successfully offboarded"}

@app.get("/customers/", response_model=List[schemas.Customer])
def read_customers(skip: int = 0, limit: int = 500000, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip=skip, limit=limit)

@app.get("/customers/{customer_id}", response_model=schemas.Customer)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    db_cust = crud.get_customer(db, customer_id=customer_id)
    if db_cust is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_cust

@app.post("/customers/", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.create_customer(db=db, customer=customer, current_user=current_user)

@app.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, customer: schemas.CustomerUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_cust = crud.update_customer(db, customer_id=customer_id, customer=customer, current_user=current_user)
    if not db_cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_cust

# # SECURITY FIX: Added authentication — old version had no auth
@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        success = crud.delete_customer(db, customer_id=customer_id)
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Customer deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Location Endpoints ---
@app.get("/locations/", response_model=List[schemas.Location])
def read_locations(customer_id: Optional[int] = None, skip: int = 0, limit: int = 500000, db: Session = Depends(get_db)):
    return crud.get_locations(db, customer_id=customer_id, skip=skip, limit=limit)

@app.post("/locations/", response_model=schemas.Location)
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.create_location(db=db, location=location, current_user=current_user)

@app.put("/locations/{location_id}", response_model=schemas.Location)
def update_location(location_id: int, location: schemas.LocationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_loc = crud.update_location(db, location_id=location_id, location=location, current_user=current_user)
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return db_loc

# Security Fix: Added authentication requirement to delete location endpoint
# def delete_location(location_id: int, db: Session = Depends(get_db)):
@app.delete("/locations/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        success = crud.delete_location(db, location_id=location_id)
        if not success:
            raise HTTPException(status_code=404, detail="Location not found")
        return {"message": "Location deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Project Endpoints ---
@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if project.project_unique_id:
        existing = db.query(models.Project).filter(models.Project.project_unique_id == project.project_unique_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Project ID already in use")
    db_proj = crud.create_project(db=db, project=project, current_user=current_user)
    
    from . import teams
    teams.send_teams_alert(
        title=f"New Project Created: {db_proj.name}",
        message=f"**{current_user.username}** has created a new project for customer '{db_proj.customer.name}'.",
        action_url=f"/portal/projects/{db_proj.id}"
    )
    return db_proj

@app.get("/projects/", response_model=List[schemas.ProjectListOut])
def read_projects(skip: int = 0, limit: int = 500000, unbilled_only: bool = False, db: Session = Depends(get_db)):
    projects = crud.get_projects(db, skip=skip, limit=limit, unbilled_only=unbilled_only)
    return projects

@app.get("/projects/summary", response_model=List[schemas.ProjectSummaryOut])
def read_projects_summary(skip: int = 0, limit: int = 50000, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    # Standard read-only project endpoint accessible to all active users.
    projects = crud.get_projects(db, skip=skip, limit=limit)
    return projects

@app.get("/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.put("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        db_project = crud.update_project(db, project_id=project_id, project=project, current_user=current_user)
        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return db_project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Security Fix: Added authentication requirement to delete project endpoint
# def delete_project(project_id: int, db: Session = Depends(get_db)):
@app.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        success = crud.delete_project(db, project_id=project_id)
        if not success:
             raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/projects/{project_id}/clone", response_model=schemas.Project)
def clone_project(project_id: int, options: schemas.ProjectCloneOptions, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_project = crud.clone_project(db, project_id=project_id, options=options, current_user=current_user)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.post("/projects/smart-clone-execute", response_model=schemas.Project)
def smart_clone_execute(request: schemas.ProjectSmartCloneExecuteRequest, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        db_project = crud.smart_clone_execute(db, payload=request, current_user=current_user)
        from . import teams
        teams.send_teams_alert(
            title=f"✨ Smart Project Created: {db_project.name}",
            message=f"**{current_user.username}** has successfully instantiated a new AI-Cloned Project.",
            action_url=f"/portal/projects/{db_project.id}"
        )
        return db_project
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/report/pdf")
def get_project_report_pdf(project_id: int, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    html_content = generate_project_report_pdf(project)
    
    from xhtml2pdf import pisa
    import io
    from fastapi.responses import StreamingResponse
    
    pdf_file = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
    
    if pisa_status.err:
         raise HTTPException(status_code=500, detail="Error generating project report PDF")
         
    pdf_file.seek(0)
    
    safe_name = "".join(c for c in project.name if c.isalnum() or c in ('-', '_', ' '))
    proj_id_part = f"{project.project_unique_id}_" if project.project_unique_id else ""
    filename = f"Project_Report_{proj_id_part}{safe_name.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        pdf_file, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/projects/{project_id}/upload-po")
async def upload_project_po(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.jpg', '.jpeg', '.png']:
        raise HTTPException(status_code=400, detail="Only PDF and image files are allowed.")

    filename = f"po_{project_id}_{int(datetime.utcnow().timestamp())}.pdf" # Force PDF extension or keep original? Assuming PDF for now or allowing any.
    file_path = f"app/static/uploads/{filename}"
    
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB
    # Store relative path for frontend access
    relative_path = f"/static/uploads/{filename}"
    project.po_file_path = relative_path
    db.commit()
    
    return {"filename": filename, "path": relative_path}

@app.post("/projects/{project_id}/attachments", response_model=schemas.ProjectAttachment)
async def create_project_attachment(
    project_id: int, 
    file: UploadFile = File(...), 
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clean_filename = os.path.basename(file.filename)
    ext = os.path.splitext(clean_filename)[1].lower()
    if ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip']:
        raise HTTPException(status_code=400, detail="File type not allowed.")

    filename = f"po_att_{project_id}_{int(datetime.utcnow().timestamp())}_{clean_filename}"
    
    start_time = time.time()
    try:
        # Upload to GCS
        storage_client = storage.Client()
        bucket_name = getattr(settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"projects/{project_id}/{filename}")
        
        file.file.seek(0)
        blob.upload_from_file(file.file, content_type=file.content_type)
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"GCS: operation=upload, filename={filename}, success=True, duration_ms={duration_ms:.2f}")
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"GCS: operation=upload, filename={filename}, success=False, duration_ms={duration_ms:.2f} | Error: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment to storage: {str(e)}")
    
    attachment = models.ProjectAttachment(
        project_id=project_id,
        filename=clean_filename,
        file_path=blob.name,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment



@app.delete("/projects/attachments/{attachment_id}")
def delete_project_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    att = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    db.delete(att)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Attachment deleted"}

@app.get("/projects/attachments/{attachment_id}/download")
def download_project_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    start_time = time.time()
    try:
        storage_client = storage.Client()
        bucket_name = getattr(settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        
        file_bytes = blob.download_as_bytes()
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"GCS: operation=download, filename={attachment.file_path}, success=True, duration_ms={duration_ms:.2f}")
        
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={attachment.filename}"}
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"GCS: operation=download, filename={attachment.file_path}, success=False, duration_ms={duration_ms:.2f} | Error: {str(e)}"
        )
        raise HTTPException(status_code=404, detail=f"File not found on cloud storage: {str(e)}")


# --- Invoice Endpoints ---
@app.post("/invoices/", response_model=schemas.Invoice)
def create_invoice(invoice: schemas.InvoiceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.create_invoice(db=db, invoice=invoice, current_user=current_user)

@app.get("/invoices/", response_model=List[schemas.Invoice])
def read_invoices(skip: int = 0, limit: int = 500000, db: Session = Depends(get_db)):
    invoices = crud.get_invoices(db, skip=skip, limit=limit)
    return invoices

@app.get("/invoices/{invoice_id}", response_model=schemas.Invoice)
def read_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.post("/invoices/generate", response_model=schemas.Invoice)
def generate_invoice(data: schemas.InvoiceGenerate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.generate_invoice_from_milestones(db=db, data=data, current_user=current_user)

# Security Fix: Added authentication requirement to delete invoice endpoint
# def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):

    try:
        crud.delete_invoice(db, invoice_id=invoice_id)
        return {"message": "Invoice deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/invoices/{invoice_id}/sync")
def sync_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        xero_id = xero.sync_invoice_to_xero(invoice, db)
        if xero_id:
            invoice.xero_id = xero_id
            db.commit()
            return {"message": f"Synced Invoice {invoice.invoice_number} to Xero", "xero_id": xero_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to get invoice ID from Xero")
    except Exception as e:
        print(f"Sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/invoices/{invoice_id}/refresh")
def refresh_invoice_from_xero(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=invoice_id)
    if not invoice or not invoice.xero_id:
        raise HTTPException(status_code=400, detail="Invoice not found or not synced to Xero")
    
    xero_data = xero.get_invoice_from_xero(invoice.xero_id, db)
    if not xero_data:
        raise HTTPException(status_code=404, detail="Invoice not found in Xero")
        
    # Update local values based on Xero
    new_xero_paid = xero_data.get('AmountPaid', 0.0)
    
    # If Xero thinks it's paid more than we have in our local ledger, add a sync ledger
    current_ledger_sum = sum(p.amount for p in invoice.payments)
    if new_xero_paid > current_ledger_sum:
        diff = new_xero_paid - current_ledger_sum
        sync_payment = models.InvoicePayment(
            invoice_id=invoice.id,
            amount=diff,
            payment_date=datetime.utcnow(),
            payment_method="Xero Auto-Sync",
            notes="Pulled natively from Xero Webhooks",
            created_by_id=invoice.updated_by_id,
            updated_by_id=invoice.updated_by_id
        )
        db.add(sync_payment)
        
    crud.recalculate_invoice_amount_paid(db, invoice.id)
    db.refresh(invoice)
    
    x_status = xero_data.get('Status')
    if x_status == 'PAID':
        invoice.status = models.InvoiceStatus.PAID
    elif x_status == 'VOIDED' or x_status == 'DELETED':
        invoice.status = models.InvoiceStatus.VOID
    elif x_status == 'AUTHORISED':
        # If it's authorised but has payments, maybe partial?
        invoice.status = models.InvoiceStatus.SENT
        
    db.commit()
    return {"message": f"Invoice {invoice.invoice_number} refreshed", "amount_paid": invoice.amount_paid, "status": invoice.status}

@app.post("/invoices/{invoice_id}/payments")
def record_invoice_payment(invoice_id: int, payment: schemas.XeroPaymentPush, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    invoice = crud.get_invoice(db, invoice_id=invoice_id)
    if not invoice or not invoice.xero_id:
        raise HTTPException(status_code=400, detail="Invoice not found or not synced to Xero.")
        
    try:
        xero.push_payment_to_xero(
            invoice_xero_id=invoice.xero_id,
            amount=payment.amount,
            date_str=payment.date,
            account_code=payment.account_code,
            reference=payment.reference,
            db=db
        )
        # Pull latest status natively from Xero immediately (which will now auto-spawn a ledger entry)
        return refresh_invoice_from_xero(invoice_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/invoices/{invoice_id}/payments/", response_model=schemas.InvoicePayment)
def create_local_invoice_payment(invoice_id: int, payment: schemas.InvoicePaymentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return crud.create_invoice_payment(db=db, payment=payment, invoice_id=invoice_id, current_user=current_user)

@app.get("/xero/api/bank-accounts")
def fetch_xero_bank_accounts(db: Session = Depends(get_db)):
    try:
        return xero.get_bank_accounts(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/financial")
def report_financial(db: Session = Depends(get_db)):
    # Calculate Total Revenue, Outstanding, Overdue
    total_revenue = db.query(func.sum(models.LineItem.amount)).join(models.Invoice).filter(models.Invoice.status == models.InvoiceStatus.PAID).scalar() or 0.0
    outstanding = db.query(func.sum(models.LineItem.amount)).join(models.Invoice).filter(models.Invoice.status == models.InvoiceStatus.SENT).scalar() or 0.0
    
    return {
        "revenue": total_revenue,
        "outstanding": outstanding,
        "overdue": 0.0 # TODO: Calculate overdue
    }

@app.get("/reports/leads")
def report_leads(db: Session = Depends(get_db)):
    total_leads = db.query(models.Lead).count()
    converted = db.query(models.Lead).filter(models.Lead.status == models.LeadStatus.CONVERTED).count()
    pipeline_value = db.query(func.sum(models.Lead.estimated_value)).filter(models.Lead.status.notin_([models.LeadStatus.CONVERTED, models.LeadStatus.LOST])).scalar() or 0.0
    
    # Status Breakdown
    status_counts = db.query(models.Lead.status, func.count(models.Lead.id)).group_by(models.Lead.status).all()
    
    # Safe handler for enum values vs strings
    breakdown = {}
    for s, c in status_counts:
        key = s.value if hasattr(s, 'value') else str(s)
        breakdown[key] = c
    
    return {
        "total_leads": total_leads,
        "converted_leads": converted,
        "conversion_rate": (converted / total_leads * 100) if total_leads > 0 else 0,
        "pipeline_value": pipeline_value,
        "leads_by_status": breakdown
    }

@app.get("/invoices/{invoice_id}/pdf")
def get_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.project:
        raise HTTPException(status_code=400, detail="Invoice is not associated with a project")
    if not invoice.project.customer:
        raise HTTPException(status_code=400, detail="Invoice project is not associated with a customer")
        
    pdf_bytes = generate_invoice_pdf(invoice, invoice.project.customer, invoice.project, invoice.items)
    
    if not pdf_bytes:
         raise HTTPException(status_code=500, detail="Could not generate PDF")
    
    # Auto-update status to SENT if draft
    if invoice.status == models.InvoiceStatus.DRAFT:
        invoice.status = models.InvoiceStatus.SENT
        db.commit()

    raw_inv = invoice.invoice_number[2:] if invoice.invoice_number.startswith("I-") else invoice.invoice_number
    safe_inv = "".join(c for c in raw_inv if c.isalnum() or c in ('-', '_'))
    
    raw_proj = invoice.project.project_unique_id if invoice.project.project_unique_id else "UNKNOWN"
    raw_proj = raw_proj[2:] if raw_proj.startswith("P-") else raw_proj
    safe_proj = "".join(c for c in raw_proj if c.isalnum() or c in ('-', '_'))
    
    filename = f"INV_P-{safe_proj}_I-{safe_inv}.pdf"

    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

def email_new_lead_to_sales(lead_id: int):
    # Need new session for background task
    db = SessionLocal()
    try:
        lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
        if not lead:
            return
            
        html_content = generate_lead_pdf(lead)
        pdf_file = io.BytesIO()
        pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
        
        if not pisa_status.err:
            pdf_bytes = pdf_file.getvalue()
            safe_name = "".join(c for c in lead.name if c.isalnum() or c in ('-', '_', ' '))
            filename = f"New_Lead_{safe_name}.pdf"
            
            # Send Email
            success, msg = send_invoice_email(
                to_emails=["sales@triadsys.com"],
                subject=f"New Lead Created: {lead.name}",
                text_body=f"A new lead '{lead.name}' has been created in the system by {lead.poc.username if lead.poc else 'a user'}.\n\nPlease find the lead details attached as a PDF snapshot document.",
                pdf_bytes=pdf_bytes,
                filename=filename,
                sender_name="Lead System"
            )
            print(f"Lead Email to Sales: {success} - {msg}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Failed to email new lead to sales: {str(e)}")
    finally:
        db.close()

# --- Lead Endpoints ---
@app.post("/leads/", response_model=schemas.Lead)
def create_lead(lead: schemas.LeadCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    new_lead = crud.create_lead(db=db, lead=lead, current_user=current_user)
    # Fire off background email process
    background_tasks.add_task(email_new_lead_to_sales, new_lead.id)
    
    from . import teams
    cust_name = ""
    if new_lead.customer_id:
        cust = db.query(models.Customer).filter(models.Customer.id == new_lead.customer_id).first()
        cust_name = cust.name if cust else ""
    
    teams.send_teams_alert(
        title=f"New Lead Created: {new_lead.name}",
        message=f"**{current_user.username}** has created a new lead{' for customer ' + cust_name if cust_name else ''}. Estimated Value: ${new_lead.estimated_value or 0:,.2f}",
        action_url=f"/portal/leads/edit/{new_lead.id}"
    )
    return new_lead

@app.get("/leads/", response_model=List[schemas.LeadListOut])
def read_leads(skip: int = 0, limit: int = 500000, db: Session = Depends(get_db)):
    leads = crud.get_leads(db, skip=skip, limit=limit)
    return leads

@app.put("/leads/bulk", response_model=List[schemas.Lead])
def update_leads_bulk(leads: List[schemas.LeadBulkUpdate], db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.update_leads_bulk(db=db, leads=leads, current_user=current_user)

@app.put("/leads/{lead_id}", response_model=schemas.Lead)
def update_lead(lead_id: int, lead: schemas.LeadCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    was_clone = db_lead and "(Clone)" in db_lead.name

    updated_lead = crud.update_lead(db, lead_id=lead_id, lead=lead, current_user=current_user)
    if not updated_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if was_clone and "(Clone)" not in updated_lead.name:
        background_tasks.add_task(email_new_lead_to_sales, updated_lead.id)

    return updated_lead

# SECURITY FIX: Added authentication requirement to delete lead endpoint
# def delete_lead(lead_id: int, db: Session = Depends(get_db)):
@app.delete("/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):

    try:
        success = crud.delete_lead(db, lead_id=lead_id)
        if not success:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"message": "Lead deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/leads/{lead_id}/clone", response_model=schemas.Lead)
def clone_lead(lead_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    cloned_lead = crud.clone_lead(db, lead_id=lead_id, current_user=current_user)
    if not cloned_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return cloned_lead

@app.post("/leads/{lead_id}/convert-to-milestone", response_model=schemas.Milestone)
def convert_lead_to_milestone_endpoint(lead_id: int, request: schemas.LeadToMilestoneConversionRequest, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        new_milestone = crud.convert_lead_to_milestone(db=db, lead_id=lead_id, request=request, current_user=current_user)
        return new_milestone
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/invoices/{invoice_id}/items/", response_model=schemas.LineItem)
def create_invoice_item(invoice_id: int, item: schemas.LineItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return crud.create_line_item(db=db, item=item, invoice_id=invoice_id)

@app.get("/invoices/{invoice_id}/items/", response_model=List[schemas.LineItem])
def read_invoice_items(invoice_id: int, db: Session = Depends(get_db)):
    return crud.get_line_items(db, invoice_id=invoice_id)

# --- Invoice Payment Endpoints ---
@app.get("/invoices/{invoice_id}/payments/", response_model=List[schemas.InvoicePayment])
def read_invoice_payments(invoice_id: int, db: Session = Depends(get_db)):
    return crud.get_invoice_payments(db, invoice_id=invoice_id)

@app.post("/invoices/{invoice_id}/payments/", response_model=schemas.InvoicePayment)
def create_invoice_payment(invoice_id: int, payment: schemas.InvoicePaymentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return crud.create_invoice_payment(db=db, payment=payment, invoice_id=invoice_id, current_user=current_user)

@app.delete("/invoices/{invoice_id}/payments/{payment_id}")
def delete_invoice_payment(invoice_id: int, payment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    success = crud.delete_invoice_payment(db, payment_id=payment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment ledger not found")
    return {"message": "Payment deleted successfully."}

# --- Milestone Endpoints ---
@app.post("/projects/{project_id}/milestones/", response_model=schemas.Milestone)
def create_project_milestone(project_id: int, milestone: schemas.MilestoneCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_milestone(db=db, milestone=milestone, project_id=project_id, current_user=current_user)

@app.get("/projects/{project_id}/milestones/", response_model=List[schemas.Milestone])
def read_project_milestones(project_id: int, db: Session = Depends(get_db)):
    return crud.get_milestones(db, project_id=project_id)

@app.get("/milestones/", response_model=List[schemas.MilestoneListOut])
def read_all_milestones(db: Session = Depends(get_db)):
    return crud.get_all_milestones(db) 

# --- Comment Endpoints ---
@app.get("/projects/{project_id}/comments", response_model=List[schemas.Comment])
def read_comments(project_id: int, db: Session = Depends(get_db)):
    return crud.get_comments(db, project_id=project_id)

@app.post("/projects/{project_id}/comments", response_model=schemas.Comment)
def create_comment(project_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if comment.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")
    
    new_comment = crud.create_comment(db=db, comment=comment, user_id=current_user.id)
    
    from . import teams
    project = crud.get_project(db, project_id=project_id)
    if project:
        teams.send_teams_alert(
            title=f"New Comment on Project: {project.name}",
            message=f"**{current_user.username}** commented: \n\n{new_comment.content}",
            action_url=f"/portal/projects/{project.id}"
        )
        
        import re
        import asyncio
        mentions = re.findall(r'@([a-zA-Z0-9_\-\.]+)', new_comment.content)
        if mentions:
            mentioned_users = db.query(models.User).filter(models.User.username.in_(mentions)).all()
            for u in mentioned_users:
                if u.id != current_user.id:
                    db_notification = models.Notification(
                        user_id=u.id,
                        title=f"Mentioned in Project {project.name[:10]}",
                        message=f"{current_user.username} explicitly mentioned you: {new_comment.content[:50]}...",
                        link=f"/portal/projects/{project.id}"
                    )
                    db.add(db_notification)
                    db.commit()
                    db.refresh(db_notification)
                    
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            loop.create_task(manager.send_notification(
                                user_id=u.id, 
                                notification=schemas.Notification.model_validate(db_notification)
                            ))
                    except Exception as wse:
                        print(f"WS error: {wse}")
        
    return new_comment

@app.get("/tasks/{task_id}/comments", response_model=List[schemas.Comment])
def read_task_comments(task_id: int, db: Session = Depends(get_db)):
    return crud.get_task_comments(db, task_id=task_id)

@app.post("/tasks/{task_id}/comments", response_model=schemas.Comment)
def create_task_comment(task_id: int, comment: schemas.CommentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if comment.task_id != task_id:
        raise HTTPException(status_code=400, detail="Task ID mismatch")
        
    new_comment = crud.create_comment(db=db, comment=comment, user_id=current_user.id)
    
    from . import teams
    task = crud.get_task(db, task_id=task_id)
    if task:
        teams.send_teams_alert(
            title=f"New Comment on Task #{task.id}",
            message=f"**{current_user.username}** commented: \n\n{new_comment.content}",
            action_url=f"/portal/tasks/{task.id}"
        )

        import re
        
        # Target list
        notify_user_ids = set()
        
        # 1. Provide update to Assignee if they didn't write it
        if task.assigned_to_id and task.assigned_to_id != current_user.id:
            notify_user_ids.add(task.assigned_to_id)
            
        # 2. Add any @mentions to the notification dispatch list
        mentions = re.findall(r'@([a-zA-Z0-9_\-\.]+)', new_comment.content)
        if mentions:
            mentioned_users = db.query(models.User).filter(models.User.username.in_(mentions)).all()
            for u in mentioned_users:
                if u.id != current_user.id:
                    notify_user_ids.add(u.id)
                    
        # Broadcast Notification
        for uid in notify_user_ids:
            title_text = "Task Mention" if (uid != task.assigned_to_id) else "New Task Comment"
            
            db_notification = models.Notification(
                user_id=uid,
                title=title_text,
                message=f"{current_user.username}: {new_comment.content[:50]}...",
                link=f"/portal/tasks/{task.id}"
            )
            db.add(db_notification)
            db.commit()
            db.refresh(db_notification)
            
            background_tasks.add_task(
                manager.send_notification,
                user_id=uid,
                notification=schemas.Notification.model_validate(db_notification)
            )

    return new_comment

@app.put("/milestones/{milestone_id}", response_model=schemas.Milestone)
def update_milestone(milestone_id: int, milestone: schemas.MilestoneUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        updated = crud.update_milestone(db, milestone_id, milestone, current_user=current_user)
        if not updated:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# SECURITY FIX: Added authentication requirement to delete milestone endpoint
# def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
@app.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):

    try:
        success = crud.delete_milestone(db, milestone_id)
        if not success:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return {"message": "Milestone deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/milestones/{milestone_id}/clone", response_model=schemas.Milestone)
def clone_milestone(milestone_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    cloned_milestone = crud.clone_milestone(db, milestone_id, current_user)
    if not cloned_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return cloned_milestone

@app.put("/line-items/{item_id}", response_model=schemas.LineItem)
def update_line_item(item_id: int, item: schemas.LineItemUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    updated = crud.update_line_item(db, item_id, item)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

# SECURITY FIX: Added authentication requirement to delete line item endpoint
# def delete_line_item(item_id: int, db: Session = Depends(get_db)):
@app.delete("/line-items/{item_id}")
def delete_line_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):

    success = crud.delete_line_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# --- Xero Integration ---
from . import xero
from fastapi import Request
import hmac
import hashlib
import base64
# settings imported at top

@app.post("/xero/webhook")
async def xero_webhook(request: Request, db: Session = Depends(get_db)):
    key = getattr(settings, 'xero_webhook_key', None)
    if not key:
        print("Xero webhook key not configured")
        return Response(status_code=401)
        
    payload = await request.body()
    signature_header = request.headers.get('x-xero-signature')
    
    # Calculate HMAC
    hashed = hmac.new(key.encode('utf-8'), payload, hashlib.sha256).digest()
    expected_signature = base64.b64encode(hashed).decode('utf-8')
    
    if not signature_header or signature_header != expected_signature:
        crud.log_xero_interaction(db, endpoint="Webhook", entity_type="Verification", status="ERROR", details=f"Signature mismatch. Expected {expected_signature}, got {signature_header}")
        print(f"Xero webhook signature mismatch. Expected {expected_signature}, got {signature_header}")
        return Response(status_code=401)
        
    try:
        data = await request.json()
        crud.log_xero_interaction(db, endpoint="Webhook", entity_type="Payload", status="SUCCESS", details=str(data))
        events = data.get('events', [])
        for event in events:
            if event['eventCategory'] == 'INVOICE' and event['eventType'] == 'UPDATE':
                xero_invoice_id = event['resourceId']
                inv = db.query(models.Invoice).filter(models.Invoice.xero_id == xero_invoice_id).first()
                if inv:
                    print(f"Webhook update for {inv.invoice_number}. Fetching details...")
                    xero_data = xero.get_invoice_from_xero(xero_invoice_id, db)
                    if xero_data:
                        inv.amount_paid = xero_data.get('AmountPaid', 0.0)
                        x_status = xero_data.get('Status')
                        if x_status == 'PAID':
                            inv.status = models.InvoiceStatus.PAID
                        elif x_status in ['VOIDED', 'DELETED']:
                            inv.status = models.InvoiceStatus.VOID
                        elif x_status == 'AUTHORISED':
                            inv.status = models.InvoiceStatus.SENT
                        db.commit()
                        print(f"Updated {inv.invoice_number} to {inv.status}, paid: {inv.amount_paid}")
        return Response(status_code=200)
    except Exception as e:
        crud.log_xero_interaction(db, endpoint="Webhook", entity_type="Runtime", status="ERROR", details=str(e))
        print(f"Xero webhook processing error: {e}")
        return Response(status_code=500)

@app.get("/xero/logs")
def get_xero_logs(skip: int = 0, limit: int = 500000, db: Session = Depends(get_db)):
    logs = crud.get_xero_logs(db, skip=skip, limit=limit)
    out = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "timestamp": log.timestamp,
            "endpoint": log.endpoint,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "status": log.status,
            "details": log.details,
            "invoice_number": None
        }
        if log.entity_type == "Invoice" and log.entity_id:
            inv = db.query(models.Invoice).filter(models.Invoice.id == log.entity_id).first()
            if inv:
                log_dict["invoice_number"] = inv.invoice_number
        out.append(log_dict)
    return out

@app.get("/xero/logs/download")
def download_xero_logs(db: Session = Depends(get_db)):
    import os
    logs = crud.get_xero_logs(db, limit=10000)
    
    os.makedirs('tmp', exist_ok=True)
    filepath = 'tmp/xero_sync_logs.txt'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("XERO SYNCHRONIZATION AUDIT LOG\n")
        f.write("="*60 + "\n\n")
        
        for log in logs:
            ts = log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else 'UNKNOWN TIME'
            
            invoice_str = ""
            if log.entity_type == "Invoice" and log.entity_id:
                inv = db.query(models.Invoice).filter(models.Invoice.id == log.entity_id).first()
                if inv:
                    invoice_str = f" - Invoice #{inv.invoice_number}"
            
            f.write(f"[{ts}] [{log.endpoint}] [{log.status}] Entity: {log.entity_type} {log.entity_id or ''}{invoice_str}\n")
            f.write("Details:\n")
            f.write(f"{log.details or 'No details provided.'}\n")
            f.write("-" * 60 + "\n\n")
            
    return FileResponse(filepath, media_type='text/plain', filename='xero_sync_logs.txt')

# --- Email Logs Endpoints ---
@app.get("/emails/logs", response_model=List[schemas.EmailLog])
def list_email_logs(
    skip: int = 0,
    limit: int = 500000,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db)):
    return crud.get_email_logs(db, skip=skip, limit=limit, entity_type=entity_type, entity_id=entity_id)

@app.get("/emails/logs/download")
def download_email_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db)):
    logs = crud.get_email_logs(db, skip=0, limit=10000, entity_type=entity_type, entity_id=entity_id)
    
    import tempfile, os
    from fastapi.responses import FileResponse
    
    fd, filepath = tempfile.mkstemp(suffix=".txt")
    with os.fdopen(fd, 'w') as f:
        f.write("=== EMAIL AUDIT LOG ===\n\n")
        for log in logs:
            ts = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            username = log.created_by.username if log.created_by else "System"
            f.write(f"[{ts}] [{log.status}] Entity: {log.entity_type} {log.entity_id or ''} - Sent By: {username}\n")
            f.write(f"Recipients: {log.recipients}\n")
            f.write(f"Subject: {log.subject}\n")
            f.write("Details:\n")
            f.write(f"{log.details or 'No details provided.'}\n")
            f.write("-" * 60 + "\n\n")
            
    return FileResponse(filepath, media_type='text/plain', filename='email_audit_logs.txt')

class EmailRequest(BaseModel):
    to_emails: List[str]
    subject: str
    message: str

@app.post("/invoices/{id}/send")
async def send_invoice(id: int, email_request: EmailRequest, current_user: schemas.User = Depends(dependencies.get_current_active_user), db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.project:
        raise HTTPException(status_code=400, detail="Invoice is not associated with a project")
    if not invoice.project.customer:
        raise HTTPException(status_code=400, detail="Invoice project is not associated with a customer")

    # Generate PDF
    html_content = generate_invoice_pdf(invoice, invoice.project.customer, invoice.project, invoice.items)
    
    from xhtml2pdf import pisa
    
    # Generate PDF directly to file to avoid BytesIO issues in server env
    import tempfile
    import os
    
    # Create temp file
    fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    try:
        with open(temp_pdf_path, "wb") as pdf_file_handle:
            pisa_status = pisa.CreatePDF(html_content, dest=pdf_file_handle)
        
        if pisa_status.err:
             raise HTTPException(status_code=500, detail="Error generating PDF")

        # Read back bytes
        with open(temp_pdf_path, "rb") as f_read:
            pdf_bytes = f_read.read()
            
    finally:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

    # Sanitize filename
    raw_inv = invoice.invoice_number[2:] if invoice.invoice_number.startswith("I-") else invoice.invoice_number
    safe_inv = "".join(c for c in raw_inv if c.isalnum() or c in ('-', '_'))
    
    raw_proj = invoice.project.project_unique_id if invoice.project.project_unique_id else "UNKNOWN"
    raw_proj = raw_proj[2:] if raw_proj.startswith("P-") else raw_proj
    safe_proj = "".join(c for c in raw_proj if c.isalnum() or c in ('-', '_'))
    
    filename = f"INV_P-{safe_proj}_I-{safe_inv}.pdf"

    # Determine CCs
    cc_list = ["sales@triadsys.com"]
    if current_user.email and current_user.email not in cc_list:
        cc_list.append(current_user.email)

    # Send Email
    success, msg = send_invoice_email(
        to_emails=email_request.to_emails,
        subject=email_request.subject,
        text_body=email_request.message,
        pdf_bytes=pdf_bytes,
        filename=filename,
        cc_emails=cc_list,
        sender_name=f"{current_user.first_name} {current_user.last_name}" if current_user.first_name else current_user.username
    )
    
    # Log the transmission
    crud.log_email(db, schemas.EmailLogCreate(
        entity_type="Invoice",
        entity_id=invoice.id,
        recipients=", ".join(email_request.to_emails) + (" CC: " + ", ".join(cc_list) if cc_list else ""),
        subject=email_request.subject,
        status="SUCCESS" if success else "ERROR",
        details=msg if not success else "Email delivered directly via SMTP proxy.",
        created_by_id=current_user.id
    ))
    
    if not success:
        raise HTTPException(status_code=500, detail=msg)
        
    # Update Status to SENT if it was DRAFT
    if invoice.status == models.InvoiceStatus.DRAFT:
        invoice.status = models.InvoiceStatus.SENT
        db.commit()
        
    return {"message": "Email sent successfully"}
        



# --- PDF Download Endpoint (Fix) ---
from fastapi.responses import StreamingResponse
import io

@app.get("/invoices/{id}/download-pdf")
def get_invoice_pdf_download(id: int, db: Session = Depends(get_db)):
    invoice = crud.get_invoice(db, invoice_id=id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.project:
        raise HTTPException(status_code=400, detail="Invoice is not associated with a project")
    if not invoice.project.customer:
        raise HTTPException(status_code=400, detail="Invoice project is not associated with a customer")

    # Generate PDF HTML
    html_content = generate_invoice_pdf(invoice, invoice.project.customer, invoice.project, invoice.items)
    
    from xhtml2pdf import pisa
    
    # Create PDF
    pdf_file = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
    
    if pisa_status.err:
         raise HTTPException(status_code=500, detail="Error generating PDF")
         
    pdf_file.seek(0)
    
    raw_inv = invoice.invoice_number[2:] if invoice.invoice_number.startswith("I-") else invoice.invoice_number
    safe_inv = "".join(c for c in raw_inv if c.isalnum() or c in ('-', '_'))
    
    raw_proj = invoice.project.project_unique_id if invoice.project.project_unique_id else "UNKNOWN"
    raw_proj = raw_proj[2:] if raw_proj.startswith("P-") else raw_proj
    safe_proj = "".join(c for c in raw_proj if c.isalnum() or c in ('-', '_'))
    
    filename = f"INV_P-{safe_proj}_I-{safe_inv}.pdf"
    
    return StreamingResponse(
        pdf_file, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- Task Endpoints ---
@app.get("/tasks/", response_model=List[schemas.Task])
def read_tasks(
    skip: int = 0, 
    limit: int = 500000, 
    assigned_to_id: Optional[int] = None,
    task_type: Optional[models.TaskType] = None,
    hide_completed: bool = False,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_tasks(db, skip=skip, limit=limit, assigned_to_id=assigned_to_id, task_type=task_type, hide_completed=hide_completed, project_id=project_id)

@app.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/tasks/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    try:
        print(f"DEBUG: Creating task with data: {task.model_dump()}")
        db_task = crud.create_task(db, task, current_user)
        # Force validation to catch response errors
        print("DEBUG: Validating response model...")
        validated = schemas.Task.model_validate(db_task)
        print("DEBUG: Validation passed!")
        
        # Fire MS Teams Webhook
        from . import teams
        title = f"New Task Assigned: {db_task.task_type}"
        msg = f"**{current_user.username}** created a new Task"
        if db_task.assigned_to:
            msg += f" and assigned it to **{db_task.assigned_to.username}**"
        teams.send_teams_alert(
            title=title,
            message=msg,
            action_url=f"/portal/tasks/{db_task.id}"
        )

        # Fire Native Websocket
        if db_task.assigned_to_id and db_task.assigned_to_id != current_user.id:
            import asyncio
            db_notification = models.Notification(
                user_id=db_task.assigned_to_id,
                title="New Task Assignment",
                message=f"You have been assigned a new Task (#{db_task.id})",
                link=f"/portal/tasks/{db_task.id}"
            )
            db.add(db_notification)
            db.commit()
            db.refresh(db_notification)
            
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(manager.send_notification(
                        user_id=db_task.assigned_to_id, 
                        notification=schemas.Notification.model_validate(db_notification)
                    ))
            except Exception as wse:
                print(f"WS error: {wse}")
        
        return validated
    except Exception as e:
        import traceback
        import sys
        error_details = f"Error creating task:\n{e}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"CRITICAL ERROR: {error_details}", file=sys.stderr)
        with open("backend_error.log", "w") as f:
            f.write(error_details)
        from fastapi.responses import JSONResponse
        # Return 500 with details so frontend alert shows it
        return JSONResponse(status_code=500, content={"detail": f"Server Error: {str(e)}"})

@app.put("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    updated = crud.update_task(db, task_id, task, current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@app.post("/tasks/{task_id}/clone", response_model=schemas.Task)
def clone_task(task_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    cloned_task = crud.clone_task(db, task_id, current_user)
    if not cloned_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return cloned_task

# SECURITY FIX: Added authentication requirement to delete task endpoint
# def delete_task(task_id: int, db: Session = Depends(get_db)):
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):

    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@app.post("/tasks/{task_id}/events", response_model=schemas.TaskEvent)
def create_task_event(task_id: int, event: schemas.TaskEventCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    from datetime import datetime
    if event.event_date:
        event_date_str = str(event.event_date)
        start_time_str = str(event.start_time) if event.start_time else "23:59"
        try:
            selected_dt = datetime.strptime(f"{event_date_str} {start_time_str[:5]}", "%Y-%m-%d %H:%M")
            if selected_dt > datetime.now():
                raise HTTPException(status_code=400, detail="invalid future date selected")
        except ValueError:
            pass
    return crud.create_task_event(db, task_id, event, current_user)

@app.post("/events", response_model=schemas.TaskEvent)
def create_global_event(event: schemas.TaskEventCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    from datetime import datetime
    if event.event_date:
        event_date_str = str(event.event_date)
        start_time_str = str(event.start_time) if event.start_time else "23:59"
        try:
            selected_dt = datetime.strptime(f"{event_date_str} {start_time_str[:5]}", "%Y-%m-%d %H:%M")
            if selected_dt > datetime.now():
                raise HTTPException(status_code=400, detail="invalid future date selected")
        except ValueError:
            pass
    
    if not event.milestone_id and not event.task_id:
        raise HTTPException(status_code=400, detail="Must provide either task_id or milestone_id")
        
    print(f"!!! POST /events payload: milestone_id={event.milestone_id}, task_id={event.task_id} !!!", flush=True)
    return crud.create_task_event(db, event.task_id, event, current_user)


class TimesheetAction(BaseModel):
    user_id: int
    start_date: str
    end_date: str

class ProjectLockAction(BaseModel):
    project_id: int
    lock: bool

@app.post("/task-events/submit")
def submit_timesheet(payload: TimesheetAction, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if payload.user_id != current_user.id and current_user.role.lower() not in ['admin', 'manager', 'finance']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    events = db.query(models.TaskEvent).filter(
        models.TaskEvent.user_id == payload.user_id,
        models.TaskEvent.event_date >= payload.start_date,
        models.TaskEvent.event_date <= payload.end_date,
        models.TaskEvent.status.in_([models.TimesheetStatus.DRAFT, models.TimesheetStatus.REJECTED])
    ).all()
    
    for e in events:
        e.status = models.TimesheetStatus.SUBMITTED
    db.commit()
    return {"message": "Timesheet submitted", "count": len(events)}

@app.post("/task-events/approve")
def approve_timesheet(payload: TimesheetAction, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role.lower() not in ['admin', 'manager', 'finance']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    events = db.query(models.TaskEvent).filter(
        models.TaskEvent.user_id == payload.user_id,
        models.TaskEvent.event_date >= payload.start_date,
        models.TaskEvent.event_date <= payload.end_date,
        models.TaskEvent.status == models.TimesheetStatus.SUBMITTED
    ).all()
    
    for e in events:
        e.status = models.TimesheetStatus.APPROVED
    db.commit()
    return {"message": "Timesheet approved", "count": len(events)}

@app.post("/task-events/reject")
def reject_timesheet(payload: TimesheetAction, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role.lower() not in ['admin', 'manager', 'finance']:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    events = db.query(models.TaskEvent).filter(
        models.TaskEvent.user_id == payload.user_id,
        models.TaskEvent.event_date >= payload.start_date,
        models.TaskEvent.event_date <= payload.end_date,
        models.TaskEvent.status.in_([models.TimesheetStatus.SUBMITTED, models.TimesheetStatus.APPROVED])
    ).all()
    
    for e in events:
        e.status = models.TimesheetStatus.REJECTED
        
    if len(events) > 0:
        notif = models.Notification(
            user_id=payload.user_id,
            title="Timesheet Rejected",
            message=f"Your timesheet spanning {payload.start_date} to {payload.end_date} requires fixes and resubmission.",
            link="/timesheet"
        )
        db.add(notif)
    db.commit()
    return {"message": "Timesheet rejected", "count": len(events)}

@app.post("/task-events/lock_project")
def lock_project(payload: ProjectLockAction, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role.lower() not in ['admin', 'manager', 'finance']:
        raise HTTPException(status_code=403, detail="Not authorized")

    tasks = db.query(models.Task).filter(models.Task.project_id == payload.project_id).all()
    task_ids = [t.id for t in tasks]
    
    events = db.query(models.TaskEvent).filter(models.TaskEvent.task_id.in_(task_ids)).all()
    target_status = models.TimesheetStatus.LOCKED if payload.lock else models.TimesheetStatus.DRAFT
    for e in events:
        e.status = target_status
    db.commit()
    return {"message": "Project timesheets lock state mutated.", "count": len(events)}

@app.put("/task-events/{event_id}", response_model=schemas.TaskEvent)
def update_task_event(event_id: int, event_update: schemas.TaskEventUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    from datetime import datetime
    if event_update.event_date:
        event_date_str = str(event_update.event_date)
        start_time_str = str(event_update.start_time) if event_update.start_time else "23:59"
        try:
            selected_dt = datetime.strptime(f"{event_date_str} {start_time_str[:5]}", "%Y-%m-%d %H:%M")
            if selected_dt > datetime.now():
                raise HTTPException(status_code=400, detail="invalid future date selected")
        except ValueError:
            pass
    updated_event = crud.update_task_event(db, event_id, event_update, current_user)
    if not updated_event:
         raise HTTPException(status_code=404, detail="Task event not found")
    return updated_event

@app.delete("/task-events/{event_id}")
def delete_task_event(event_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    success = crud.delete_task_event(db, event_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Task event not found")
    return {"message": "Event deleted"}

@app.get("/task-events/", response_model=List[schemas.TaskEvent])
def read_task_events(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return crud.get_task_events(db, current_user, start_date, end_date, user_id)

@app.post("/sync/task-events/")
def sync_offline_task_events(
    events: List[schemas.TaskEventCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    synced = []
    for ev in events:
        try:
            db_event = crud.create_task_event(db, ev.task_id, ev, current_user)
            synced.append(db_event.id)
        except Exception:
            db.rollback()
    return {"synced_count": len(synced)}


@app.get("/tasks/{task_id}/pdf")
def generate_task_pdf(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    type_lbl = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type).replace('TaskType.', '').replace('_', ' ').title()
    status_lbl = task.status.value if hasattr(task.status, 'value') else str(task.status).replace('TaskStatus.', '').replace('_', ' ').title()
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; font-size: 10pt; }}
            h1 {{ color: #333; font-size: 16pt; margin-bottom: 10px; }}
            .header {{ margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }}
            .details {{ margin-bottom: 15px; }}
            .details p {{ margin: 3px 0; }}
            .details strong {{ display: inline-block; width: 120px; }}
            .notes {{ margin-top: 20px; }}
            .note {{ background: #f9f9f9; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; page-break-inside: avoid; }}
            .note-meta {{ font-size: 0.75em; color: #666; margin: 0; padding: 0; }}
            .note-content {{ font-size: 0.9em; margin: 2px 0; padding: 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Task #{task.id}: {type_lbl}</h1>
        </div>
        
        <div class="details">
            <p><strong>Description:</strong> {task.description}</p>
            <p><strong>Status:</strong> {status_lbl}</p>
            <p><strong>Priority:</strong> {task.priority}</p>
            <p><strong>Assigned To:</strong> {task.assigned_to.username if task.assigned_to else 'Unassigned'}</p>
            <p><strong>Due Date:</strong> {task.due_date.strftime('%Y-%m-%d') if task.due_date else '-'}</p>
             <p><strong>Time Spent:</strong> {task.total_hours_spent:.1f} / {task.estimated_effort} hours</p>
             <p><strong>Progress:</strong> {task.progress}%</p>
        </div>

        <div class="events">
            <h3>Events & Time Log</h3>
            {''.join([f'''
            <div class="note">
                <div class="note-meta"><strong>{event.user.username if event.user else 'Unknown'}</strong> - {event.event_date.strftime('%Y-%m-%d')}</div>
                <div class="note-content">{event.content}</div>
                {f'<div class="note-meta" style="color:#2c3e50;">⏱ {event.hours_spent:.1f} hrs | {event.start_time.strftime("%H:%M") if event.start_time else ""} to {event.end_time.strftime("%H:%M") if event.end_time else ""}</div>' if event.hours_spent > 0 else ''}
            </div>
            ''' for event in task.events])}
            
            { '<p>No events logged yet.</p>' if not task.events else '' }
        </div>
    </body>
    </html>
    """
    
    pdf_file = io.BytesIO()
    pisa_status = pisa.CreatePDF(io.BytesIO(html_content.encode("utf-8")), dest=pdf_file)
    
    if pisa_status.err:
        return {"error": "PDF generation failed"}
        
    filename = f"Task_{task.id}_Report.pdf"
            
    return Response(
        content=pdf_file.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/reports/task-analysis", response_model=schemas.TaskAnalysisReport)
def get_task_analysis_report(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[int] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    # Parse dates from strings if provided (frontend sends YYYY-MM-DD)
    parsed_start = None
    parsed_end = None
    
    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            pass # Or raise HTTP exception
            
    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Permission Check
    target_user_id = user_id
    if current_user.role != 'admin':
        # Non-admins can only see their own report
        target_user_id = current_user.id

    return crud.get_task_analysis_report(db, start_date=parsed_start, end_date=parsed_end, user_id=target_user_id, task_type=task_type)

@app.get("/reports/task-analysis/pdf")
def get_task_analysis_pdf(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[int] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    parsed_start = None
    parsed_end = None
    
    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            pass
            
    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Permission Check
    target_user_id = user_id
    if current_user.role != 'admin':
        target_user_id = current_user.id

    report_dict = crud.get_task_analysis_report(db, start_date=parsed_start, end_date=parsed_end, user_id=target_user_id, task_type=task_type)
    report_obj = schemas.TaskAnalysisReport(**report_dict)
    
    # Resolve user_info string
    user_info = "All Users"
    if target_user_id:
        target_user = crud.get_user(db, user_id=target_user_id)
        if target_user:
            user_info = target_user.username
            
    html_content = generate_task_report_pdf(report_obj, start_date=parsed_start, end_date=parsed_end, user_info=user_info, task_type_filter=task_type)
    
    pdf_file = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
    if pisa_status.err:
         raise HTTPException(status_code=500, detail="Error generating Task Analysis PDF")
         
    # Sanitize filename
    date_str = f"_{start_date}_to_{end_date}" if start_date and end_date else ""
    filename = f"Task_Analysis_Report{date_str}.pdf"
            
    return Response(
        content=pdf_file.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/reports/event-analysis", response_model=schemas.EventAnalysisReport)
def get_event_analysis_report(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[int] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    parsed_start = None
    parsed_end = None
    
    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            pass
            
    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Permission Check
    target_user_id = user_id
    if current_user.role != 'admin':
        target_user_id = current_user.id

    return crud.get_event_analysis_report(db, start_date=parsed_start, end_date=parsed_end, user_id=target_user_id, task_type=task_type)

@app.get("/reports/pto-audit/", response_model=List[schemas.PTOAuditReportItem])
def get_pto_audit_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != "admin" and not current_user.has_financial_access:
        raise HTTPException(status_code=403, detail="Not authorized to view PTO audits")
    
    logs = db.query(models.PTOAuditLog).order_by(models.PTOAuditLog.transaction_date.desc()).all()
    results = []
    for log in logs:
        item = schemas.PTOAuditReportItem(
            id=log.id,
            user_id=log.user_id,
            transaction_type=log.transaction_type,
            amount_hours=log.amount_hours,
            balance_after=log.balance_after,
            transaction_date=log.transaction_date,
            notes=log.notes,
            user_name=log.user.username if log.user else "Unknown"
        )
        results.append(item)
    return results

@app.get("/reports/event-analysis/pdf")
def get_event_analysis_pdf(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user_id: Optional[int] = None,
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    parsed_start = None
    parsed_end = None
    
    if start_date:
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            pass
            
    if end_date:
        try:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Permission Check
    target_user_id = user_id
    if current_user.role != 'admin':
        target_user_id = current_user.id

    report_dict = crud.get_event_analysis_report(db, start_date=parsed_start, end_date=parsed_end, user_id=target_user_id, task_type=task_type)
    report_obj = schemas.EventAnalysisReport(**report_dict)
    
    # Resolve user_info string
    user_info = "All Users"
    if target_user_id:
        target_user = crud.get_user(db, user_id=target_user_id)
        if target_user:
            user_info = target_user.username
            
    html_content = generate_event_report_pdf(report_obj, start_date=parsed_start, end_date=parsed_end, user_info=user_info, task_type_filter=task_type)
    
    pdf_file = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
    if pisa_status.err:
         raise HTTPException(status_code=500, detail="Error generating Event Analysis PDF")
         
    # Sanitize filename
    date_str = f"_{start_date}_to_{end_date}" if start_date and end_date else ""
    filename = f"Event_Analysis_Report{date_str}.pdf"
            
    return Response(
        content=pdf_file.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- PTO Endpoints ---

@app.post("/pto/banks", response_model=schemas.PTOBankOut)
def create_or_update_pto_bank(
    pto_bank: schemas.PTOBankCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != 'admin' and current_user.role != 'finance':
        raise HTTPException(status_code=403, detail="Not authorized to manage PTO banks")
    return crud.set_pto_bank(db=db, pto_bank=pto_bank, current_user=current_user)

@app.get("/pto/ledger", response_model=schemas.PTOLedgerReport)
def get_pto_ledger(
    year: int = datetime.now().year,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role != 'admin' and current_user.role != 'finance':
        raise HTTPException(status_code=403, detail="Not authorized to view full ledger")
    return crud.get_pto_ledger_report(db, year=year)

@app.post("/pto/requests", response_model=schemas.PTORequestOut)
def create_pto_request(
    request: schemas.PTORequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return crud.create_pto_request(db, pto_request=request, current_user=current_user)

@app.get("/pto/requests", response_model=List[schemas.PTORequestOut])
def get_pto_requests(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    target_user_id = user_id
    if current_user.role != 'admin' and current_user.role != 'finance':
        if current_user.role == 'user':
            target_user_id = current_user.id
            
    return crud.get_pto_requests(db, user_id=target_user_id, status=status, year=year)

@app.put("/pto/requests/{request_id}/status", response_model=schemas.PTORequestOut)
def update_pto_request_status(
    request_id: int,
    status_update: schemas.PTORequestUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role == 'user' and status_update.status != models.PTOStatus.PENDING:
        raise HTTPException(status_code=403, detail="Not authorized to approve PTO")
    
    updated = crud.update_pto_request_status(db, request_id=request_id, status=status_update.status, current_user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="PTO Request not found")
    return updated

@app.get("/pto/my-balance")
def get_my_pto_balance(
    year: int = datetime.now().year,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    bank = crud.get_pto_bank(db, user_id=current_user.id, year=year)
    allowance = bank.allowance_hours if bank else 0.0
    
    import datetime as dt
    from sqlalchemy.sql import func
    start = dt.datetime(year, 1, 1)
    end = dt.datetime(year, 12, 31, 23, 59, 59)
    
    taken = db.query(func.sum(models.TaskEvent.hours_spent)).filter(
        models.TaskEvent.user_id == current_user.id,
        models.TaskEvent.event_type == models.TaskType.PTO,
        models.TaskEvent.event_date >= start.date(),
        models.TaskEvent.event_date <= end.date()
    ).scalar()
    taken_hours = float(taken or 0.0)
    
    requests = crud.get_pto_requests(db, user_id=current_user.id, year=year)
    pending_hours = sum(r.hours_requested for r in requests if r.status == models.PTOStatus.PENDING)
    approved_hours = sum(r.hours_requested for r in requests if r.status in [models.PTOStatus.MANAGER_APPROVED, models.PTOStatus.FINANCE_APPROVED])
    
    return {
        "year": year,
        "allowance": allowance,
        "taken": taken_hours,
        "pending": pending_hours,
        "approved": approved_hours,
        "balance": allowance - taken_hours
    }

@app.get("/calendar/test")
def test_calendar(db: Session = Depends(get_db)):
    try:
        from app import models
        # simple mock user
        class MockUser:
            id = 1
        return get_calendar_events(None, None, db, MockUser())
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

@app.get("/calendar/events")
def get_calendar_events(
    user_id: Optional[int] = None,
    types: Optional[str] = None, # comma separated string
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    """Fetches due dates across Leads, Projects, Milestones, Invoices, and Tasks for a unified calendar."""
    events = []
    
    allowed_types = [t.strip().lower() for t in types.split(',')] if types else ['lead', 'project', 'milestone', 'invoice', 'task', 'pto']
    
    def make_end_of_day(dt):
        from datetime import datetime, time
        if not dt: return None
        try:
            d = dt.date() if hasattr(dt, 'date') else dt
            return datetime.combine(d, time(23, 59, 59))
        except Exception:
            return dt

    if 'lead' in allowed_types:
        q = db.query(models.Lead).filter(models.Lead.due_date != None, models.Lead.status != models.LeadStatus.LOST, models.Lead.status != models.LeadStatus.CONVERTED)
        if user_id:
            q = q.filter(models.Lead.poc_id == user_id)
        for lead in q.all():
            events.append({
                "id": f"lead-{lead.id}",
                "item_id": lead.id,
                "type": "Lead",
                "title": f"Lead: {lead.name} {('- ' + lead.company) if lead.company else ''}",
                "start": lead.due_date.isoformat(),
                "end": make_end_of_day(lead.due_date).isoformat(),
                "allDay": True,
                "status": lead.status.value if hasattr(lead.status, 'value') else str(lead.status).replace('LeadStatus.', '').title(),
                "assigned_to": lead.poc.username if lead.poc else "Unassigned"
            })
            
    # 2. Projects
    if 'project' in allowed_types:
        q = db.query(models.Project).filter(models.Project.due_date != None, models.Project.status != models.ProjectStatus.ARCHIVED, models.Project.status != models.ProjectStatus.COMPLETED)
        # Removed user_id filter so projects are visible to all
        for proj in q.all():
            events.append({
                "id": f"project-{proj.id}",
                "item_id": proj.id,
                "type": "Project",
                "title": f"Project: {proj.name} ({proj.project_unique_id})",
                "start": proj.due_date.isoformat(),
                "end": make_end_of_day(proj.due_date).isoformat(),
                "allDay": True,
                "status": proj.status.value if hasattr(proj.status, 'value') else str(proj.status).replace('ProjectStatus.', '').title(),
                "assigned_to": proj.pm_user.username if proj.pm_user else "Unassigned"
            })
            
    # 3. Milestones
    if 'milestone' in allowed_types:
        q = db.query(models.Milestone).filter(models.Milestone.due_date != None, models.Milestone.is_completed == False)
        # Removed user_id filter so milestones are visible to all
        for m in q.all():
            project_name = m.project.name if getattr(m, 'project', None) else 'Unknown Project'
            events.append({
                "id": f"milestone-{m.id}",
                "item_id": m.id,
                "type": "Milestone",
                "title": f"Milestone: {m.name} ({project_name})",
                "start": m.due_date.isoformat(),
                "end": make_end_of_day(m.due_date).isoformat(),
                "allDay": True,
                "status": "Completed" if m.is_completed else "Pending",
                "assigned_to": m.owner.username if getattr(m, 'owner', None) else "Unassigned"
            })
            
    # 4. Invoices
    if 'invoice' in allowed_types:
        q = db.query(models.Invoice).filter(models.Invoice.due_date != None, models.Invoice.status != models.InvoiceStatus.PAID, models.Invoice.status != models.InvoiceStatus.VOID)
        if user_id:
            q = q.filter(models.Invoice.created_by_id == user_id)
        for inv in q.all():
            events.append({
                "id": f"invoice-{inv.id}",
                "item_id": inv.id,
                "type": "Invoice",
                "title": f"Invoice: {inv.invoice_number}",
                "start": inv.due_date.isoformat(),
                "end": make_end_of_day(inv.due_date).isoformat(),
                "allDay": True,
                "status": inv.status.value if hasattr(inv.status, 'value') else str(inv.status).replace('InvoiceStatus.', '').title(),
                "assigned_to": "Finance"
            })
            
    # 5. Tasks
    if 'task' in allowed_types:
        q = db.query(models.Task).filter(models.Task.due_date != None, models.Task.status != models.TaskStatus.COMPLETED)
        if user_id:
            q = q.filter(models.Task.assigned_to_id == user_id)
        for task in q.all():
            desc = task.description or "Untitled Task"
            logged = round(getattr(task, 'total_hours_spent', 0) or 0, 2)
            budget = round(getattr(task, 'estimated_effort', 0) or 0, 2)
            events.append({
                "id": f"task-{task.id}",
                "item_id": task.id,
                "type": "Task",
                "title": f"[{logged}/{budget}hr] {desc[:40] + '...' if len(desc) > 40 else desc}",
                "start": (task.start_date or task.due_date).isoformat() if task.due_date else None,
                "end": make_end_of_day(task.due_date).isoformat() if task.due_date else None,
                "allDay": True,
                "status": task.status.value if hasattr(task.status, 'value') else str(task.status).replace('TaskStatus.', '').replace('_', ' ').title(),
                "assigned_to": task.assigned_to.username if getattr(task, 'assigned_to', None) else "Unassigned",
                "utilization": getattr(task, 'estimated_utilization', 0),
                "logged_hours": logged,
                "budget_hours": budget,
                "project_name": task.project.name if getattr(task, 'project', None) else None,
                "project_number": task.project.project_unique_id if getattr(task, 'project', None) else None,
                "milestone_name": task.milestone.name if getattr(task, 'milestone', None) else None,
                "customer_name": task.project.customer.name if getattr(getattr(task, 'project', None), 'customer', None) else None,
                "task_type": str(task.task_type.value if hasattr(task.task_type, 'value') else task.task_type).upper(),
                "priority": task.priority,
                "progress": task.progress
            })
            
        # Append Global Milestones disguised as tasks
        q_m = db.query(models.Milestone).filter(models.Milestone.is_global_bucket == True, models.Milestone.is_completed == False)
        # Note: could filter by global_access_level here if we had current_user available
        for m in q_m.all():
            customer_prefix = (m.project.customer.name + " - ") if getattr(m, 'project', None) and getattr(m.project, 'customer', None) else ""
            events.append({
                "id": f"milestone-global-{m.id}",
                "item_id": f"m-{m.id}",
                "type": "Task",
                "title": f"[Virtual] {customer_prefix}{m.name}",
                "start": m.due_date.isoformat() if m.due_date else None,
                "end": make_end_of_day(m.due_date).isoformat() if m.due_date else None,
                "allDay": True,
                "status": "In Progress",
                "assigned_to": "All",
                "utilization": 0,
                "logged_hours": 0,
                "budget_hours": m.budget_hours or 0,
                "project_name": m.project.name if getattr(m, 'project', None) else None,
                "project_number": m.project.project_unique_id if getattr(m, 'project', None) else None,
                "milestone_name": m.name,
                "customer_name": m.project.customer.name if getattr(getattr(m, 'project', None), 'customer', None) else None,
                "task_type": "GLOBAL",
                "priority": "Medium",
                "progress": m.progress
            })

    # 6. PTO
    if 'pto' in allowed_types:
        q = db.query(models.PTORequest).filter(models.PTORequest.status == models.PTOStatus.FINANCE_APPROVED)
        if user_id:
            q = q.filter(models.PTORequest.user_id == user_id)
        for pto in q.all():
            events.append({
                "id": f"pto-{pto.id}",
                "item_id": pto.id,
                "type": "PTO",
                "title": f"PTO: {pto.user.first_name or pto.user.username} ({pto.hours_requested}hr)",
                "start": pto.start_date.isoformat(),
                "end": make_end_of_day(pto.end_date).isoformat(),
                "allDay": True,
                "status": "Finance Approved",
                "assigned_to": pto.user.username if getattr(pto, 'user', None) else "Unknown"
            })

    return events

# --- Notifications Endpoints ---
@app.get("/notifications/", response_model=List[schemas.Notification])
def get_user_notifications(skip: int = 0, limit: int = 5000, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()

@app.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    notification = db.query(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"status": "read"}

# --- Expense Tracking Endpoints ---

@app.post("/expenses/parse-receipt")
async def parse_receipt(file: UploadFile = File(...), current_user: models.User = Depends(dependencies.get_current_active_user)):
    import base64
    import json
    from openai import OpenAI
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WEBP) are supported for AI parsing right now.")
        
    api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")
        
    client = OpenAI(api_key=api_key)
    
    try:
        content = await file.read()
        b64_img = base64.b64encode(content).decode('utf-8')
        
        system_prompt = """
        You are a financial parsing assistant. Extract the following from the receipt image provided into a strictly formatted JSON object:
        {
          "amount": number (just the total float value, e.g., 25.50),
          "date_time": string (ISO format YYYY-MM-DDTHH:MM, approximate noon if time is missing),
          "notes": string (Vendor name and brief description of items),
          "expense_type": string (Choose one: "Hardware", "Meal", "Parking", "Hotel", "Flight", "Car Rental", "T&E", "Shipping", "Software", "Contractor", "Tools" - guess based on items)
        }
        Return ONLY the raw JSON object, no markdown blocks.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    { "type": "image_url", "image_url": { "url": f"data:{file.content_type};base64,{b64_img}" } }
                ]}
            ],
            temperature=0.1
        )
        
        parsed = json.loads(response.choices[0].message.content)
        return parsed
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to parse receipt: {str(e)}")

@app.post("/expenses/bulk-submit")
def bulk_submit_expenses(
    payload: schemas.ExpenseBulkAction, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    expenses = db.query(models.Expense).filter(models.Expense.id.in_(payload.expense_ids)).all()
    for exp in expenses:
        if exp.status == models.ExpenseStatus.DRAFT:
            # Optionally check ownership: current_user.id == exp.user_id
            if current_user.role not in ['admin', 'manager'] and exp.user_id != current_user.id:
                continue
            exp.status = models.ExpenseStatus.SUBMITTED
    db.commit()
    return {"message": f"Successfully submitted {len(expenses)} expenses"}

@app.post("/expenses/bulk-approve")
def bulk_approve_expenses(
    payload: schemas.ExpenseBulkAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    expenses = db.query(models.Expense).filter(models.Expense.id.in_(payload.expense_ids)).all()
    for exp in expenses:
        if exp.status in [models.ExpenseStatus.SUBMITTED, models.ExpenseStatus.DRAFT]:
            exp.status = models.ExpenseStatus.LOCKED
    db.commit()
    return {"message": f"Successfully approved and locked {len(expenses)} expenses"}

@app.post("/expenses/bulk-reject")
def bulk_reject_expenses(
    payload: schemas.ExpenseBulkAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    expenses = db.query(models.Expense).filter(models.Expense.id.in_(payload.expense_ids)).all()
    for exp in expenses:
        if exp.status == models.ExpenseStatus.SUBMITTED:
            exp.status = models.ExpenseStatus.REJECTED
    db.commit()
    return {"message": f"Successfully rejected {len(expenses)} expenses"}

@app.get("/expenses/", response_model=List[schemas.Expense])
def read_all_expenses(
    skip: int = 0, 
    limit: int = 500000, 
    user_id: Optional[int] = None, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if current_user.role not in ['admin', 'manager']:
        user_id = current_user.id
    return crud.get_global_expenses(db, skip=skip, limit=limit, user_id=user_id, start_date=start_date, end_date=end_date)

@app.get("/projects/{project_id}/expenses", response_model=List[schemas.Expense])
def read_expenses_by_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    target_user_id = None if current_user.role in ['admin', 'manager'] else current_user.id
    return crud.get_expenses_by_project(db, project_id=project_id, user_id=target_user_id)

@app.post("/projects/{project_id}/expenses", response_model=schemas.Expense)
def create_expense(project_id: int, expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role not in ['admin', 'manager']:
        expense.user_id = current_user.id
    return crud.create_expense(db=db, expense=expense, current_user=current_user, project_id=project_id)

@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(expense_id: int, expense: schemas.ExpenseUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    updated = crud.update_expense(db=db, expense_id=expense_id, expense=expense, current_user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Expense not found")
    return updated

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    success = crud.delete_expense(db=db, expense_id=expense_id, current_user=current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"detail": "Expense deleted successfully"}

@app.post("/expenses/{expense_id}/attachments", response_model=schemas.ExpenseAttachment)
async def upload_expense_attachment(expense_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    unique_filename = f"exp_{expense_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    
    start_time = time.time()
    try:
        # Upload to GCS
        storage_client = storage.Client()
        bucket_name = getattr(settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"expenses/{expense_id}/{unique_filename}")
        
        file.file.seek(0)
        blob.upload_from_file(file.file, content_type=file.content_type)
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"GCS: operation=upload, filename={unique_filename}, success=True, duration_ms={duration_ms:.2f}")
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"GCS: operation=upload, filename={unique_filename}, success=False, duration_ms={duration_ms:.2f} | Error: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to upload attachment to storage: {str(e)}")
        
    return crud.create_expense_attachment(db, expense_id=expense_id, filename=file.filename, file_path=blob.name)

@app.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    expense = db.query(models.Expense).filter(models.Expense.id == attachment.expense_id).first()
    if expense and current_user.role not in ['admin', 'manager'] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    start_time = time.time()
    try:
        storage_client = storage.Client()
        bucket_name = getattr(settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        blob.delete()
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"GCS: operation=delete, filename={attachment.file_path}, success=True, duration_ms={duration_ms:.2f}")
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"GCS: operation=delete, filename={attachment.file_path}, success=False, duration_ms={duration_ms:.2f} | Error: {str(e)}"
        )
            
    crud.delete_expense_attachment(db, attachment_id)
    return {"detail": "Attachment deleted successfully"}

@app.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    start_time = time.time()
    try:
        storage_client = storage.Client()
        bucket_name = getattr(settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        
        file_bytes = blob.download_as_bytes()
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"GCS: operation=download, filename={attachment.file_path}, success=True, duration_ms={duration_ms:.2f}")
        
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={attachment.filename}"}
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"GCS: operation=download, filename={attachment.file_path}, success=False, duration_ms={duration_ms:.2f} | Error: {str(e)}"
        )
        raise HTTPException(status_code=404, detail=f"File not found on cloud storage: {str(e)}")

# --- WebSocket & Presence Manager ---
class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List of active WebSockets
        self.active_connections: dict = {}

    async def connect(self, ws: WebSocket, user_id: int, db: Session):
        await ws.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(ws)
        # Mark user as online in DB if needed (or just rely on memory state for 'is_online' property?)
        # For simplicity, we also commit it to DB so other endpoints can see it easily
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.is_online = True
            user.last_active_at = datetime.utcnow()
            db.commit()
            
    def disconnect(self, ws: WebSocket, user_id: int, db: Session):
        if user_id in self.active_connections:
            if ws in self.active_connections[user_id]:
                self.active_connections[user_id].remove(ws)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_active_at = datetime.utcnow()
                    db.commit()

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def send_notification(self, user_id: int, notification: schemas.Notification):
        if user_id in self.active_connections:
            message = {
                "type": "notification",
                "payload": notification.model_dump(mode="json")
            }
            await self.send_personal_message(message, user_id)

    async def broadcast(self, message: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
                    pass

@app.get("/search")
def perform_global_search(
    q: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    if not q or len(q.strip()) < 2:
        return []
        
    words = q.strip().split()
    # Trigger semantic AI parsing if the query is a multi-word long phrase
    if len(words) >= 3 and len(q.strip()) > 10:
        from .ai_search import do_ai_search
        return do_ai_search(db, query=q, limit=15)
        
    return crud.global_search(db, query=q, limit=15)

# --- Action Items ---
@app.get("/users/me/action-items", response_model=List[schemas.ActionItem])
def read_my_action_items(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.get_user_action_items(db, user_id=current_user.id)

@app.post("/users/me/action-items", response_model=schemas.ActionItem)
def create_my_action_item(
    action_item: schemas.ActionItemCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    return crud.create_action_item(db=db, action_item=action_item, current_user=current_user)

@app.put("/users/me/action-items/{item_id}", response_model=schemas.ActionItem)
def update_my_action_item(
    item_id: int, 
    action_item: schemas.ActionItemUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    db_item = crud.update_action_item(db=db, item_id=item_id, action_item=action_item, current_user=current_user)
    if not db_item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return db_item

@app.delete("/users/me/action-items/{item_id}")
def delete_my_action_item(
    item_id: int, 
    permanent: bool = False,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    success = crud.delete_action_item(db=db, item_id=item_id, current_user=current_user, permanent=permanent)
    if not success:
        raise HTTPException(status_code=404, detail="Action item not found")
    return {"ok": True}

# --- Direct Messages ---
@app.get("/messages/", response_model=List[schemas.DirectMessageOut])
def get_my_messages(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    return crud.get_user_direct_messages(db, user_id=current_user.id)

@app.post("/messages/", response_model=schemas.DirectMessageOut)
async def send_message(
    msg: schemas.DirectMessageCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    db_msg = crud.create_direct_message(db=db, msg=msg, current_user=current_user)
    # Fire off notification through websocket
    try:
        await manager.send_personal_message({
            "type": "direct_message",
            "payload": {"id": db_msg.id, "sender_id": db_msg.sender_id, "content": db_msg.content}
        }, msg.recipient_id)
    except NameError:
        pass # manager not defined yet or not accessible, harmless fallback
    return db_msg

@app.post("/messages/{msg_id}/read", response_model=schemas.DirectMessageOut)
def mark_message_read(
    msg_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_active_user)
):
    db_msg = crud.mark_direct_message_read(db=db, msg_id=msg_id, current_user=current_user)
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return db_msg

manager = ConnectionManager()
# To use db session in websockets cleanly, we can instantiate SessionLocal directly
# or pass it. We use a dependent generator but fastAPI has issues with Depends in WS exceptions sometimes, 
# so we handle it gracefully.

@app.websocket("/ws/notifications/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, token: Optional[str] = Query(None)):
    ip_addr = websocket.client.host if websocket.client else "unknown"
    if not token:
        logger.warning(f"WS AUTH FAILED: user_id={user_id}, ip={ip_addr}, reason=Missing token")
        await websocket.close(code=1008)
        return
    try:
        from jose import JWTError, jwt
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning(f"WS AUTH FAILED: user_id={user_id}, ip={ip_addr}, reason=Missing sub in token, token={mask_sensitive('token', token)}")
            await websocket.close(code=1008)
            return
    except JWTError as e:
        logger.warning(f"WS AUTH FAILED: user_id={user_id}, ip={ip_addr}, reason=JWT decode error: {str(e)}, token={mask_sensitive('token', token)}")
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = crud.get_user_by_username(db, username=username)
        if user is None or user.id != user_id:
            reason = "User not found" if user is None else f"ID mismatch (token user ID {user.id} vs requested {user_id})"
            logger.warning(f"WS AUTH FAILED: user_id={user_id}, ip={ip_addr}, reason={reason}")
            await websocket.close(code=1008)
            return
        if not getattr(user, 'is_active', True) or getattr(user, 'locked_out', False):
            logger.warning(f"WS AUTH FAILED: user_id={user_id}, ip={ip_addr}, reason=Account inactive/locked")
            await websocket.close(code=1008)
            return
            
        logger.info(f"WS CONNECTED: user_id={user_id}, ip={ip_addr}")
        await manager.connect(websocket, user_id, db)
        try:
            while True:
                data = await websocket.receive_text()
                # If front-end pings us to keepalive or update activity:
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    user.last_active_at = datetime.utcnow()
                    db.commit()
        except WebSocketDisconnect as e:
            logger.info(f"WS DISCONNECTED: user_id={user_id}, ip={ip_addr}, code={e.code}")
            manager.disconnect(websocket, user_id, db)
        except Exception as e:
            logger.error(f"WS ERROR: user_id={user_id}, ip={ip_addr} | Error: {str(e)}", exc_info=True)
            manager.disconnect(websocket, user_id, db)
    finally:
        db.close()

from .routers import system
app.include_router(system.router)
