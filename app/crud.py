from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta, date
from . import models, schemas, auth

# --- User/Customer CRUD ---
def get_dashboard_metrics(db: Session):
    # Leads
    leads = db.query(models.Lead).all()
    total_leads = len(leads)
    
    leads_by_status = {}
    for lead in leads:
        st = lead.status.name if hasattr(lead.status, 'name') else str(lead.status)
        leads_by_status[st] = leads_by_status.get(st, 0) + 1
        
    # Projects
    projects = db.query(models.Project).options(joinedload(models.Project.created_by_user), joinedload(models.Project.customer), joinedload(models.Project.pm_user)).all()
    total_projects = len(projects)
    
    avg_project_completion = 0.0 # Projects do not natively track scalar progress
    
    projects_by_type = {}
    projects_by_pm = {}
    projects_by_customer = {}
    
    for p in projects:
        pt = p.project_type.name if hasattr(p.project_type, 'name') else str(p.project_type)
        projects_by_type[pt] = projects_by_type.get(pt, 0) + 1
        
        pm = p.pm_user.username if p.pm_user else "Unknown"
        projects_by_pm[pm] = projects_by_pm.get(pm, 0) + 1
        
        cust = p.customer.name if p.customer else "Unknown"
        projects_by_customer[cust] = projects_by_customer.get(cust, 0) + 1

    # Milestones
    milestones = db.query(models.Milestone).options(joinedload(models.Milestone.owner)).all()
    total_milestones = len(milestones)
    
    avg_milestone_completion = sum(m.progress for m in milestones if m.progress is not None) / total_milestones if total_milestones else 0.0
    
    milestones_by_type = {}
    milestones_by_user = {}
    
    for m in milestones:
        mt = m.milestone_type.name if hasattr(m.milestone_type, 'name') else str(m.milestone_type)
        milestones_by_type[mt] = milestones_by_type.get(mt, 0) + 1
        
        u = m.owner.username if m.owner else "Unassigned"
        milestones_by_user[u] = milestones_by_user.get(u, 0) + 1
        
    # Tasks
    tasks = db.query(models.Task).options(joinedload(models.Task.assigned_to)).all()
    total_tasks = len(tasks)
    
    avg_task_completion = sum(t.progress for t in tasks if t.progress is not None) / total_tasks if total_tasks else 0.0
    
    tasks_by_type = {}
    tasks_by_user = {}
    total_time_spent = 0
    total_estimated = 0
    
    for t in tasks:
        tt = t.task_type.name if hasattr(t.task_type, 'name') else str(t.task_type)
        tasks_by_type[tt] = tasks_by_type.get(tt, 0) + 1
        
        u = t.assigned_to.username if t.assigned_to else "Unassigned"
        tasks_by_user[u] = tasks_by_user.get(u, 0) + 1
        
        total_time_spent += (t.total_hours_spent or 0)
        total_estimated += (t.estimated_effort or 0)
        
    tasks_avg_time_spent = total_time_spent / total_tasks if total_tasks else 0.0
    # Events
    events = db.query(models.TaskEvent).options(joinedload(models.TaskEvent.user)).all()
    total_events = len(events)
    total_event_hours = sum(e.hours_spent for e in events if e.hours_spent)
    events_by_type = {}
    events_by_user = {}
    events_by_location = {}
    
    for e in events:
        et = e.event_type if e.event_type else "Other"
        events_by_type[et] = events_by_type.get(et, 0) + (e.hours_spent or 0)
        
        u = e.user.username if e.user else "Unknown"
        events_by_user[u] = events_by_user.get(u, 0) + (e.hours_spent or 0)
        
        loc = e.work_location if e.work_location else "Office"
        events_by_location[loc] = events_by_location.get(loc, 0) + (e.hours_spent or 0)
        
    events_by_type = {k: round(v, 2) for k, v in events_by_type.items()}
    events_by_user = {k: round(v, 2) for k, v in events_by_user.items()}
    events_by_location = {k: round(v, 2) for k, v in events_by_location.items()}
    
    return schemas.DashboardMetrics(
        total_leads=total_leads,
        leads_by_status=leads_by_status,
        total_projects=total_projects,
        avg_project_completion=avg_project_completion,
        projects_by_type=projects_by_type,
        projects_by_pm=projects_by_pm,
        projects_by_customer=projects_by_customer,
        total_milestones=total_milestones,
        avg_milestone_completion=avg_milestone_completion,
        milestones_by_type=milestones_by_type,
        milestones_by_user=milestones_by_user,
        total_tasks=total_tasks,
        avg_task_completion=avg_task_completion,
        tasks_by_type=tasks_by_type,
        tasks_by_user=tasks_by_user,
        tasks_avg_time_spent=tasks_avg_time_spent,
        total_events=total_events,
        total_event_hours=round(total_event_hours, 2),
        events_by_type=events_by_type,
        events_by_user=events_by_user,
        events_by_location=events_by_location
    )

def get_user_dashboard_metrics(db: Session, user_id: int):
    # Fetch user for login_count
    user = db.query(models.User).filter(models.User.id == user_id).first()
    login_count = user.login_count if user else 0

    # Total tasks assigned
    tasks = db.query(models.Task).filter(models.Task.assigned_to_id == user_id).all()
    total_tasks_assigned = len(tasks)

    # Average completion %
    open_tasks = [t for t in tasks if t.status != models.TaskStatus.COMPLETED]
    if open_tasks:
        avg_task_completion = sum((t.progress or 0) for t in open_tasks) / len(open_tasks)
    else:
        avg_task_completion = 100.0 if tasks else 0.0

    # Types of tasks
    tasks_by_type = {}
    for t in tasks:
        t_type = str(t.task_type.value) if hasattr(t.task_type, 'value') else str(t.task_type)
        tasks_by_type[t_type] = tasks_by_type.get(t_type, 0) + 1

    # Event entries
    events = db.query(models.TaskEvent).filter(models.TaskEvent.user_id == user_id).all()
    total_event_hours = sum((e.hours_spent or 0) for e in events)
    avg_event_time = (total_event_hours / len(events)) if events else 0.0

    # Advanced Event Analysis
    loc_stats = {}
    type_stats = {}
    
    for e in events:
        loc = e.work_location or "Office"
        etype = str(e.event_type.value) if hasattr(e.event_type, 'value') else str(e.event_type)
        hrs = e.hours_spent or 0.0
        
        if loc not in loc_stats: loc_stats[loc] = {'total': 0.0, 'count': 0}
        loc_stats[loc]['total'] += hrs
        loc_stats[loc]['count'] += 1
        
        if etype not in type_stats: type_stats[etype] = {'total': 0.0, 'count': 0}
        type_stats[etype]['total'] += hrs
        type_stats[etype]['count'] += 1

    location_analysis = []
    for loc, data in loc_stats.items():
        location_analysis.append({
            "category": loc,
            "total_hours": round(data['total'], 2),
            "avg_hours": round(data['total'] / data['count'], 2) if data['count'] > 0 else 0,
            "entry_count": data['count']
        })

    event_type_analysis = []
    for etype, data in type_stats.items():
        event_type_analysis.append({
            "category": etype,
            "total_hours": round(data['total'], 2),
            "avg_hours": round(data['total'] / data['count'], 2) if data['count'] > 0 else 0,
            "entry_count": data['count']
        })

    # Deadlines met (For completed tasks: completed on or before due date)
    completed_tasks = [t for t in tasks if t.status == models.TaskStatus.COMPLETED]
    deadlines_met_count = 0
    t_has_dueDate = 0
    for t in completed_tasks:
        if t.due_date:
            t_has_dueDate += 1
            comp_time = t.updated_at or datetime.utcnow()
            if comp_time.date() <= t.due_date.date():
                deadlines_met_count += 1
    deadlines_met_pct = (deadlines_met_count / t_has_dueDate * 100) if t_has_dueDate > 0 else 0.0

    # Agenda (Upcoming incomplete tasks and milestones)
    agenda_items = []
    # Add tasks
    for t in open_tasks:
        if t.due_date:
            agenda_items.append({
                "id": t.id,
                "type": "Task",
                "title": t.description,
                "due_date": t.due_date,
                "status": str(t.status.value) if hasattr(t.status, 'value') else str(t.status),
                "priority": str(t.priority) if t.priority else "Medium"
            })
    
    # Add milestones where user is owner
    milestones = db.query(models.Milestone).filter(models.Milestone.owner_id == user_id, models.Milestone.is_completed == False).all()
    for m in milestones:
        if m.due_date:
            agenda_items.append({
                "id": m.id,
                "type": "Milestone",
                "title": m.name,
                "due_date": m.due_date,
                "status": "In Progress" if m.progress and m.progress > 0 else "Pending",
                "priority": "High"
            })
            
    # Sort agenda chronologically
    agenda_items.sort(key=lambda x: x["due_date"])

    return schemas.UserDashboardMetrics(
        login_count=login_count,
        total_tasks_assigned=total_tasks_assigned,
        avg_task_completion=avg_task_completion,
        tasks_by_type=tasks_by_type,
        total_event_hours=round(total_event_hours, 2),
        avg_event_time=round(avg_event_time, 2),
        deadlines_met_pct=round(deadlines_met_pct, 2),
        agenda_items=agenda_items,
        event_type_analysis=event_type_analysis,
        location_analysis=location_analysis
    )

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.User).options(
        joinedload(models.User.customer),
        joinedload(models.User.location),
        joinedload(models.User.manager),
        selectinload(models.User.direct_reports),
        selectinload(models.User.notifications)
    ).order_by(models.User.username.asc()).offset(skip).limit(limit).all()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate, current_user: models.User = None):
    from fastapi import HTTPException
    
    location_name = None
    if user.location_id:
        loc = db.query(models.Location).filter(models.Location.id == user.location_id).first()
        if loc:
            location_name = loc.name
            
    if location_name == "Triad Asia" and getattr(user, 'has_financial_access', False):
        raise HTTPException(status_code=400, detail="Users in Location Triad Asia cannot be granted Financial Access.")
        
    import secrets
    import string
    
    generated_password = None
    hashed_password = None
    
    if getattr(user, 'login_enabled', False):
        if not getattr(user, 'password', None):
            generated_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
            raw_password = generated_password
            user.needs_password_change = True
        else:
            raw_password = user.password

        hashed_password = auth.get_password_hash(raw_password)
    # Check if current_user provided (might be initial seed or admin)
    creator_id = current_user.id if current_user else None
    
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        customer_id=user.customer_id,
        location_id=user.location_id,
        first_name=user.first_name,
        last_name=user.last_name,
        title=user.title,
        is_active=user.is_active,
        is_employee=user.is_employee,
        login_enabled=user.login_enabled,
        needs_password_change=user.needs_password_change,
        created_by_id=creator_id,
        updated_by_id=creator_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if db_user.is_employee and db_user.email:
        from .mail import send_system_email
        subject = "Welcome to PACE - Account Activated"
        body = f"Hello {db_user.first_name or db_user.username},\n\nYour employee account has been securely created.\n\nUsername: {db_user.username}"
        if generated_password:
            body += f"\nTemporary Password: {generated_password}\n\nPlease log in and change your password immediately."
        else:
            body += "\n\nPlease use the 'Forgot Password' feature on the login screen to set up your password."
        
        send_system_email([db_user.email], subject, body)

    return db_user

