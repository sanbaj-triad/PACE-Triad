from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

def check_task_deadlines():
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        today = now.date()
        
        # Pull all active Tasks with concrete due dates
        active_tasks = db.query(models.Task).filter(
            models.Task.due_date.isnot(None),
            models.Task.status != models.TaskStatus.COMPLETED
        ).all()
        
        for task in active_tasks:
            due = task.due_date.date()
            diff_days = (due - today).days
            
            # Warning: 3 Days Out (User Only)
            if diff_days == 3:
                if task.assigned_to_id:
                    desc_trim = task.description[:30] + "..." if task.description else "Task"
                    warn = models.Notification(
                        user_id=task.assigned_to_id,
                        title=f"Task Due Soon: {desc_trim}",
                        message=f"Reminder: You have a task due in 3 days on {due.strftime('%Y-%m-%d')}.",
                        link=f"/portal/tasks/{task.id}" 
                    )
                    db.add(warn)
            
            # Overdue Warning: Missed Due Date by exactly 1 day 
            elif diff_days == -1:
                notify_user_ids = set()
                assignee_name = "Unassigned"
                
                # 1. Assigned User and their Direct Manager
                if task.assigned_to_id:
                    notify_user_ids.add(task.assigned_to_id)
                    u = db.query(models.User).filter(models.User.id == task.assigned_to_id).first()
                    if u:
                        assignee_name = u.username
                        if u.manager_id:
                            notify_user_ids.add(u.manager_id)
                            
                # 2. Project Manager
                if task.project_id:
                    p = db.query(models.Project).filter(models.Project.id == task.project_id).first()
                    if p and p.pm_id:
                        notify_user_ids.add(p.pm_id)
                        
                # 3. All System Admins
                admins = db.query(models.User).filter(models.User.role == "admin").all()
                for a in admins:
                    notify_user_ids.add(a.id)
                    
                desc_trim = task.description[:30] + "..." if task.description else "Task"
                
                # Dispatch Notifications seamlessly
                for uid in notify_user_ids:
                    alert = models.Notification(
                        user_id=uid,
                        title=f"OVERDUE: {desc_trim}",
                        message=f"Task assigned to {assignee_name} was due on {due.strftime('%Y-%m-%d')} and is critically overdue.",
                        link=f"/portal/tasks/{task.id}"
                    )
                    db.add(alert)
                    
                # MS Teams Integration (Overdue Only)
                try:
                    from .teams import send_teams_alert
                    send_teams_alert(
                        title=f"🚨 OVERDUE TASK: {desc_trim}",
                        message=f"**{assignee_name}** has an overdue deadline! Scheduled for {due.strftime('%Y-%m-%d')}.",
                        action_url=f"/portal/tasks/{task.id}"
                    )
                except Exception as e:
                    print(f"MS Teams Scheduler Hook Failed: {e}")


        
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        print(f"APScheduler Background Error: {e}\n{traceback.format_exc()}")
    finally:
        db.close()

def sync_o365_master_to_local():
    db: Session = SessionLocal()
    try:
        from .graph_service import pull_events_from_o365
        events = pull_events_from_o365()
        if not events:
            return
            
        def parse_graph_date(dt_str):
            try:
                # Graph dates look like "2024-05-15T08:00:00.0000000"
                return datetime.fromisoformat(dt_str[:19])
            except:
                return None
            
        for ev in events:
            ev_id = ev.get('id')
            start_str = ev.get('start', {}).get('dateTime')
            end_str = ev.get('end', {}).get('dateTime')
            
            if not ev_id or not start_str or not end_str:
                continue
                
            new_st = parse_graph_date(start_str)
            new_ed = parse_graph_date(end_str)
            if not new_st or not new_ed:
                continue
                
            # Attempt to update PTORequest
            pto = db.query(models.PTORequest).filter(models.PTORequest.o365_event_id == ev_id).first()
            if pto:
                if pto.start_date != new_st or pto.end_date != new_ed:
                    pto.start_date = new_st
                    pto.end_date = new_ed
                
            # Attempt to update Task
            task = db.query(models.Task).filter(models.Task.o365_event_id == ev_id).first()
            if task:
                if task.start_date != new_st or task.due_date != new_ed:
                    task.start_date = new_st
                    task.due_date = new_ed
                
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"O365 2-Way Sync Error: {e}")
    finally:
        db.close()

