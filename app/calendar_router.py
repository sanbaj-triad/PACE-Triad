from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import os

from . import database, models

router = APIRouter(prefix="/calendar", tags=["Calendar"])

def format_ics_date(dt: datetime) -> str:
    """Format datetime to ICS DATE format YYYYMMDD"""
    return dt.strftime("%Y%m%d")

def format_ics_datetime(dt: datetime) -> str:
    """Format datetime to ICS UTC format YYYYMMDDTHHMMSSZ"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")

@router.get("/onsite.ics", response_class=Response)
def get_onsite_calendar_feed(
    token: str = Query(..., description="Authentication token for calendar sync"),
    db: Session = Depends(database.get_db)
):
    # Retrieve the allowed token, defaulting to something simple if not set
    expected_token = os.getenv("CALENDAR_SYNC_TOKEN", "office365sync")
    
    if token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid calendar sync token")
        
    # Get all ONSITE tasks from the last 30 days to the future
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    tasks = db.query(models.Task).filter(
        models.Task.task_type == models.TaskType.ONSITE,
        # Only pull if it has some due_date or start_date >= cutoff
        # (This is a simplistic filter. We can just pull everything not Completed years ago to be safe)
        (models.Task.due_date >= cutoff_date) | (models.Task.start_date >= cutoff_date)
    ).all()
    
    # Build ICS String structure
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Invoice Project Lead//Onsite Tasks//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Onsite Projects Calendar",
        "X-WR-TIMEZONE:UTC",
        "X-APPLE-CALENDAR-COLOR:#22C55E",
    ]
    
    now_utc_str = format_ics_datetime(datetime.utcnow())
    frontend_url = os.getenv("FRONTEND_URL", "https://localhost:7223")
    
    for t in tasks:
        # Fallback date math
        start_dt = t.start_date or t.due_date or datetime.utcnow()
        end_dt = t.due_date or t.start_date or datetime.utcnow()
        
        # In ICS, all-day events are exclusive on the DTEND date (meaning +1 day)
        end_dt_exclusive = end_dt + timedelta(days=1)
        
        # Determine Assignee
        assigned_name = "Unassigned"
        if t.assigned_to:
            first = t.assigned_to.first_name or ""
            last = t.assigned_to.last_name or ""
            if first or last:
                assigned_name = f"{first} {last}".strip()
            else:
                assigned_name = t.assigned_to.username
                
        # Determine Project
        project_str = "No Project"
        if t.project:
            project_str = f"P-{t.project.id} - {t.project.name}"
            
        # Determine Task Title snippet (just first 30 chars of description to not flood the title)
        desc_preview = (t.description or "No Description").strip().replace("\n", " ")
        if len(desc_preview) > 35:
            desc_preview = desc_preview[:35] + "..."
            
        # Compile Summary Format requested by User: 
        # (Assigned to) [#ProjecID-ProjectNAme-Taslk ID-Task Name]
        summary = f"({assigned_name}) [{project_str} - T-{t.id} - {desc_preview}]"
        
        # Clean Description for ICS format (no raw newlines permitted without escaping)
        safe_desc = (t.description or "").replace("\r\n", " ").replace("\n", "\\n").replace("\r", "\\n")
        
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:task-{t.id}@invoiceprojectlead.local")
        lines.append(f"DTSTAMP:{now_utc_str}")
        lines.append(f"DTSTART;VALUE=DATE:{format_ics_date(start_dt)}")
        lines.append(f"DTEND;VALUE=DATE:{format_ics_date(end_dt_exclusive)}")
        lines.append(f"SUMMARY:{summary}")
        lines.append(f"DESCRIPTION:{safe_desc}")
        lines.append("COLOR:green")
        lines.append("CATEGORIES:Green Category")
        lines.append(f"URL:{frontend_url}/portal/tasks/edit/{t.id}")
        lines.append("END:VEVENT")
        
    lines.append("END:VCALENDAR")
    
    # Join with CRLF as required by RFC 5545
    ics_content = "\r\n".join(lines) + "\r\n"
    
    return Response(content=ics_content, media_type="text/calendar")