def update_user(db: Session, user_id: int, user: schemas.UserUpdate, current_user: models.User):
    from fastapi import HTTPException
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    
    data = user.model_dump(exclude_unset=True)
    
    final_location_id = data.get('location_id', db_user.location_id)
    final_financial = data.get('has_financial_access', db_user.has_financial_access)
    
    location_name = None
    if final_location_id:
        loc = db.query(models.Location).filter(models.Location.id == final_location_id).first()
        if loc:
            location_name = loc.name
            
    if location_name == "Triad Asia" and final_financial:
        raise HTTPException(status_code=400, detail="Users in Location Triad Asia cannot be granted Financial Access.")
    if 'password' in data and data['password']:
        data['hashed_password'] = auth.get_password_hash(data.pop('password'))
    
    for key, value in data.items():
        setattr(db_user, key, value)
    
    if current_user:
        db_user.updated_by_id = current_user.id
        db_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None
        
    # Usage Check: Projects (as PM or Created By)
    if db.query(models.Project).filter(
        (models.Project.pm_id == user_id) | 
        (models.Project.customer_pm_id == user_id) |
        (models.Project.created_by_id == user_id) |
        (models.Project.updated_by_id == user_id) 
    ).first():
        raise ValueError("Cannot delete user linked to Projects (as PM, Creator, or Updater).")

    # Usage Check: Milestones (Owner)
    if db.query(models.Milestone).filter(models.Milestone.owner_id == user_id).first():
        raise ValueError("Cannot delete user assigned to Milestones.")

    # Usage Check: Leads (POC)
    if db.query(models.Lead).filter(models.Lead.poc_id == user_id).first():
        raise ValueError("Cannot delete user who is a Point of Contact for Leads.")
        
    # Usage Check: Comments
    if db.query(models.Comment).filter(models.Comment.user_id == user_id).first():
        raise ValueError("Cannot delete user who has posted comments.")
        
    # Usage Check: Invoice (Creator/Updater)
    if db.query(models.Invoice).filter(
        (models.Invoice.created_by_id == user_id) | 
        (models.Invoice.updated_by_id == user_id)
    ).first():
        raise ValueError("Cannot delete user who has created financial records (Invoices).")

    db.delete(user)
    db.commit()
    return True

def get_customers(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.Customer).options(selectinload(models.Customer.locations)).order_by(models.Customer.name.asc()).offset(skip).limit(limit).all()

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def create_customer(db: Session, customer: schemas.CustomerCreate, current_user: models.User):
    # db_cust = models.Customer(**customer.model_dump())
    # Manually unpack to inject audit
    data = customer.model_dump()
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    data.pop('is_owner', None)
    
    db_cust = models.Customer(**data)
    db.add(db_cust)
    db.commit()
    db.refresh(db_cust)
    return db_cust

def update_customer(db: Session, customer_id: int, customer: schemas.CustomerUpdate, current_user: models.User):
    db_cust = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_cust:
        return None
    
    for key, value in customer.model_dump(exclude_unset=True).items():
        if key == 'is_owner':
            continue
        setattr(db_cust, key, value)
    
    if current_user:
        db_cust.updated_by_id = current_user.id
        db_cust.updated_at = datetime.utcnow()
        
    db.commit()
    db.refresh(db_cust)
    return db_cust

def delete_customer(db: Session, customer_id: int):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        return None
    
    # Usage Check: Users
    user_count = db.query(models.User).filter(models.User.customer_id == customer_id).count()
    if user_count > 0:
        raise ValueError(f"Cannot delete customer: Linked to {user_count} User(s).")
        
    # Usage Check: Projects
    project_count = db.query(models.Project).filter(models.Project.customer_id == customer_id).count()
    if project_count > 0:
         raise ValueError(f"Cannot delete customer: Linked to {project_count} Project(s).")
        
    # Usage Check: Leads
    lead_count = db.query(models.Lead).filter(models.Lead.customer_id == customer_id).count()
    if lead_count > 0:
        raise ValueError(f"Cannot delete customer: Linked to {lead_count} Lead(s).")

    db.delete(customer)
    db.commit()
    return True

# --- Location CRUD ---
def get_locations(db: Session, customer_id: int = None, skip: int = 0, limit: int = 500000):
    query = db.query(models.Location)
    if customer_id:
        query = query.filter(models.Location.customer_id == customer_id)
    return query.order_by(models.Location.name.asc()).offset(skip).limit(limit).all()

def create_location(db: Session, location: schemas.LocationCreate, current_user: models.User):
    data = location.model_dump()
    valid_keys = ['name', 'address', 'customer_id', 'latitude', 'longitude', 'pay_period_cycle', 'weekly_work_hours', 'auto_pto_calculation', 'payroll_start_date']
    clean_data = {k: v for k, v in data.items() if k in valid_keys}
    clean_data['created_by_id'] = current_user.id
    clean_data['updated_by_id'] = current_user.id
    
    db_loc = models.Location(**clean_data)
    db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc

def update_location(db: Session, location_id: int, location: schemas.LocationUpdate, current_user: models.User):
    db_loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not db_loc:
        return None
    
    valid_keys = ['name', 'address', 'customer_id', 'latitude', 'longitude', 'pay_period_cycle', 'weekly_work_hours', 'auto_pto_calculation', 'payroll_start_date']
    for key, value in location.model_dump(exclude_unset=True).items():
        if key in valid_keys:
            setattr(db_loc, key, value)
    
    if current_user:
        db_loc.updated_by_id = current_user.id
        db_loc.updated_at = datetime.utcnow()
        
    db.commit()
    db.refresh(db_loc)
    return db_loc

def delete_location(db: Session, location_id: int):
    loc = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not loc:
        return None
    
    # Check usage
    if db.query(models.User).filter(models.User.location_id == location_id).count() > 0:
        raise ValueError("Cannot delete location linked to Users.")
    
    if db.query(models.Project).filter(models.Project.location_id == location_id).count() > 0:
        raise ValueError("Cannot delete location linked to Projects.")

    db.delete(loc)
    db.commit()
    return True