def process_recurring_invoices():
    db: Session = SessionLocal()
    try:
        from datetime import date, timedelta, datetime
        from . import schemas
        from . import crud
        
        today = date.today()
        system_user = db.query(models.User).filter(models.User.role == "admin").first()
        
        def advance_date(current_date, freq):
            if not current_date: return None
            freq = freq.upper() if freq else ""
            if freq == 'MONTHLY': return current_date + timedelta(days=30)
            elif freq == 'QUARTERLY': return current_date + timedelta(days=90)
            elif freq == 'SEMI_ANNUAL': return current_date + timedelta(days=180)
            elif freq == 'ANNUAL': return current_date + timedelta(days=365)
            return None

        # 1. Project Level 
        projs = db.query(models.Project).filter(
            models.Project.use_project_billing_schedule == True,
            models.Project.next_invoice_date != None,
            models.Project.next_invoice_date <= today,
            models.Project.recurring_invoice_frequency != None,
            models.Project.recurring_invoice_frequency != ""
        ).all()
        
        for p in projs:
            items = []
            for m in p.milestones:
                if not m.is_completed:
                    pct = p.recurring_invoice_percentage or 100.0
                    items.append(schemas.MilestoneBillItem(milestone_id=m.id, percentage=pct))
            
            if items:
                gen_data = schemas.InvoiceGenerate(
                    project_id=p.id, items=items, issue_date=datetime.utcnow(), due_date=datetime.utcnow() + timedelta(days=30)
                )
                try:
                    crud.generate_invoice_from_milestones(db=db, data=gen_data, current_user=system_user)
                    p.next_invoice_date = advance_date(p.next_invoice_date, p.recurring_invoice_frequency)
                    db.commit()
                except:
                    db.rollback()

        # 2. Milestone Level
        milestones = db.query(models.Milestone).join(models.Project).filter(
            models.Project.use_project_billing_schedule == False,
            models.Milestone.next_invoice_date != None,
            models.Milestone.next_invoice_date <= today,
            models.Milestone.recurring_invoice_frequency != None,
            models.Milestone.recurring_invoice_frequency != "",
            models.Milestone.is_completed == False
        ).all()
        
        project_map = {}
        for m in milestones:
            project_map.setdefault(m.project_id, []).append(m)
            
        for project_id, ms in project_map.items():
            items = [schemas.MilestoneBillItem(milestone_id=m.id, percentage=(m.recurring_invoice_percentage or 100.0)) for m in ms]
            gen_data = schemas.InvoiceGenerate(
                project_id=project_id, items=items, issue_date=datetime.utcnow(), due_date=datetime.utcnow() + timedelta(days=30)
            )
            try:
                crud.generate_invoice_from_milestones(db=db, data=gen_data, current_user=system_user)
                for m in ms:
                    m.next_invoice_date = advance_date(m.next_invoice_date, m.recurring_invoice_frequency)
                db.commit()
            except:
                db.rollback()

    except Exception as e:
        import traceback
        print(f"APScheduler Recurring Invoice Error: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Execute exactly once a day, early in the morning at 08:00 AM server time
    scheduler.add_job(check_task_deadlines, 'cron', hour=8, minute=0)
    
    # Process Automated Billing Schedules daily at 06:00 AM
    scheduler.add_job(process_recurring_invoices, 'cron', hour=6, minute=0)
    
    # 2-way MS Graph API sync every 15 minutes
    scheduler.add_job(sync_o365_master_to_local, 'interval', minutes=15)
    
    scheduler.start()
    print("APScheduler Background Process Initialized: Deadlines checked at 08:00 AM, O365 Sync every 15m")