# --- Project CRUD ---
def get_project(db: Session, project_id: int):
    return db.query(models.Project).options(
        joinedload(models.Project.customer),
        joinedload(models.Project.location),
        joinedload(models.Project.lead),
        joinedload(models.Project.pm_user),
        joinedload(models.Project.customer_pm_user),
        joinedload(models.Project.created_by_user),
        joinedload(models.Project.updated_by_user),
        selectinload(models.Project.attachments),
        selectinload(models.Project.invoices),
        selectinload(models.Project.milestones).selectinload(models.Milestone.tasks).selectinload(models.Task.events),
        selectinload(models.Project.milestones).selectinload(models.Milestone.line_items),
        selectinload(models.Project.expenses).selectinload(models.Expense.attachments)
    ).filter(models.Project.id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 500000, unbilled_only: bool = False):
    query = db.query(models.Project).options(
        selectinload(models.Project.milestones).selectinload(models.Milestone.line_items),
        selectinload(models.Project.invoices),
        joinedload(models.Project.customer),
        joinedload(models.Project.location),
        joinedload(models.Project.pm_user),
        joinedload(models.Project.created_by_user)
    )
    if unbilled_only:
        # Check if project has ANY milestone where invoice_id is None
        query = query.filter(models.Project.milestones.any(models.Milestone.invoice_id == None))
        
    return query.order_by(models.Project.name.asc()).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, current_user: models.User):
    # Auto-generate Project ID: PROJ-{0001}
    last_project = db.query(models.Project).order_by(models.Project.id.desc()).first()
    next_id = 1
    if last_project:
        next_id = last_project.id + 1
    
    data = project.model_dump()
    if not data.get('due_date'):
        data['due_date'] = datetime.utcnow() + timedelta(days=30)

    data['project_unique_id'] = f"PROJ-{next_id:04d}"
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_project = models.Project(**data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Auto-generate custom ID if not provided: P-{id}
    if not project.project_unique_id:
        db_project.project_unique_id = f"P-{db_project.id}"
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
    
    # Auto-convert Lead if linked
    if db_project.lead_id:
        lead = db.query(models.Lead).filter(models.Lead.id == db_project.lead_id).first()
        if lead and lead.status != models.LeadStatus.CONVERTED:
            lead.status = models.LeadStatus.CONVERTED
            db.commit()
            
    return db_project

def update_project(db: Session, project_id: int, project: schemas.ProjectUpdate, current_user: models.User):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        return None
    
    update_data = project.model_dump(exclude_unset=True)
    
    if update_data.get('do_not_invoice') is True and not db_project.do_not_invoice:
        if getattr(db_project, 'invoices', []):
            raise ValueError("Cannot set 'Do Not Invoice' because this project already has existing invoices.")

    for key, value in update_data.items():
        if key != 'force_complete':
            setattr(db_project, key, value)
            
    # Evaluation hooks for Completeness Override
    if getattr(db_project, 'status', None) == models.ProjectStatus.COMPLETED:
        has_open_items = False
        
        # Check Milestones
        for m in getattr(db_project, 'milestones', []):
            if not getattr(m, 'is_completed', False):
                has_open_items = True
                
        # Check Invoices
        for i in getattr(db_project, 'invoices', []):
            if getattr(i, 'status', None) != models.InvoiceStatus.PAID:
                has_open_items = True

        force = getattr(project, 'force_complete', False)
        
        if has_open_items and not force:
            raise ValueError("FORCE_COMPLETE_REQUIRED: Project has open milestones or unpaid invoices.")
            
        if force:
            for t in getattr(db_project, 'tasks', []):
                if getattr(t, 'status', None) != models.TaskStatus.COMPLETED:
                    t.status = models.TaskStatus.COMPLETED
                    t.progress = 100
            for m in getattr(db_project, 'milestones', []):
                if not getattr(m, 'is_completed', False):
                    m.is_completed = True
                    m.progress = 100
    
    if current_user:
        db_project.updated_by_id = current_user.id
        db_project.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return None
    
    # Check for invoiced milestones
    invoiced_milestones = [m for m in project.milestones if m.invoice_id is not None]
    if invoiced_milestones:
        raise ValueError("Cannot delete project with invoiced milestones. Maintinaing financial history.")
    
    # Delete associated milestones (cascade)
    for milestone in project.milestones:
        db.delete(milestone)
        
    # Revert Lead status if linked
    if project.lead_id:
        lead = db.query(models.Lead).filter(models.Lead.id == project.lead_id).first()
        if lead:
            lead.status = models.LeadStatus.QUALIFIED
            # lead.project relationship will inherently be cleared when project is deleted
            
    db.delete(project)
    db.commit()
    return True

def clone_project(db: Session, project_id: int, options: schemas.ProjectCloneOptions, current_user: models.User):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        return None
        
    # Generate new unique ID
    last_project = db.query(models.Project).order_by(models.Project.id.desc()).first()
    next_id = 1
    if last_project:
        next_id = last_project.id + 1
        
    data = project.__dict__.copy()
    data.pop('_sa_instance_state', None)
    data.pop('id', None)
    data.pop('created_at', None)
    data.pop('updated_at', None)
    
    data['name'] = f"{data['name']} (Clone)"
    data['project_unique_id'] = f"P-{next_id}"
    data['status'] = models.ProjectStatus.ACTIVE
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    # Overwrite lead_id if provided
    if options.link_to_lead_id is not None:
        data['lead_id'] = options.link_to_lead_id
        lead = db.query(models.Lead).filter(models.Lead.id == options.link_to_lead_id).first()
        if lead and lead.status != models.LeadStatus.CONVERTED:
            lead.status = models.LeadStatus.CONVERTED
            db.add(lead)
            
    # Create new project instance
    new_project = models.Project(**{k: v for k, v in data.items() if hasattr(models.Project, k)})
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Overwrite project_unique_id safely and reliably to match create logic
    new_project.project_unique_id = f"P-{new_project.id}"
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
        
    # Clone Milestones and Tasks
    milestone_id_map = {}
    if options.clone_milestones:
        for ms in project.milestones:
            ms_data = ms.__dict__.copy()
            ms_data.pop('_sa_instance_state', None)
            old_ms_id = ms_data.pop('id', None)
            ms_data.pop('created_at', None)
            ms_data.pop('updated_at', None)
            
            ms_data['project_id'] = new_project.id
            ms_data['invoice_id'] = None
            ms_data['is_completed'] = False
            ms_data['progress'] = 0
            ms_data['created_by_id'] = current_user.id
            ms_data['updated_by_id'] = current_user.id
            
            new_ms = models.Milestone(**{k: v for k, v in ms_data.items() if hasattr(models.Milestone, k)})
            db.add(new_ms)
            db.flush() # get ID
            milestone_id_map[old_ms_id] = new_ms.id
        
    if options.clone_tasks:
        for task in project.tasks:
            task_data = task.__dict__.copy()
            task_data.pop('_sa_instance_state', None)
            task_data.pop('id', None)
            task_data.pop('created_at', None)
            task_data.pop('updated_at', None)
            
            task_data['project_id'] = new_project.id
            task_data['status'] = models.TaskStatus.OPEN
            task_data['progress'] = 0
            task_data['start_date'] = None
            task_data['due_date'] = None
            task_data['created_by_id'] = current_user.id
            task_data['updated_by_id'] = current_user.id
            
            if task_data.get('milestone_id') and options.clone_milestones:
                if task_data['milestone_id'] in milestone_id_map:
                    task_data['milestone_id'] = milestone_id_map[task_data['milestone_id']]
                else:
                    task_data['milestone_id'] = None
            elif task_data.get('milestone_id'):
                task_data['milestone_id'] = None

            new_task = models.Task(**{k: v for k, v in task_data.items() if hasattr(models.Task, k)})
            db.add(new_task)

    db.commit()
    return new_project

def smart_clone_execute(db: Session, payload: schemas.ProjectSmartCloneExecuteRequest, current_user: models.User):
    # Auto-generate new unique ID
    last_project = db.query(models.Project).order_by(models.Project.id.desc()).first()
    next_id = 1 if not last_project else last_project.id + 1
    
    # 1. Create Base Project
    db_proj = models.Project(
        name=payload.name,
        description=payload.description,
        project_unique_id=f"P-{next_id}",
        lead_id=payload.lead_id,
        customer_id=payload.customer_id,
        location_id=payload.location_id,
        budget=payload.budget,
        due_date=payload.due_date,
        project_type=payload.project_type or "Other",
        status=models.ProjectStatus.ACTIVE,
        created_by_id=current_user.id,
        updated_by_id=current_user.id
    )
    db.add(db_proj)
    db.flush()
    db_proj.project_unique_id = f"P-{db_proj.id}"
    
    # Update Lead
    lead = db.query(models.Lead).filter(models.Lead.id == payload.lead_id).first()
    if lead and lead.status != models.LeadStatus.CONVERTED:
        lead.status = models.LeadStatus.CONVERTED
        db.add(lead)
        
    # 2. Iterate Milestones
    for i, m_data in enumerate(payload.milestones):
        db_milestone = models.Milestone(
            project_id=db_proj.id,
            milestone_number=m_data.milestone_number if m_data.milestone_number is not None else i + 1,
            name=m_data.name,
            description=m_data.description,
            cost=m_data.cost,
            due_date=m_data.due_date,
            owner_id=m_data.owner_id,
            is_completed=False,
            progress=0,
            invoice_id=None,
            created_by_id=current_user.id,
            updated_by_id=current_user.id
        )
        db.add(db_milestone)
        db.flush()
        
        # 3. Iterate Tasks inside milestone
        for t_data in m_data.tasks:
            db_task = models.Task(
                project_id=db_proj.id,
                milestone_id=db_milestone.id,
                description=t_data.description,
                task_type=t_data.task_type or "Engineering",
                estimated_effort=t_data.estimated_effort,
                start_date=t_data.start_date,
                due_date=t_data.due_date,
                assigned_to_id=t_data.assigned_to_id,
                status=models.TaskStatus.OPEN,
                progress=0,
                created_by_id=current_user.id,
                updated_by_id=current_user.id
            )
            db.add(db_task)
            
    db.commit()
    db.refresh(db_proj)
    return db_proj

# --- Invoice CRUD ---
def get_invoices(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.Invoice).options(
        selectinload(models.Invoice.items).joinedload(models.LineItem.milestone), 
        joinedload(models.Invoice.project).joinedload(models.Project.customer),
        joinedload(models.Invoice.created_by_user),
        joinedload(models.Invoice.updated_by_user)
    ).order_by(models.Invoice.id.desc()).offset(skip).limit(limit).all()

def create_invoice(db: Session, invoice: schemas.InvoiceCreate, current_user: models.User):
    # Auto-generate Invoice Number: INV-{0001}
    last_inv = db.query(models.Invoice).order_by(models.Invoice.id.desc()).first()
    next_id = 1
    # Remove manual calculation to rely on DB AutoIncrement ID
    data = invoice.model_dump()
    import uuid
    # Use temporary unique ID to satisfy NOT NULL/UNIQUE constraint 
    temp_id = f"TEMP-{uuid.uuid4()}" 
    data['invoice_number'] = temp_id
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_invoice = models.Invoice(**data)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Update with generated ID: I-{id}
    db_invoice.invoice_number = f"I-{db_invoice.id}"
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)

    return db_invoice

def get_invoice(db: Session, invoice_id: int):
    return db.query(models.Invoice).options(
        selectinload(models.Invoice.items), 
        joinedload(models.Invoice.project).joinedload(models.Project.customer),
        joinedload(models.Invoice.created_by_user),
        joinedload(models.Invoice.updated_by_user)
    ).filter(models.Invoice.id == invoice_id).first()

def delete_invoice(db: Session, invoice_id: int):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        return None
    
    # 1. Check for linked milestones
    # 1. Audit Reversals for Milestones
    # Loop through items effectively
    for item in invoice.items:
        if item.milestone_id:
            # Create Reversal Audit
            audit = models.MilestoneAudit(
                 milestone_id=item.milestone_id,
                 invoice_id=None, # Invoice removed
                 invoice_number=invoice.invoice_number,
                 action=models.AuditAction.REVERSED,
                 amount=item.amount,
                 created_by_id=invoice.created_by_id, # Preserve original creator or use deleted_by if we had it
                 updated_by_id=invoice.updated_by_id # Just filler
            )
            db.add(audit)
            
    # Remove Line Items explicitly? 
    # Usually handled by cascade or just let DB delete.
    # But delete_invoice check previously blocked if items existed.
    # We should delete items first.
    for item in invoice.items:
        db.delete(item)
        
    # milestones = db.query(models.Milestone).filter(models.Milestone.invoice_id == invoice_id).all()
    # if milestones:
    #      raise ValueError("Cannot delete invoice with linked milestones. Remove milestones from invoice first.")
    
    # if invoice.items:
    #     raise ValueError("Cannot delete invoice with line items. Remove items first.")

    # 2. Unlink Milestones explicitly (Fix for IntegrityError)
    linked_milestones = db.query(models.Milestone).filter(models.Milestone.invoice_id == invoice_id).all()
    for m in linked_milestones:
        m.invoice_id = None
        m.is_completed = False # Optionally revert completion if it was set by invoicing
        db.add(m)

    # 3. Unlink Milestone Audits (Fix for IntegrityError)
    # Audits created for this invoice must be detached but preserved
    linked_audits = db.query(models.MilestoneAudit).filter(models.MilestoneAudit.invoice_id == invoice_id).all()
    for audit in linked_audits:
        audit.invoice_id = None
        db.add(audit)
        
    db.delete(invoice)
    db.commit()
    return True

# --- LineItem CRUD ---
def get_line_items(db: Session, invoice_id: int):
    return db.query(models.LineItem).filter(models.LineItem.invoice_id == invoice_id).all()

def create_line_item(db: Session, item: schemas.LineItemCreate, invoice_id: int):
    data = item.model_dump()
    data['amount'] = data['quantity'] * data['unit_price']
    data['invoice_id'] = invoice_id
    
    db_item = models.LineItem(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Milestone CRUD ---
def get_milestones(db: Session, project_id: int):
    return db.query(models.Milestone).options(
        joinedload(models.Milestone.audits),
        joinedload(models.Milestone.line_items),
        selectinload(models.Milestone.tasks).selectinload(models.Task.events),
        joinedload(models.Milestone.owner),
        joinedload(models.Milestone.created_by_user),
        joinedload(models.Milestone.updated_by_user)
    ).filter(models.Milestone.project_id == project_id).all()

def get_all_milestones(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.Milestone).options(
        joinedload(models.Milestone.project),
        joinedload(models.Milestone.owner)
    ).order_by(models.Milestone.name.asc()).offset(skip).limit(limit).all()

def create_milestone(db: Session, milestone: schemas.MilestoneCreate, project_id: int, current_user: models.User):
    # Calculate next milestone number for this project
    max_num = db.query(func.max(models.Milestone.milestone_number)).filter(models.Milestone.project_id == project_id).scalar()
    next_num = (max_num or 0) + 1

    data = milestone.model_dump()
    data['project_id'] = project_id
    data['milestone_number'] = next_num
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    if data.get('milestone_type') == 'FIXED':
        import datetime
        current_year = datetime.datetime.now().year
        data['due_date'] = datetime.datetime(current_year, 12, 31, 23, 59, 59)

    db_milestone = models.Milestone(**data)
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

def generate_invoice_from_milestones(db: Session, data: schemas.InvoiceGenerate, current_user: models.User):
    # 1. Create Invoice
    project = db.query(models.Project).options(joinedload(models.Project.customer)).filter(models.Project.id == data.project_id).first()
    
    calculated_due_date = data.due_date
    if project and project.customer:
        terms = project.customer.payment_terms or 30
        calculated_due_date = data.issue_date + timedelta(days=terms)
    
    import uuid
    temp_id = f"TEMP-{uuid.uuid4()}"
    
    db_invoice = models.Invoice(
        project_id=data.project_id,
        invoice_number=temp_id, # Tmp placeholder unique
        issue_date=data.issue_date,
        due_date=calculated_due_date,
        status=models.InvoiceStatus.DRAFT,
        created_by_id=current_user.id,
        updated_by_id=current_user.id
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # Update with I-{id}
    db_invoice.invoice_number = f"I-{db_invoice.id}"
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    # 2. Process Milestones
    
    # Pre-fetch all requested milestones to enable proper chronological sorting defined by project
    milestone_ids = [item.milestone_id for item in data.items]
    milestone_objects = db.query(models.Milestone).filter(models.Milestone.id.in_(milestone_ids)).all()
    milestone_map = {m.id: m for m in milestone_objects}
    
    # Sort data.items based on the milestone's milestone_number so line items generate in identical order
    sorted_items = sorted(data.items, key=lambda i: milestone_map[i.milestone_id].milestone_number if i.milestone_id in milestone_map else 0)

    for item in sorted_items:
        milestone = milestone_map.get(item.milestone_id)
        if not milestone:
            continue
            
        # Calculate Bill Amount
        bill_amount = 0.0
        percentage = None
        
        cost = milestone.cost or 0.0
        
        # Calculate current billed (fresh query to be safe or use relationship if eager loaded)
        # Using relationship 'line_items'
        billed_so_far = sum((li.amount or 0.0) for li in milestone.line_items)
        remaining = cost - billed_so_far
        
        if item.amount is not None:
            bill_amount = item.amount
            if cost > 0:
                percentage = (bill_amount / cost) * 100
        elif item.percentage is not None:
            percentage = item.percentage
            bill_amount = cost * (percentage / 100.0)
        else:
            # Default to remaining
            bill_amount = remaining
            if cost > 0:
                percentage = (bill_amount / cost) * 100

        # Cap at remaining? (Optional, maybe user wants to overbill? Let's assume strict for now, but allow small epsilon)
        if bill_amount > (remaining + 0.01):
             # Just warn or clamp? Let's proceed, user might know what they are doing (e.g. costs changed).
             pass

        # Create Line Item
        desc = milestone.line_item_name if getattr(milestone, 'line_item_name', None) else (
            f"Milestone #{milestone.milestone_number}: {milestone.name} ({percentage:.1f}%)" if percentage else f"Milestone #{milestone.milestone_number}: {milestone.name}"
        )
        line_item = models.LineItem(
            invoice_id=db_invoice.id,
            description=desc,
            quantity=1.0,
            unit_price=bill_amount,
            amount=bill_amount,
            milestone_id=milestone.id
        )
        db.add(line_item)
        
        # Create Audit Log
        audit = models.MilestoneAudit(
            milestone_id=milestone.id,
            invoice_id=db_invoice.id,
            invoice_number=db_invoice.invoice_number,
            action=models.AuditAction.BILLED,
            amount=bill_amount,
            percentage=percentage,
            created_by_id=current_user.id,
            updated_by_id=current_user.id
        )
        db.add(audit)
    
    db.commit()
    return db_invoice

# --- Update/Delete Operations ---

def update_milestone(db: Session, milestone_id: int, update_data: schemas.MilestoneUpdate, current_user: models.User):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
    data = update_data.model_dump(exclude_unset=True)
    
    if milestone.invoice_id:
        blocked_fields = ['cost', 'name', 'due_date', 'description']
        for field in blocked_fields:
            if field in data and data[field] != getattr(milestone, field):
                raise ValueError(f"Cannot edit {field} of invoiced milestone. Remove from invoice first.")

    for key, value in data.items():
        if key != 'force_complete':
            setattr(milestone, key, value)
            
    # Evaluation hooks for Completeness Override
    if getattr(milestone, 'is_completed', False) or getattr(milestone, 'progress', 0) == 100:
        has_open_tasks = any(getattr(t, 'status', None) != models.TaskStatus.COMPLETED for t in getattr(milestone, 'tasks', []))
        force = getattr(update_data, 'force_complete', False)
        
        if has_open_tasks and not force:
            raise ValueError("FORCE_COMPLETE_REQUIRED: Milestone has open tasks.")
            
        milestone.is_completed = True
        milestone.progress = 100
        
        if force or not has_open_tasks:
            for t in getattr(milestone, 'tasks', []):
                if getattr(t, 'status', None) != models.TaskStatus.COMPLETED:
                    t.status = models.TaskStatus.COMPLETED
                    t.progress = 100
    
    if current_user:
        milestone.updated_by_id = current_user.id
        milestone.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(milestone)
    return milestone

def delete_milestone(db: Session, milestone_id: int):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
    if milestone.invoice_id:
        raise ValueError("Cannot delete invoiced milestone")
    
    db.delete(milestone)
    db.commit()
    return True

def update_line_item(db: Session, item_id: int, update_data: schemas.LineItemUpdate):
    item = db.query(models.LineItem).filter(models.LineItem.id == item_id).first()
    if not item:
        return None
    
    data = update_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    
    item.amount = item.quantity * item.unit_price
    
    db.commit()
    db.refresh(item)
    return item

def delete_line_item(db: Session, item_id: int):
    item = db.query(models.LineItem).filter(models.LineItem.id == item_id).first()
    if not item:
        return None
    
    if item.milestone_id:
        milestone = db.query(models.Milestone).filter(models.Milestone.id == item.milestone_id).first()
        if milestone:
            milestone.invoice_id = None
            milestone.is_completed = False # Revert completion status
            db.add(milestone)
            
            # Create Reversal Audit for this single item
            audit = models.MilestoneAudit(
                 milestone_id=milestone.id,
                 invoice_id=item.invoice_id,
                 invoice_number=item.invoice.invoice_number if item.invoice else None,
                 action=models.AuditAction.REVERSED,
                 amount=item.amount,
                 percentage=None, # Cannot easily know original percentage unless stored in item description or calculated
                 created_by_id=item.invoice.updated_by_id if item.invoice else None,
                 updated_by_id=item.invoice.updated_by_id if item.invoice else None
            )
            db.add(audit)

    db.delete(item)
    db.commit()
    return True

# --- Lead CRUD ---
def get_leads(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.Lead).options(
        joinedload(models.Lead.project),
        joinedload(models.Lead.customer),
        joinedload(models.Lead.poc),
        joinedload(models.Lead.created_by_user),
        joinedload(models.Lead.updated_by_user),
        joinedload(models.Lead.location),
        joinedload(models.Lead.milestone)
    ).order_by(models.Lead.name.asc()).offset(skip).limit(limit).all()

def create_lead(db: Session, lead: schemas.LeadCreate, current_user: models.User):
    data = lead.model_dump()
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_lead = models.Lead(**data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_lead(db: Session, lead_id: int, lead: schemas.LeadCreate, current_user: models.User):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        return None
    
    for key, value in lead.model_dump(exclude_unset=True).items():
        setattr(db_lead, key, value)
    
    if current_user:
        db_lead.updated_by_id = current_user.id
        db_lead.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_leads_bulk(db: Session, leads: list[schemas.LeadBulkUpdate], current_user: models.User):
    now = datetime.utcnow()
    updated_ids = []
    # Fast bulk update using iterative ORM loop (since complexity isn't huge and we want hooks/audit trails)
    for lead_data in leads:
        db_lead = db.query(models.Lead).filter(models.Lead.id == lead_data.id).first()
        if db_lead:
            for key, value in lead_data.model_dump(exclude_unset=True).items():
                if key != 'id':
                    setattr(db_lead, key, value)
            if current_user:
                db_lead.updated_by_id = current_user.id
                db_lead.updated_at = now
            updated_ids.append(db_lead.id)
    
    db.commit()
    return db.query(models.Lead).filter(models.Lead.id.in_(updated_ids)).all()

def delete_lead(db: Session, lead_id: int):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None
    
    # Validation: Check if linked to any project
    project_link = db.query(models.Project).filter(models.Project.lead_id == lead_id).first()
    if project_link:
        raise ValueError(f"Cannot delete lead: Linked to Project '{project_link.name}' ({project_link.project_unique_id}).")
    
    db.delete(lead)
    db.commit()
    return True

def clone_lead(db: Session, lead_id: int, current_user: models.User):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None
        
    data = lead.__dict__.copy()
    data.pop('_sa_instance_state', None)
    data.pop('id', None)
    data.pop('created_at', None)
    data.pop('updated_at', None)
    
    data['name'] = f"{data['name']} (Clone)"
    data['status'] = models.LeadStatus.NEW
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    new_lead = models.Lead(**{k: v for k, v in data.items() if hasattr(models.Lead, k)})
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead

# --- Comment CRUD ---
def get_comments(db: Session, project_id: int):
    return db.query(models.Comment).filter(models.Comment.project_id == project_id).order_by(models.Comment.created_at.desc()).options(joinedload(models.Comment.user)).all()

def get_task_comments(db: Session, task_id: int):
    return db.query(models.Comment).filter(models.Comment.task_id == task_id).order_by(models.Comment.created_at.desc()).options(joinedload(models.Comment.user)).all()

def create_comment(db: Session, comment: schemas.CommentCreate, user_id: int):
    db_comment = models.Comment(**comment.model_dump(), user_id=user_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

# --- Task System CRUD ---
def get_tasks(db: Session, skip: int = 0, limit: int = 500000, 
              assigned_to_id: Optional[int] = None, 
              task_type: Optional[models.TaskType] = None,
              hide_completed: bool = False):
    
    query = db.query(models.Task).options(
        joinedload(models.Task.assigned_to),
        joinedload(models.Task.project),
        joinedload(models.Task.milestone),
        joinedload(models.Task.created_by_user),
        joinedload(models.Task.updated_by_user),
        selectinload(models.Task.events).joinedload(models.TaskEvent.user)
    )
    
    if assigned_to_id:
        query = query.filter(models.Task.assigned_to_id == assigned_to_id)
        
    if task_type:
        query = query.filter(models.Task.task_type == task_type)
        
    if hide_completed:
        query = query.filter(models.Task.status != models.TaskStatus.COMPLETED)
        
    return query.order_by(models.Task.status.asc(), models.Task.due_date.asc()).offset(skip).limit(limit).all()

def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).options(
        joinedload(models.Task.assigned_to),
        joinedload(models.Task.project),
        joinedload(models.Task.milestone),
        joinedload(models.Task.created_by_user),
        selectinload(models.Task.events).joinedload(models.TaskEvent.user)
    ).first()

# --- Update/Delete Operations ---

def update_milestone(db: Session, milestone_id: int, update_data: schemas.MilestoneUpdate, current_user: models.User):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
    data = update_data.model_dump(exclude_unset=True)
    
    if milestone.invoice_id:
        blocked_fields = ['cost', 'name', 'due_date', 'description']
        for field in blocked_fields:
            if field in data and data[field] != getattr(milestone, field):
                raise ValueError(f"Cannot edit {field} of invoiced milestone. Remove from invoice first.")

    for key, value in data.items():
        if key != 'force_complete':
            setattr(milestone, key, value)
            
    # Evaluation hooks for Completeness Override
    if getattr(milestone, 'is_completed', False) or getattr(milestone, 'progress', 0) == 100:
        has_open_tasks = any(getattr(t, 'status', None) != models.TaskStatus.COMPLETED for t in getattr(milestone, 'tasks', []))
        force = getattr(update_data, 'force_complete', False)
        
        if has_open_tasks and not force:
            raise ValueError("FORCE_COMPLETE_REQUIRED: Milestone has open tasks.")
            
        milestone.is_completed = True
        milestone.progress = 100
        
        if force or not has_open_tasks:
            for t in getattr(milestone, 'tasks', []):
                if getattr(t, 'status', None) != models.TaskStatus.COMPLETED:
                    t.status = models.TaskStatus.COMPLETED
                    t.progress = 100
    
    if current_user:
        milestone.updated_by_id = current_user.id
        milestone.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(milestone)
    return milestone

def delete_milestone(db: Session, milestone_id: int):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
    if milestone.invoice_id:
        raise ValueError("Cannot delete invoiced milestone")
    
    db.delete(milestone)
    db.commit()
    return True

def clone_milestone(db: Session, milestone_id: int, current_user: models.User):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
        
    from sqlalchemy.orm import class_mapper, ColumnProperty
    data = {}
    for prop in class_mapper(models.Milestone).iterate_properties:
        if isinstance(prop, ColumnProperty):
            key = prop.key
            if key not in ["id", "created_at", "updated_at"]:
                data[key] = getattr(milestone, key)
    
    data['name'] = f"{data.get('name', 'Milestone')} (Clone)"
    data['is_completed'] = False
    data['progress'] = 0
    data['invoice_id'] = None
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    new_milestone = models.Milestone(**data)
    db.add(new_milestone)
    db.commit()
    db.refresh(new_milestone)
    return new_milestone

def update_line_item(db: Session, item_id: int, update_data: schemas.LineItemUpdate):
    item = db.query(models.LineItem).filter(models.LineItem.id == item_id).first()
    if not item:
        return None
    
    data = update_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    
    item.amount = item.quantity * item.unit_price
    
    db.commit()
    db.refresh(item)
    return item

def delete_line_item(db: Session, item_id: int):
    item = db.query(models.LineItem).filter(models.LineItem.id == item_id).first()
    if not item:
        return None
    
    if item.milestone_id:
        milestone = db.query(models.Milestone).filter(models.Milestone.id == item.milestone_id).first()
        if milestone:
            milestone.invoice_id = None
            milestone.is_completed = False # Revert completion status
            db.add(milestone)
            
            # Create Reversal Audit for this single item
            audit = models.MilestoneAudit(
                 milestone_id=milestone.id,
                 invoice_id=item.invoice_id,
                 invoice_number=item.invoice.invoice_number if item.invoice else None,
                 action=models.AuditAction.REVERSED,
                 amount=item.amount,
                 percentage=None, # Cannot easily know original percentage unless stored in item description or calculated
                 created_by_id=item.invoice.updated_by_id if item.invoice else None,
                 updated_by_id=item.invoice.updated_by_id if item.invoice else None
            )
            db.add(audit)

    db.delete(item)
    db.commit()
    return True

# --- Lead CRUD ---
def get_leads(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.Lead).options(
        joinedload(models.Lead.project),
        joinedload(models.Lead.customer),
        joinedload(models.Lead.poc),
        joinedload(models.Lead.created_by_user),
        joinedload(models.Lead.updated_by_user),
        joinedload(models.Lead.location),
        joinedload(models.Lead.milestone)
    ).order_by(models.Lead.name.asc()).offset(skip).limit(limit).all()

def create_lead(db: Session, lead: schemas.LeadCreate, current_user: models.User):
    data = lead.model_dump()
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_lead = models.Lead(**data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_lead(db: Session, lead_id: int, lead: schemas.LeadCreate, current_user: models.User):
    db_lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not db_lead:
        return None
    
    for key, value in lead.model_dump(exclude_unset=True).items():
        setattr(db_lead, key, value)
    
    if current_user:
        db_lead.updated_by_id = current_user.id
        db_lead.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def delete_lead(db: Session, lead_id: int):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None
    
    # Validation: Check if linked to any project
    project_link = db.query(models.Project).filter(models.Project.lead_id == lead_id).first()
    if project_link:
        raise ValueError(f"Cannot delete lead: Linked to Project '{project_link.name}' ({project_link.project_unique_id}).")
    
    db.delete(lead)
    db.commit()
    return True

def clone_lead(db: Session, lead_id: int, current_user: models.User):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        return None
        
    data = lead.__dict__.copy()
    data.pop('_sa_instance_state', None)
    data.pop('id', None)
    data.pop('created_at', None)
    data.pop('updated_at', None)
    
    data['name'] = f"{data['name']} (Clone)"
    data['status'] = models.LeadStatus.NEW
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    new_lead = models.Lead(**{k: v for k, v in data.items() if hasattr(models.Lead, k)})
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead

# --- Comment CRUD ---
def get_comments(db: Session, project_id: int):
    return db.query(models.Comment).filter(models.Comment.project_id == project_id).order_by(models.Comment.created_at.desc()).options(joinedload(models.Comment.user)).all()

def create_comment(db: Session, comment: schemas.CommentCreate, user_id: int):
    db_comment = models.Comment(**comment.model_dump(), user_id=user_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

# --- Task System CRUD ---
def get_tasks(db: Session, skip: int = 0, limit: int = 500000, 
              assigned_to_id: Optional[int] = None, 
              task_type: Optional[models.TaskType] = None,
              hide_completed: bool = False,
              project_id: Optional[int] = None):
    
    query = db.query(models.Task).options(
        joinedload(models.Task.assigned_to),
        joinedload(models.Task.project),
        joinedload(models.Task.milestone),
        joinedload(models.Task.created_by_user),
        joinedload(models.Task.updated_by_user),
        selectinload(models.Task.events).joinedload(models.TaskEvent.user)
    )
    
    if assigned_to_id:
        from sqlalchemy import or_
        query = query.filter(or_(
            models.Task.assigned_to_id == assigned_to_id,
            models.Task.task_type == models.TaskType.FIXED
        ))
        
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
        
    if task_type:
        query = query.filter(models.Task.task_type == task_type)
        
    if hide_completed:
        query = query.filter(models.Task.status != models.TaskStatus.COMPLETED)
        
    return query.order_by(models.Task.status.asc(), models.Task.due_date.asc()).offset(skip).limit(limit).all()

def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).options(
        joinedload(models.Task.assigned_to),
        joinedload(models.Task.project),
        joinedload(models.Task.milestone),
        joinedload(models.Task.created_by_user),
        selectinload(models.Task.events).joinedload(models.TaskEvent.user)
    ).first()

def create_task(db: Session, task: schemas.TaskCreate, current_user: models.User):
    data = task.model_dump()
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    if data.get('task_type') == 'FIXED':
        import datetime
        current_year = datetime.datetime.now().year
        data['start_date'] = datetime.date(current_year, 1, 1)
        data['due_date'] = datetime.date(current_year, 12, 31)
        data['estimated_effort'] = 0.0
        data['priority'] = getattr(models.TaskPriority, 'LOW', 'Low') # Fallback to string if enum differs
        data['assigned_to_id'] = None
    elif not data.get('assigned_to_id'):
        data['assigned_to_id'] = current_user.id
        
    new_task = models.Task(**data)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, current_user: models.User):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        return None
        
    data = task_update.model_dump(exclude_unset=True)
    
    if 'status' in data and data['status'] == models.TaskStatus.COMPLETED:
        is_creator = (db_task.created_by_id == current_user.id)
        is_assigned = (db_task.assigned_to_id == current_user.id)
        if is_assigned and not is_creator:
             data['status'] = models.TaskStatus.PENDING_APPROVAL
    
    for key, value in data.items():
        setattr(db_task, key, value)
        
    db_task.updated_by_id = current_user.id
    db_task.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
    db.delete(task)
    db.commit()
    return True

def clone_task(db: Session, task_id: int, current_user: models.User):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
        
    data = task.__dict__.copy()
    data.pop('_sa_instance_state', None)
    data.pop('id', None)
    
    data['total_hours_spent'] = 0.0
    data['status'] = models.TaskStatus.PENDING
    data['description'] = f"{data.get('description', 'Task')} (Copy)"
    data.pop('created_at', None)
    data.pop('updated_at', None)
    
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    new_task = models.Task(**data)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

def create_task_event(db: Session, task_id: Optional[int], event: schemas.TaskEventCreate, current_user: models.User):
    # Support Global Milestones via event.milestone_id, or task_id logic
    final_task_id = event.task_id if event.task_id else task_id
    db_event = models.TaskEvent(
        task_id=final_task_id,
        milestone_id=event.milestone_id,
        user_id=current_user.id,
        content=event.content,
        hours_spent=event.hours_spent,
        event_date=event.event_date,
        start_time=event.start_time,
        end_time=event.end_time
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_task_event(db: Session, event_id: int, event_update: schemas.TaskEventUpdate, current_user: models.User):
    db_event = db.query(models.TaskEvent).filter(models.TaskEvent.id == event_id).first()
    if not db_event:
        return None
    
    for key, value in event_update.model_dump(exclude_unset=True).items():
        setattr(db_event, key, value)
        
    db.commit()
    db.refresh(db_event)
    return db_event

def delete_task_event(db: Session, event_id: int):
    db_event = db.query(models.TaskEvent).filter(models.TaskEvent.id == event_id).first()
    if not db_event:
        return False
        
    db.delete(db_event)
    db.commit()
    return True

def get_task_analysis_report(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None, user_id: Optional[int] = None, task_type: Optional[str] = None):
    # Base query for events
    query = db.query(models.TaskEvent)
    
    if task_type:
        query = query.join(models.Task).filter(models.Task.task_type == task_type)
        
    if start_date:
        query = query.filter(func.date(models.TaskEvent.event_date) >= start_date)
    if end_date:
        query = query.filter(func.date(models.TaskEvent.event_date) <= end_date)
    if user_id:
        query = query.filter(models.TaskEvent.user_id == user_id)
        
    events = query.all()
    
    # Aggregations
    total_hours = sum(n.hours_spent for n in events)
    
    # By User
    user_hours = {}
    for n in events:
        u_name = n.user.username if n.user else "Unknown"
        user_hours[u_name] = user_hours.get(u_name, 0) + n.hours_spent
        
    by_user = [{"username": k, "hours_logged": v} for k,v in user_hours.items()]
    
    # By Type (Need to access Task)
    type_hours = {}
    task_hours_in_period = {} # Map task_id -> hours
    
    for n in events:
        task_type_label = n.task.task_type if n.task else "Unknown"
        type_hours[task_type_label] = type_hours.get(task_type_label, 0) + n.hours_spent
        
        task_hours_in_period[n.task_id] = task_hours_in_period.get(n.task_id, 0) + n.hours_spent

    by_type = [{"task_type": k, "hours_logged": v} for k,v in type_hours.items()]
    
    # By Location
    loc_hours = {}
    for n in events:
        l_name = n.work_location if hasattr(n, 'work_location') and n.work_location else "Office"
        loc_hours[l_name] = loc_hours.get(l_name, 0) + n.hours_spent
        
    by_location = [{"work_location": k, "hours_logged": v} for k,v in loc_hours.items()]
    
    task_ids = list(task_hours_in_period.keys())
    tasks = db.query(models.Task).filter(models.Task.id.in_(task_ids)).all()
    
    task_summaries = []
    for t in tasks:
        task_summaries.append({
            "id": t.id,
            "description": t.description,
            "task_type": t.task_type,
            "status": t.status,
            "hours_logged": task_hours_in_period.get(t.id, 0),
            "total_hours_spent": t.total_hours_spent,
            "estimated_effort": t.estimated_effort
        })
        
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_hours_logged": total_hours,
        "by_user": by_user,
        "by_type": by_type,
        "by_location": by_location,
        "tasks": task_summaries
    }

def get_event_analysis_report(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None, user_id: Optional[int] = None, task_type: Optional[str] = None):
    # Base query for events
    query = db.query(models.TaskEvent)
    
    if task_type:
        query = query.filter(models.TaskEvent.event_type == task_type)
        
    if start_date:
        query = query.filter(func.date(models.TaskEvent.event_date) >= start_date)
    if end_date:
        query = query.filter(func.date(models.TaskEvent.event_date) <= end_date)
    if user_id:
        query = query.filter(models.TaskEvent.user_id == user_id)
        
    events = query.order_by(models.TaskEvent.event_date.desc()).all()
    
    # Aggregations
    total_hours = sum(n.hours_spent for n in events)
    
    # By User
    user_hours = {}
    for n in events:
        u_name = n.user.username if n.user else "Unknown"
        user_hours[u_name] = user_hours.get(u_name, 0) + n.hours_spent
        
    by_user = [{"username": k, "hours_logged": v} for k,v in user_hours.items()]
    
    # By Type (Native Event Type)
    type_hours = {}
    
    for n in events:
        type_label = n.event_type if n.event_type else "Unknown"
        type_hours[type_label] = type_hours.get(type_label, 0) + n.hours_spent

    by_type = [{"task_type": k, "hours_logged": v} for k,v in type_hours.items()]
    
    # By Location
    loc_hours = {}
    for n in events:
        l_name = n.work_location if hasattr(n, 'work_location') and n.work_location else "Office"
        loc_hours[l_name] = loc_hours.get(l_name, 0) + n.hours_spent
        
    by_location = [{"work_location": k, "hours_logged": v} for k,v in loc_hours.items()]
    
    event_summaries = []
    for ev in events:
        event_summaries.append({
            "id": ev.id,
            "event_date": ev.event_date,
            "hours_spent": ev.hours_spent,
            "description": ev.content,
            "event_type": ev.event_type,
            "work_location": ev.work_location or "Office",
            "username": ev.user.username if hasattr(ev, 'user') and ev.user else "Unknown",
            "task_id": ev.task_id,
            "task_description": ev.task.description if hasattr(ev, 'task') and ev.task else "Unknown",
            "start_time": ev.start_time,
            "end_time": ev.end_time,
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "clock_out_latitude": ev.clock_out_latitude,
            "clock_out_longitude": ev.clock_out_longitude
        })
        
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_hours_logged": total_hours,
        "by_user": by_user,
        "by_type": by_type,
        "by_location": by_location,
        "events": event_summaries
    }
def sync_task_to_o365(db: Session, task: models.Task):
    if not task.task_type:
        return
    task_type_str = task.task_type.value if hasattr(task.task_type, 'value') else str(task.task_type)
    if task_type_str.lower() != "onsite":
        return
        
    try:
        from app.graph_service import push_event_to_o365
        
        u_name = task.assigned_to.username if getattr(task, 'assigned_to', None) else "Unassigned"
        p_id = task.project.project_unique_id if getattr(task, 'project', None) else "N/A"
        p_name = task.project.name if getattr(task, 'project', None) else task.description[:50] if task.description else 'Task'
        
        subject = f"ONSITE ({u_name}) [{p_id}] {p_name}"
        
        # Fallback to current UTC time if not strictly provided
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        st = task.start_date or (task.due_date - timedelta(days=1) if task.due_date else now)
        ed = task.due_date or (task.start_date + timedelta(days=1) if task.start_date else now + timedelta(days=1))
        
        start_dt = st.strftime("%Y-%m-%dT08:00:00")
        end_dt = ed.strftime("%Y-%m-%dT17:00:00")
        
        content = f"Task: {task.description}<br>Assigned: {u_name}<br>Status: {task.status}"
        
        o365_id = push_event_to_o365(
            subject=subject,
            start_dt=start_dt,
            end_dt=end_dt,
            content=content,
            existing_event_id=task.o365_event_id
        )
        if o365_id and o365_id != task.o365_event_id:
            task.o365_event_id = o365_id
            db.commit()
            db.refresh(task)
    except Exception as e:
        print(f"[O365 Sync Error on Task] {str(e)}")

def create_task(db: Session, task: schemas.TaskCreate, current_user: models.User):
    data = task.model_dump()
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    if data.get('task_type') == 'FIXED':
        import datetime
        current_year = datetime.datetime.now().year
        data['start_date'] = datetime.date(current_year, 1, 1)
        data['due_date'] = datetime.date(current_year, 12, 31)
        data['estimated_effort'] = 0.0
        data['priority'] = getattr(models.TaskPriority, 'LOW', 'Low')
        data['assigned_to_id'] = None
    elif not data.get('assigned_to_id'):
        data['assigned_to_id'] = current_user.id
        
    if 'status' in data and data['status']:
        if isinstance(data['status'], str):
            data['status'] = data['status'].upper().replace(' ', '_')
    else:
        data['status'] = 'OPEN'
        
    new_task = models.Task(**data)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    sync_task_to_o365(db, new_task)
    
    return new_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, current_user: models.User):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        return None
        
    data = task_update.model_dump(exclude_unset=True)
    
    if 'status' in data:
        # Convert to upper snake case for MySQL ENUM constraint
        if isinstance(data['status'], str):
            data['status'] = data['status'].upper().replace(' ', '_')
        if data['status'] == 'COMPLETED':
            is_creator = (db_task.created_by_id == current_user.id)
            is_assigned = (db_task.assigned_to_id == current_user.id)
            if is_assigned and not is_creator:
                 data['status'] = 'PENDING_APPROVAL'
                 
    for key, value in data.items():
        setattr(db_task, key, value)
        
    db_task.updated_by_id = current_user.id
    db_task.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_task)
    
    sync_task_to_o365(db, db_task)
    
    return db_task

def delete_task(db: Session, task_id: int):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
    db.delete(task)
    db.commit()
    return True

def clone_task(db: Session, task_id: int, current_user: models.User):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
        
    from sqlalchemy.orm import class_mapper, ColumnProperty
    data = {}
    for prop in class_mapper(models.Task).iterate_properties:
        if isinstance(prop, ColumnProperty):
            key = prop.key
            if key not in ["id", "created_at", "updated_at"]:
                data[key] = getattr(task, key)
    
    data['status'] = models.TaskStatus.OPEN
    data['description'] = f"{data.get('description', 'Task')} (Copy)"
    
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    new_task = models.Task(**data)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

def create_task_event(db: Session, task_id: int, event: schemas.TaskEventCreate, current_user: models.User):
    from fastapi import HTTPException
    
    target_user_id = current_user.id
    if event.user_id and event.user_id != current_user.id:
        if current_user.role.lower() in ['admin', 'manager', 'finance']:
            target_user_id = event.user_id
        else:
            raise HTTPException(status_code=403, detail="Not authorized to log time for other users.")
            
    resolved_work_location = event.work_location
    if event.latitude is not None and event.longitude is not None:
        target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
        matched = False
        import math
        def haversine(lat1, lon1, lat2, lon2):
            if None in (lat1, lon1, lat2, lon2): return float('inf')
            R = 6371000
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlam = math.radians(lon2 - lon1)
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
        if target_user and target_user.home_latitude and target_user.home_longitude:
            if haversine(event.latitude, event.longitude, target_user.home_latitude, target_user.home_longitude) <= 150:
                resolved_work_location = "Home"
                matched = True
                
        if not matched:
            locs = db.query(models.Location).filter(models.Location.latitude.isnot(None), models.Location.longitude.isnot(None)).all()
            for loc in locs:
                if haversine(event.latitude, event.longitude, loc.latitude, loc.longitude) <= 150:
                    resolved_work_location = loc.name
                    break

    db_event = models.TaskEvent(
        task_id=task_id if task_id else event.task_id,
        milestone_id=event.milestone_id,
        user_id=target_user_id,
        content=event.content,
        hours_spent=event.hours_spent,
        event_date=event.event_date,
        start_time=event.start_time,
        end_time=event.end_time,
        event_type=event.event_type,
        work_location=resolved_work_location,
        latitude=event.latitude,
        longitude=event.longitude,
        clock_out_latitude=event.clock_out_latitude,
        clock_out_longitude=event.clock_out_longitude,
        entry_type=event.entry_type
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def update_task_event(db: Session, event_id: int, event_update: schemas.TaskEventUpdate, current_user: models.User):
    from fastapi import HTTPException
    
    db_event = db.query(models.TaskEvent).filter(models.TaskEvent.id == event_id).first()
    if not db_event:
        return None
        
    is_finance = current_user.role.lower() in ['admin', 'manager', 'finance']
    
    # Timesheet state checking
    status_str = db_event.status.value if hasattr(db_event.status, 'value') else str(db_event.status)
    if status_str not in ["Draft", "Rejected"] and not is_finance:
        raise HTTPException(status_code=403, detail="Cannot edit a Submitted, Approved, or Locked timesheet.")
    
    update_data = event_update.model_dump(exclude_unset=True)
    
    if "user_id" in update_data and update_data["user_id"] != current_user.id:
        if current_user.role.lower() not in ['admin', 'manager', 'finance']:
            raise HTTPException(status_code=403, detail="Not authorized to alter ownership of time entries.")
            
    for key, value in update_data.items():
        setattr(db_event, key, value)
        
    db.commit()
    db.refresh(db_event)
    return db_event

def get_task_events(db: Session, current_user: models.User, start_date: str = None, end_date: str = None, user_id: int = None):
    query = db.query(models.TaskEvent)
    
    is_financial = current_user.role.lower() in ['admin', 'manager', 'finance']
    if not is_financial:
        query = query.filter(models.TaskEvent.user_id == current_user.id)
    elif user_id:
        query = query.filter(models.TaskEvent.user_id == user_id)
        
    if start_date:
        query = query.filter(models.TaskEvent.event_date >= start_date)
    if end_date:
        query = query.filter(models.TaskEvent.event_date <= end_date)
        
    from sqlalchemy.orm import joinedload
    query = query.options(joinedload(models.TaskEvent.task))
        
    return query.order_by(models.TaskEvent.event_date.desc()).all()

def delete_task_event(db: Session, event_id: int, current_user: models.User = None):
    from fastapi import HTTPException
    db_event = db.query(models.TaskEvent).filter(models.TaskEvent.id == event_id).first()
    if not db_event:
        return False
        
    if current_user:
        is_finance = current_user.role.lower() in ['admin', 'manager', 'finance']
        status_str = db_event.status.value if hasattr(db_event.status, 'value') else str(db_event.status)
        if status_str not in ["Draft", "Rejected"] and not is_finance:
            raise HTTPException(status_code=403, detail="Cannot delete a Submitted, Approved, or Locked timesheet.")
        
    db.delete(db_event)
    db.commit()
    return True



# --- Expense CRUD ---
def get_global_expenses(db: Session, skip: int = 0, limit: int = 500000, user_id: int = None, start_date: str = None, end_date: str = None):
    q = db.query(models.Expense).options(
        joinedload(models.Expense.attachments),
        joinedload(models.Expense.milestone),
        joinedload(models.Expense.project),
        joinedload(models.Expense.user),
        joinedload(models.Expense.created_by_user)
    )
    if user_id:
        q = q.filter(models.Expense.user_id == user_id)
        
    if start_date:
        q = q.filter(models.Expense.date_time >= f"{start_date} 00:00:00")
    if end_date:
        q = q.filter(models.Expense.date_time <= f"{end_date} 23:59:59")
        
    return q.order_by(models.Expense.date_time.desc()).offset(skip).limit(limit).all()

def get_expenses_by_project(db: Session, project_id: int, user_id: int = None):
    q = db.query(models.Expense).options(
        joinedload(models.Expense.attachments),
        joinedload(models.Expense.milestone),
        joinedload(models.Expense.user),
        joinedload(models.Expense.created_by_user)
    ).filter(models.Expense.project_id == project_id)
    if user_id:
        q = q.filter(models.Expense.user_id == user_id)
    return q.order_by(models.Expense.date_time.desc()).all()

def create_expense(db: Session, expense: schemas.ExpenseCreate, current_user: models.User, project_id: int):
    data = expense.model_dump()
    data['project_id'] = project_id
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_expense = models.Expense(**data)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def update_expense(db: Session, expense_id: int, expense: schemas.ExpenseUpdate, current_user: models.User):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_expense:
        return None
    
    if current_user.role not in ['admin', 'manager'] and db_expense.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized to edit this expense")
    
    # Prevent reassignment by standard users
    if current_user.role not in ['admin', 'manager'] and expense.user_id is not None:
        expense.user_id = db_expense.user_id
    
    for key, value in expense.model_dump(exclude_unset=True).items():
        setattr(db_expense, key, value)
        
    db_expense.updated_by_id = current_user.id
    db_expense.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expense(db: Session, expense_id: int, current_user: models.User = None):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        return None
        
    if current_user and current_user.role not in ['admin', 'manager'] and expense.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized to delete this expense")
        
    db.delete(expense)
    db.commit()
    return True

def create_expense_attachment(db: Session, expense_id: int, filename: str, file_path: str):
    db_attachment = models.ExpenseAttachment(
        expense_id=expense_id,
        filename=filename,
        file_path=file_path
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def delete_expense_attachment(db: Session, attachment_id: int):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        return None
        
    db.delete(attachment)
    db.commit()
    return True

# --- Xero Sync Logging ---
def log_xero_interaction(db: Session, endpoint: str, entity_type: str, status: str, details: str = None, entity_id: int = None):
    if details and len(details) > 4950:
        details = details[:4950] + " ... (truncated)"
        
    log_entry = models.XeroSyncLog(
        endpoint=endpoint,
        entity_type=entity_type,
        entity_id=entity_id,
        status=status,
        details=details
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def get_xero_logs(db: Session, skip: int = 0, limit: int = 500000):
    return db.query(models.XeroSyncLog).order_by(models.XeroSyncLog.timestamp.desc()).offset(skip).limit(limit).all()

# --- Email Logging ---
def log_email(db: Session, log: schemas.EmailLogCreate):
    log_entry = models.EmailLog(
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        recipients=log.recipients,
        subject=log.subject,
        status=log.status,
        details=log.details,
        created_by_id=log.created_by_id
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def get_email_logs(db: Session, skip: int = 0, limit: int = 500000, entity_type: str = None, entity_id: int = None):
    query = db.query(models.EmailLog).options(joinedload(models.EmailLog.created_by))
    if entity_type:
        query = query.filter(models.EmailLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(models.EmailLog.entity_id == entity_id)
    return query.order_by(models.EmailLog.timestamp.desc()).offset(skip).limit(limit).all()

def global_search(db: Session, query: str, limit: int = 15):
    """
    Search across multiple core entities and return normalized { type, id, label, url }
    """
    results = []
    if not query or len(query.strip()) < 2:
        return results
        
    import re
    from sqlalchemy import cast, String
    
    query_clean = query.strip()
    query_upper = query_clean.upper()
    term = f"%{query_clean}%"
    
    forced_type = None
    
    prefix_match = re.match(r'^(P|L|T|C|INV)[-\s]?(\d*)$', query_upper)
    if prefix_match:
        forced_type = prefix_match.group(1)
        digits = prefix_match.group(2)
        term = f"%{digits}%" if digits else "%"

    # 1. Projects
    if forced_type in [None, 'P']:
        projects_filter = (
            models.Project.name.ilike(term) | 
            cast(models.Project.id, String).ilike(term) |
            models.Project.project_unique_id.ilike(term) |
            models.Project.customer_po.ilike(term) |
            models.Project.description.ilike(term)
        )
        projects = db.query(models.Project).filter(projects_filter).limit(limit).all()
        for p in projects:
            display_id = p.project_unique_id if (p.project_unique_id and str(p.project_unique_id).strip() not in ["", "None"]) else f"P-{p.id}"
            results.append({"type": "Project", "id": p.id, "label": f"{display_id} {p.name}", "url": f"/portal/projects/{p.id}"})

    # 2. Leads
    if forced_type in [None, 'L']:
        leads_filter = (
            models.Lead.company.ilike(term) | 
            models.Lead.name.ilike(term) | 
            cast(models.Lead.id, String).ilike(term) |
            models.Lead.location.has(models.Location.name.ilike(term))
        )
        leads = db.query(models.Lead).filter(leads_filter).limit(limit).all()
        for l in leads:
            loc_str = f" - {l.location.name}" if l.location else ""
            results.append({"type": "Lead", "id": l.id, "label": f"L-{l.id} {l.name} ({l.company}){loc_str}", "url": f"/portal/leads/edit/{l.id}"})

    # 3. Tasks
    if forced_type in [None, 'T']:
        tasks_filter = (models.Task.description.ilike(term)) | (cast(models.Task.id, String).ilike(term))
        tasks = db.query(models.Task).filter(tasks_filter).limit(limit).all()
        for t in tasks:
            results.append({"type": "Task", "id": t.id, "label": f"T-{t.id} {t.description[:40]}...", "url": f"/portal/tasks/edit/{t.id}"})

    # 4. Customers
    if forced_type in [None, 'C']:
        customers_filter = (models.Customer.name.ilike(term)) | (cast(models.Customer.id, String).ilike(term))
        customers = db.query(models.Customer).filter(customers_filter).limit(limit).all()
        for c in customers:
            results.append({"type": "Customer", "id": c.id, "label": c.name, "url": f"/portal/customers/edit/{c.id}"})

    # 5. Invoices
    if forced_type in [None, 'INV']:
        inv_filter = (models.Invoice.invoice_number.ilike(term)) | (cast(models.Invoice.id, String).ilike(term))
        invoices = db.query(models.Invoice).filter(inv_filter).limit(limit).all()
        for inv in invoices:
            results.append({"type": "Invoice", "id": inv.id, "label": f"{inv.invoice_number} ({inv.status})", "url": f"/portal/invoices/{inv.id}"})
            
    # 6. Users
    if forced_type is None:
        users = db.query(models.User).filter(
            (models.User.username.ilike(term)) | (models.User.first_name.ilike(term)) | (models.User.last_name.ilike(term))
        ).limit(limit).all()
        for u in users:
            first = u.first_name or ''
            last = u.last_name or ''
            label = f"{u.username} ({first} {last})".strip()
            results.append({"type": "User", "id": u.id, "label": label, "url": f"/portal/users/edit/{u.id}"})

    # Sort results
    results.sort(key=lambda x: (x["type"], x["label"]))
    return results[:limit]

def convert_lead_to_milestone(db: Session, lead_id: int, request: schemas.LeadToMilestoneConversionRequest, current_user: models.User):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status == models.LeadStatus.CONVERTED:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Lead is already converted")

    parent_project = db.query(models.Project).filter(models.Project.id == request.parent_project_id).first()
    if not parent_project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Parent project not found")

    if lead.customer_id != parent_project.customer_id:
        lead.customer_id = parent_project.customer_id
    if lead.location_id != parent_project.location_id:
        lead.location_id = parent_project.location_id

    raw_m_type = request.milestone_type or lead.project_type
    valid_milestone_types = [e.value for e in models.MilestoneType]
    safe_milestone_type = raw_m_type if raw_m_type in valid_milestone_types else "Other"

    existing_milestones = db.query(models.Milestone).filter(models.Milestone.project_id == parent_project.id).all()
    next_number = 1
    if existing_milestones:
        max_num = max([m.milestone_number or 0 for m in existing_milestones])
        next_number = max_num + 1

    new_milestone = models.Milestone(
        project_id=parent_project.id,
        milestone_number=next_number,
        name=request.name or lead.name,
        description=request.description or lead.description,
        cost=request.cost if request.cost is not None else lead.estimated_value,
        due_date=request.due_date or lead.due_date,
        owner_id=request.owner_id or lead.poc_id,
        milestone_type=safe_milestone_type,
        lead_id=lead.id,
        created_by_id=current_user.id,
        updated_by_id=current_user.id
    )
    db.add(new_milestone)
    
    lead.status = models.LeadStatus.CONVERTED
    lead.updated_by_id = current_user.id
    db.commit()
    db.refresh(new_milestone)
    return new_milestone

# --- Payment Ledger CRUD ---
def get_invoice_payments(db: Session, invoice_id: int):
    return db.query(models.InvoicePayment).filter(models.InvoicePayment.invoice_id == invoice_id).order_by(models.InvoicePayment.payment_date.desc()).all()

def recalculate_invoice_amount_paid(db: Session, invoice_id: int):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        return
        
    total_paid = sum(p.amount for p in invoice.payments)
    invoice.amount_paid = total_paid
    if invoice.balance_due <= 0 and invoice.status == models.InvoiceStatus.SENT:
        invoice.status = models.InvoiceStatus.PAID
    elif invoice.balance_due > 0 and invoice.status == models.InvoiceStatus.PAID:
        invoice.status = models.InvoiceStatus.SENT
        
    db.commit()
    db.refresh(invoice)
    return invoice

def create_invoice_payment(db: Session, payment: schemas.InvoicePaymentCreate, invoice_id: int, current_user: models.User):
    data = payment.model_dump()
    data['invoice_id'] = invoice_id
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    
    db_payment = models.InvoicePayment(**data)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Recalculate Invoice totals
    recalculate_invoice_amount_paid(db, invoice_id)
    
    return db_payment

def delete_invoice_payment(db: Session, payment_id: int):
    payment = db.query(models.InvoicePayment).filter(models.InvoicePayment.id == payment_id).first()
    if not payment:
        return False
        
    invoice_id = payment.invoice_id
    db.delete(payment)
    db.commit()
    
    recalculate_invoice_amount_paid(db, invoice_id)
    return True

# --- PTO Bank and Request CRUD ---

def set_pto_bank(db: Session, pto_bank: schemas.PTOBankCreate, current_user: models.User):
    # Retrieve current bank if exists
    db_bank = db.query(models.PTOBank).filter(
        models.PTOBank.user_id == pto_bank.user_id,
        models.PTOBank.year == pto_bank.year
    ).first()
    
    amount_diff = 0.0
    from datetime import datetime
    
    if db_bank:
        amount_diff = pto_bank.allowance_hours - db_bank.allowance_hours
        db_bank.allowance_hours = pto_bank.allowance_hours
        db_bank.updated_by_id = current_user.id
        db_bank.updated_at = datetime.utcnow()
        db.add(db_bank)
    else:
        amount_diff = pto_bank.allowance_hours
        data = pto_bank.model_dump()
        data['created_by_id'] = current_user.id
        data['updated_by_id'] = current_user.id
        db_bank = models.PTOBank(**data)
        db.add(db_bank)
        
    # Inject Audit Log
    if amount_diff != 0:
        audit_log = models.PTOAuditLog(
            user_id=pto_bank.user_id,
            transaction_type="Manual Adjustment",
            amount_hours=amount_diff,
            balance_after=pto_bank.allowance_hours,
            notes=f"Manager overridden via Ledger by {current_user.username}"
        )
        db.add(audit_log)
        
    db.commit()
    db.refresh(db_bank)
    return db_bank

def get_pto_banks(db: Session, year: int = None):
    query = db.query(models.PTOBank)
    if year:
        query = query.filter(models.PTOBank.year == year)
    return query.all()

def get_pto_bank(db: Session, user_id: int, year: int):
    return db.query(models.PTOBank).filter(
        models.PTOBank.user_id == user_id,
        models.PTOBank.year == year
    ).first()

def create_pto_request(db: Session, pto_request: schemas.PTORequestCreate, current_user: models.User):
    data = pto_request.model_dump()
    data["user_id"] = current_user.id
    data["status"] = models.PTOStatus.PENDING
    db_req = models.PTORequest(**data)
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return db_req

def get_pto_requests(db: Session, user_id: int = None, status: str = None, year: int = None):
    query = db.query(models.PTORequest)
    if user_id:
        query = query.filter(models.PTORequest.user_id == user_id)
    if status:
        query = query.filter(models.PTORequest.status == status)
    if year:
        import datetime
        start = datetime.datetime(year, 1, 1)
        end = datetime.datetime(year, 12, 31, 23, 59, 59)
        query = query.filter(models.PTORequest.start_date >= start, models.PTORequest.start_date <= end)
    return query.all()

def update_pto_request_status(db: Session, request_id: int, status: str, current_user: models.User):
    # Import the O365 Graph Service hook
    from app.graph_service import push_event_to_o365

    db_req = db.query(models.PTORequest).filter(models.PTORequest.id == request_id).first()
    if not db_req:
        return None
    
    db_req.status = status
    if status == models.PTOStatus.MANAGER_APPROVED or status == models.PTOStatus.REJECTED:
        db_req.manager_id = current_user.id
    if status == models.PTOStatus.FINANCE_APPROVED:
        db_req.finance_id = current_user.id
        
        # Trigger O365 Sync (Push to Master Calendar)
        try:
            subject = f"{db_req.user.first_name} {db_req.user.last_name} - PTO"
            # format dates to ISO 8601 strings
            start_dt = db_req.start_date.strftime("%Y-%m-%dT%H:%M:%S")
            end_dt = db_req.end_date.strftime("%Y-%m-%dT%H:%M:%S")
            
            # Format content
            content = f"PTO Reason: {db_req.reason}<br>Hours Requested: {db_req.hours_requested}"
            
            # Use background sync or inline
            o365_id = push_event_to_o365(
                subject=subject,
                start_dt=start_dt,
                end_dt=end_dt,
                content=content,
                existing_event_id=db_req.o365_event_id
            )
            if o365_id:
                db_req.o365_event_id = o365_id
        except Exception as e:
            print(f"[O365 Sync Error on PTO] {str(e)}")
        
    db.commit()
    db.refresh(db_req)
    return db_req

def get_pto_ledger_report(db: Session, year: int):
    users = db.query(models.User).filter(models.User.is_active == True, models.User.is_employee == True).all()
    entries = []
    
    import datetime
    from sqlalchemy.sql import func
    start_of_year = datetime.datetime(year, 1, 1)
    end_of_year = datetime.datetime(year, 12, 31, 23, 59, 59)
    
    for user in users:
        bank = db.query(models.PTOBank).filter(
            models.PTOBank.user_id == user.id,
            models.PTOBank.year == year
        ).first()
        allowance = bank.allowance_hours if bank else 0.0
        
        requests = db.query(models.PTORequest).filter(
            models.PTORequest.user_id == user.id,
            models.PTORequest.start_date >= start_of_year,
            models.PTORequest.start_date <= end_of_year,
            models.PTORequest.status != models.PTOStatus.REJECTED
        ).all()
        approved_pending_hours = sum(r.hours_requested for r in requests)
        
        taken = db.query(func.sum(models.TaskEvent.hours_spent)).filter(
            models.TaskEvent.user_id == user.id,
            models.TaskEvent.event_type == models.TaskType.PTO,
            models.TaskEvent.event_date >= start_of_year.date(),
            models.TaskEvent.event_date <= end_of_year.date()
        ).scalar()
        taken_hours = float(taken or 0.0)
        
        remaining = allowance - taken_hours
        
        updater_username = None
        if bank and bank.updated_by_id:
            updater = db.query(models.User).filter(models.User.id == bank.updated_by_id).first()
            if updater:
                updater_username = updater.username

        entries.append({
            "user_id": user.id,
            "username": user.username,
            "region": user.region or "US/Headquarters",
            "year": year,
            "allowance_hours": allowance,
            "approved_pending_hours": approved_pending_hours,
            "taken_hours": taken_hours,
            "remaining_balance": remaining,
            "last_updated": bank.updated_at if bank else None,
            "last_updated_by": updater_username
        })
        
    return {
        "year": year,
        "entries": entries
    }

# --- Action Items CRUD ---
def get_user_action_items(db: Session, user_id: int):
    # We now fetch everything and allow the client to filter, or we can filter out truly permanently deleted if necessary
    return db.query(models.ActionItem).filter(models.ActionItem.user_id == user_id).order_by(models.ActionItem.is_completed, models.ActionItem.created_at.desc()).all()

def create_action_item(db: Session, action_item: schemas.ActionItemCreate, current_user: models.User):
    data = action_item.model_dump()
    data['user_id'] = current_user.id
    data['created_by_id'] = current_user.id
    data['updated_by_id'] = current_user.id
    db_item = models.ActionItem(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_action_item(db: Session, item_id: int, action_item: schemas.ActionItemUpdate, current_user: models.User):
    db_item = db.query(models.ActionItem).filter(models.ActionItem.id == item_id).first()
    if not db_item:
        return None
    if db_item.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized")
    for key, value in action_item.model_dump(exclude_unset=True).items():
        setattr(db_item, key, value)
    db_item.updated_by_id = current_user.id
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_action_item(db: Session, item_id: int, current_user: models.User, permanent: bool = False):
    db_item = db.query(models.ActionItem).filter(models.ActionItem.id == item_id).first()
    if not db_item:
        return False
    if db_item.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized")
    if permanent:
        db.delete(db_item)
    else:
        db_item.is_deleted = True
    db.commit()
    return True

# --- Direct Messages CRUD ---
def get_user_direct_messages(db: Session, user_id: int):
    from sqlalchemy import or_
    return db.query(models.DirectMessage).filter(
        or_(models.DirectMessage.sender_id == user_id, models.DirectMessage.recipient_id == user_id)
    ).order_by(models.DirectMessage.created_at.desc()).all()

def create_direct_message(db: Session, msg: schemas.DirectMessageCreate, current_user: models.User):
    db_msg = models.DirectMessage(
        sender_id=current_user.id,
        recipient_id=msg.recipient_id,
        content=msg.content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def mark_direct_message_read(db: Session, msg_id: int, current_user: models.User):
    db_msg = db.query(models.DirectMessage).filter(models.DirectMessage.id == msg_id).first()
    if db_msg and db_msg.recipient_id == current_user.id:
        db_msg.is_read = True
        db.commit()
        db.refresh(db_msg)
    return db_msg

