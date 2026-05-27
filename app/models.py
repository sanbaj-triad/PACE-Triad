from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Time, Text, Date, Enum as SqlEnum
from sqlalchemy.orm import relationship, declared_attr
from sqlalchemy.sql import func
from datetime import datetime
import enum
from .database import Base

class AuditMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @declared_attr
    def created_by_id(cls):
        return Column(Integer, ForeignKey("users.id"), nullable=True)

    @declared_attr
    def updated_by_id(cls):
        return Column(Integer, ForeignKey("users.id"), nullable=True)
    
    @declared_attr
    def created_by_user(cls):
        return relationship("User", foreign_keys=[cls.created_by_id], primaryjoin=f"User.id == {cls.__name__}.created_by_id")

    @declared_attr
    def updated_by_user(cls):
        return relationship("User", foreign_keys=[cls.updated_by_id], primaryjoin=f"User.id == {cls.__name__}.updated_by_id")

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    VOID = "void"

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ProjectPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class ProjectType(str, enum.Enum):
    NONE = "None"
    PRESET_CONTROLLER = "Preset Controller"
    ADDITIVE_SYSTEM = "Additive System"
    BLENDING_SYSTEM = "Blending System"
    PLC_SYSTEM = "PLC System"
    AUTOMATION_SYSTEM = "Automation System"
    VISUALIZATION_SYSTEM = "Visualization System"
    DESIGN = "Design"
    HARDWARE = "Hardware"
    PROGRAMMING = "Programming"
    PROJECT_MANAGEMENT = "Project Management"
    FIELD_SERVICES = "Field Services"
    SMALL_PROJECT = "Small Project"
    ENGINEERING = "Engineering"
    CONSULTING = "Consulting"
    SUPPORT = "Support"
    OTHER = "Other"

class MilestoneType(str, enum.Enum):
    DESIGN = "Design"
    HARDWARE = "Hardware"
    REMOTE = "Remote"
    ONSITE = "Onsite"
    PM = "PM"
    CONTINGENCY = "Contingency"
    FIXED = "FIXED"
    SUPPORT = "Support"
    OPERATIONS = "Operations"
    INTERNAL = "Internal"
    OTHER = "Other"

class InvoiceType(str, enum.Enum):
    NONE = "None"
    INCREMENTAL = "Incremental"
    MILESTONE = "Milestone"
    TM = "TM"

class PTOStatus(str, enum.Enum):
    PENDING = "Pending"
    MANAGER_APPROVED = "Manager Approved"
    FINANCE_APPROVED = "Finance Approved"
    REJECTED = "Rejected"

class AuditAction(str, enum.Enum):
    BILLED = "Billed"
    REVERSED = "Reversed"
    MODIFIED = "Modified"

class User(Base, AuditMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    has_financial_access = Column(Boolean, default=False)
    role = Column(String(50), default="user") # user, admin, pm
    is_employee = Column(Boolean, default=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    title = Column(String(100), nullable=True)
    department = Column(String(50), nullable=True)
    
    # New Fields
    phone = Column(String(50), nullable=True)
    start_date = Column(DateTime, nullable=True)
    region = Column(String(50), default="US/Headquarters") # e.g. "US/Headquarters", "Triad Asia"
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    locked_out = Column(Boolean, default=False)
    login_enabled = Column(Boolean, default=False)
    needs_password_change = Column(Boolean, default=False)
    
    # Presence & Notifications
    is_online = Column(Boolean, default=False)
    last_active_at = Column(DateTime, nullable=True)
    
    # Missing Columns
    home_latitude = Column(Float, nullable=True)
    home_longitude = Column(Float, nullable=True)
    home_address = Column(String(255), nullable=True)
    annual_pto_allowance = Column(Float, default=0.0)
    hourly_billing_rate = Column(Float, nullable=True)
    internal_cost_rate = Column(Float, nullable=True)
    
    # Manager Relationship (Self-referential)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", remote_side=[id], backref="direct_reports", foreign_keys=[manager_id])
    
    # Relationship to customer
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer = relationship("Customer", foreign_keys=[customer_id], back_populates="users")
    
    # Location
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    location = relationship("Location", foreign_keys=[location_id], back_populates="users")
    
    # Projects created relationship needs to be updated or removed if we use the mixin's generic relationship
    # keeping it for backward compat if needed, but pointing to created_by_id
    projects_created = relationship("Project", foreign_keys="Project.created_by_id")

    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    message = Column(Text, nullable=True)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class Customer(Base, AuditMixin):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    title = Column(String(100), nullable=True)
    payment_terms = Column(Integer, default=30)
    
    users = relationship("User", foreign_keys=[User.customer_id], back_populates="customer")
    projects = relationship("Project", foreign_keys="Project.customer_id", back_populates="customer")
    locations = relationship("Location", back_populates="customer", cascade="all, delete-orphan")

class Location(Base, AuditMixin):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    address = Column(String(500), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    pay_period_cycle = Column(String(50), default="Bi-Weekly")
    weekly_work_hours = Column(Float, default=40.0)
    auto_pto_calculation = Column(Boolean, default=False)
    payroll_start_date = Column(Date, nullable=True)
    
    customer = relationship("Customer", back_populates="locations")
    users = relationship("User", foreign_keys=[User.location_id], back_populates="location")
    projects = relationship("Project", back_populates="location")

class Project(Base, AuditMixin):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_unique_id = Column(String(50), unique=True, index=True) # Unique Project ID
    name = Column(String(255), index=True)
    description = Column(String(5000), nullable=True)
    
    # Foreign Keys
    customer_id = Column(Integer, ForeignKey("customers.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    # created_by removed in favor of AuditMixin.created_by_id
    
    # New Fields
    priority = Column(String(50), default="Medium")
    project_type = Column(String(50), default="Other")
    customer_po = Column(String(100), nullable=True)
    is_master_po = Column(Boolean, default=False) # Master PO Flag
    budget = Column(Float, default=0.0)
    po_file_path = Column(String(500), nullable=True)
    do_not_invoice = Column(Boolean, default=False)
    
    # Virtual / Annual Project Support
    is_virtual = Column(Boolean, default=False)
    use_project_billing_schedule = Column(Boolean, default=False)
    recurring_invoice_frequency = Column(String(50), nullable=True) # NONE, MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
    next_invoice_date = Column(Date, nullable=True)
    recurring_invoice_percentage = Column(Float, nullable=True)
    
    # Internal PM and Customer PM as Foreign Keys
    # Internal PM and Customer PM as Foreign Keys
    customer_pm_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pm_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    location = relationship("Location", back_populates="projects")
    
    invoice_type = Column(String(50), default=InvoiceType.NONE)
    
    status = Column(String(50), default=ProjectStatus.ACTIVE)
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    # created_at removed in favor of AuditMixin.created_at

    # Relations
    customer = relationship("Customer", foreign_keys=[customer_id], back_populates="projects")
    lead = relationship("Lead", back_populates="project")
    
    pm_user = relationship("User", foreign_keys=[pm_id])
    customer_pm_user = relationship("User", foreign_keys=[customer_pm_id])
    
    invoices = relationship("Invoice", back_populates="project")
    milestones = relationship("Milestone", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    expenses = relationship("Expense", back_populates="project", cascade="all, delete-orphan")
    
    # FIX: Need correct relations in original or ensure replacement chunk is correct.
    # Lines 164: invoices = relationship("Invoice", back_populates="project")
    # Lines 165: milestones = relationship("Milestone", back_populates="project")
    # I will be careful here.

    @property
    def total_billed(self):
        return sum((m.total_billed or 0.0) for m in self.milestones)
        
    @property
    def financial_progress(self):
        if self.budget > 0:
            return (self.total_billed / self.budget) * 100
        return 0.0

    @property
    def current_value(self):
        """Total Value of all Milestones (Planned Revenue)"""
        return sum((m.cost or 0.0) for m in self.milestones)
        
    @property
    def remaining_value(self):
        """Current Value - Total Billed"""
        return max(0.0, self.current_value - self.total_billed)

    @property
    def amount_paid(self):
        """Aggregate Paid Amount across all invoices"""
        return sum((inv.amount_paid or 0.0) for inv in self.invoices)

    @property
    def balance_due(self):
        """Total Billed - Amount Paid"""
        return max(0.0, self.total_billed - self.amount_paid)

    attachments = relationship("ProjectAttachment", back_populates="project", cascade="all, delete-orphan")

class ProjectAttachment(Base):
    __tablename__ = "project_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    file_path = Column(String(500))
    filename = Column(String(255))
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    project = relationship("Project", back_populates="attachments")

class Invoice(Base, AuditMixin):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    invoice_number = Column(String(50), unique=True, index=True)
    status = Column(String(50), default=InvoiceStatus.DRAFT)
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    xero_id = Column(String(100), nullable=True, index=True) # For Xero Sync
    
    amount_paid = Column(Float, default=0.0)

    project = relationship("Project", back_populates="invoices")
    items = relationship("LineItem", back_populates="invoice")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoicePayment.payment_date.desc()")

    @property
    def total_amount(self):
        return sum((item.amount or 0.0) for item in self.items)
        
    @property
    def balance_due(self):
        return max(0.0, self.total_amount - (self.amount_paid or 0.0))

class InvoicePayment(Base, AuditMixin):
    __tablename__ = "invoice_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(50), default="Check") # Check, ACH, Wire, Credit Card, Cash, Write-Off
    reference_number = Column(String(100), nullable=True) # Check Number or Transaction ID
    notes = Column(String(500), nullable=True)
    
    invoice = relationship("Invoice", back_populates="payments")

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)
    description = Column(String(500))
    memo = Column(String(500), nullable=True)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float)
    amount = Column(Float) # Calculated as qty * price generally, but stored for history

    invoice = relationship("Invoice", back_populates="items")
    milestone = relationship("Milestone", back_populates="line_items")

class Milestone(Base, AuditMixin):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    name = Column(String(255))
    description = Column(String(5000), nullable=True)
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    cost = Column(Float, nullable=True)
    is_completed = Column(Boolean, default=False)
    
    # New Fields
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    # created_at removed in favor of AuditMixin.created_at
    progress = Column(Integer, default=0) # 0-100
    milestone_number = Column(Integer, default=0) # Project-specific sequence
    milestone_po = Column(String(100), nullable=True) # PO for this specific milestone
    milestone_type = Column(String(50), default=MilestoneType.OTHER) # New Field
    line_item_name = Column(String(255), nullable=True) # Custom Invoice Line Item Override

    # Global Bucket / Recurring Billing
    is_global_bucket = Column(Boolean, default=False)
    global_access_level = Column(String(50), default="ALL") # ALL, MANAGEMENT, FINANCE_ADMIN
    recurring_invoice_frequency = Column(String(50), nullable=True) 
    next_invoice_date = Column(Date, nullable=True)
    recurring_invoice_percentage = Column(Float, nullable=True)

    # --- Type-Specific Budget Tracking Fields (Sparse) ---
    budget_hours = Column(Float, nullable=True) # General Total Hours (Design, Hardware, Onsite, Remote, PM)
    
    # Design specific
    design_ifr_hours = Column(Float, nullable=True)
    design_ifc_hours = Column(Float, nullable=True)
    design_asbuilt_hours = Column(Float, nullable=True)
    
    # Hardware specific
    hardware_expense_budget = Column(Float, nullable=True)
    hardware_shipping_budget = Column(Float, nullable=True)
    hardware_other_expense_budget = Column(Float, nullable=True)
    
    # Onsite specific
    onsite_travel_expense = Column(Float, nullable=True)
    onsite_num_trips = Column(Integer, nullable=True)
    onsite_num_flights = Column(Integer, nullable=True)
    
    # Remote specific
    remote_plc_hours = Column(Float, nullable=True)
    remote_hmi_hours = Column(Float, nullable=True)
    remote_fat_hours = Column(Float, nullable=True)

    project = relationship("Project", back_populates="milestones")
    # invoice = relationship("Invoice", back_populates="milestones") # Removed for Partial Invoicing
    owner = relationship("User", foreign_keys=[owner_id])
    lead = relationship("Lead", back_populates="milestone", uselist=False)
    
    line_items = relationship("LineItem", back_populates="milestone")
    audits = relationship("MilestoneAudit", back_populates="milestone", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="milestone")
    expenses = relationship("Expense", back_populates="milestone")

    @property
    def project_name(self):
        return self.project.name if self.project else None
        
    @property
    def customer_name(self):
        return self.project.customer.name if self.project and self.project.customer else None

    @property
    def total_billed(self):
        return sum((item.amount or 0.0) for item in self.line_items)

    @property
    def remaining_amount(self):
        return (self.cost or 0.0) - self.total_billed

    @property
    def progress_percentage(self):
        if not self.cost or self.cost == 0:
            return 0
        return min(100, (self.total_billed / self.cost) * 100)

class MilestoneAudit(Base, AuditMixin):
    __tablename__ = "milestone_audits"
    
    id = Column(Integer, primary_key=True, index=True)
    milestone_id = Column(Integer, ForeignKey("milestones.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice_number = Column(String(50), nullable=True) 
    action = Column(String(50), default=AuditAction.BILLED)
    amount = Column(Float)
    percentage = Column(Float, nullable=True)
    
    milestone = relationship("Milestone", back_populates="audits")
    invoice = relationship("Invoice")

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    PROPOSAL_SENT = "proposal_sent"
    CONVERTED = "converted"
    LOST = "lost"

class Lead(Base, AuditMixin):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    email = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    description = Column(String(5000), nullable=True)
    estimated_value = Column(Float, nullable=True)
    due_date = Column(DateTime, nullable=True)
    project_type = Column(String(50), default=ProjectType.OTHER)
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    poc_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_contact_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_contract = Column(String(255), nullable=True)
    
    status = Column(String(50), default=LeadStatus.NEW)
    # created_at removed for AuditMixin

    customer = relationship("Customer")
    location = relationship("Location", foreign_keys=[location_id])
    poc = relationship("User", foreign_keys=[poc_id])
    customer_contact_user = relationship("User", foreign_keys=[customer_contact_id])
    project = relationship("Project", back_populates="lead", uselist=False)
    milestone = relationship("Milestone", back_populates="lead", uselist=False)

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String(1000))
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="comments")
    task = relationship("Task", back_populates="comments", foreign_keys=[task_id])
    user = relationship("User")

# Add back_populates to Project
Project.comments = relationship("Comment", back_populates="project", order_by="Comment.created_at")

# --- Task System Enums ---
class TaskType(str, enum.Enum):
    ADMIN = "Admin"
    DESIGN = "Design"
    DOCUMENTATION = "Documentation"
    ENGINEERING = "Engineering"
    FAT = "FAT"
    LAB = "LAB"
    LEARNING = "Learning"
    ONSITE = "Onsite"
    ORDERING = "Ordering"
    OTHER = "Other"
    PM = "PM"
    PTO = "PTO"
    PANEL_BUILDING = "Panel Building"
    PLANNING = "Planning"
    PROGRAMMING = "Programming"
    SAT = "SAT"
    SHIPPING = "Shipping"
    SUPPORT = "Support"
    TESTING = "Testing"
    TRAINING = "Training"
    FIXED = "FIXED"

class TaskStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    PENDING_APPROVAL = "Pending Approval"
    COMPLETED = "Completed"

class TaskPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class TimesheetStatus(str, enum.Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    LOCKED = "Locked"

# --- Task System Models ---
class Task(Base, AuditMixin):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(5000), nullable=True) # Initial Description
    task_type = Column(String(50), default=TaskType.OTHER)
    status = Column(String(50), default=TaskStatus.OPEN)
    priority = Column(String(50), default="Medium")
    
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    estimated_effort = Column(Float, default=0.0) # In Hours
    estimated_utilization = Column(Integer, default=0) # 0-100 percentage
    progress = Column(Integer, default=0) # 0-100
    
    # External Integration Link
    o365_event_id = Column(String(255), nullable=True)
    
    # Ownership
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    
    # New Links
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True)
    
    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    project = relationship("Project", back_populates="tasks")
    milestone = relationship("Milestone", back_populates="tasks")
    events = relationship("TaskEvent", back_populates="task", cascade="all, delete-orphan", order_by="TaskEvent.event_date.desc()")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan", order_by="Comment.created_at")

    @property
    def total_hours_spent(self):
        return sum((event.hours_spent or 0.0) for event in self.events)

class TaskEvent(Base):
    __tablename__ = "task_events"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), default=TimesheetStatus.DRAFT)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True) # Nullable for Global Tasks
    milestone_id = Column(Integer, ForeignKey("milestones.id"), nullable=True) # For Global tasks logged directly
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String(5000))
    event_date = Column(DateTime, default=datetime.utcnow) # Actual date work happened
    start_time = Column(Time, nullable=True) # Manual time tracker
    end_time = Column(Time, nullable=True) # Automatically calculated by GUI
    event_type = Column(String(50), default=TaskType.OTHER)
    hours_spent = Column(Float, default=0.0) # Floating point metric
    entry_date = Column(DateTime, default=datetime.utcnow) # Actual time of DB commit
    work_location = Column(String(50), default="Office") # Office, Home, Field, Travel, Training, Other
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    clock_out_latitude = Column(Float, nullable=True)
    clock_out_longitude = Column(Float, nullable=True)
    entry_type = Column(String(50), default="Automated")

    task = relationship("Task", back_populates="events")
    user = relationship("User")
    milestone = relationship("Milestone")

    @property
    def project_name(self):
        if self.task and self.task.project:
            return self.task.project.name
        if self.milestone and self.milestone.project:
            return self.milestone.project.name
        return None

    @property
    def project_number(self):
        if self.task and self.task.project:
            return self.task.project.project_unique_id
        if self.milestone and self.milestone.project:
            return self.milestone.project.project_unique_id
        return None

    @property
    def milestone_name(self):
        if self.task and self.task.milestone:
            return self.task.milestone.name
        if self.milestone:
            return self.milestone.name
        return None

    @property
    def customer_name(self):
        if self.task and self.task.project and self.task.project.customer:
            return self.task.project.customer.name
        if self.milestone and self.milestone.project and self.milestone.project.customer:
            return self.milestone.project.customer.name
        return None

    @property
    def task_title(self):
        if self.task:
            return self.task.title
        if self.milestone:
            return f"[Virtual] {self.milestone.name}"
        return None

# Add relationship to User for loaded tasks? Or just query directly.
# User.tasks_assigned = relationship("Task", foreign_keys="[Task.assigned_to_id]", back_populates="assigned_to")

# --- Expense Tracking Models ---
class ExpenseType(str, enum.Enum):
    HARDWARE = "Hardware"
    TE = "T&E"
    MEAL = "Meal"
    PARKING = "Parking"
    HOTEL = "Hotel"
    FLIGHT = "Flight"
    CAR_RENTAL = "Car Rental"
    SHIPPING = "Shipping"
    SOFTWARE = "Software"
    CONTRACTOR = "Contractor"
    TOOLS = "Tools"

class ExpenseStatus(str, enum.Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    LOCKED = "Locked"

class Expense(Base, AuditMixin):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    milestone_id = Column(Integer, ForeignKey("milestones.id"), index=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    date_time = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, default=0.0)
    billable = Column(Boolean, default=True)
    expense_type = Column(String(50), default=ExpenseType.HARDWARE)
    status = Column(String(50), default=ExpenseStatus.DRAFT)
    merchant_name = Column(String(255), nullable=True)
    notes = Column(String(5000), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="expenses")
    milestone = relationship("Milestone", back_populates="expenses")
    user = relationship("User", foreign_keys=[user_id])
    attachments = relationship("ExpenseAttachment", back_populates="expense", cascade="all, delete-orphan")

class ExpenseAttachment(Base, AuditMixin):
    __tablename__ = "expense_attachments"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), index=True)
    filename = Column(String(255))
    file_path = Column(String(500))

    expense = relationship("Expense", back_populates="attachments")

class XeroSyncLog(Base):
    __tablename__ = "xero_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    endpoint = Column(String(250), index=True)  # e.g. "Push Invoice", "Webhook", etc.
    entity_type = Column(String(100), index=True) # e.g. "Invoice"
    entity_id = Column(Integer, nullable=True, index=True)
    status = Column(String(50), index=True) # "SUCCESS" or "ERROR"
    details = Column(String(5000), nullable=True) # Raw payload, error tracebacks, etc.

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    entity_type = Column(String(100), index=True) # e.g. "Invoice", "Project"
    entity_id = Column(Integer, nullable=True, index=True)
    recipients = Column(String(1000), nullable=True) # comma-separated emails
    subject = Column(String(500), nullable=True)
    status = Column(String(50), index=True) # "SUCCESS" or "ERROR"
    details = Column(String(5000), nullable=True) # Exception traces, bounce details, etc.
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_by = relationship("User", foreign_keys=[created_by_id])

class PTOBank(Base, AuditMixin):
    __tablename__ = "pto_banks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    year = Column(Integer, index=True)
    allowance_hours = Column(Float, default=0.0)

    user = relationship("User", foreign_keys=[user_id], backref="pto_banks")

class PTORequest(Base, AuditMixin):
    __tablename__ = "pto_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    hours_requested = Column(Float)
    status = Column(String(50), default=PTOStatus.PENDING)
    notes = Column(Text, nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    finance_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # External Integration Link
    o365_event_id = Column(String(255), nullable=True)

    user = relationship("User", foreign_keys=[user_id], backref="pto_requests")
    manager = relationship("User", foreign_keys=[manager_id])
    finance = relationship("User", foreign_keys=[finance_id])

class SystemState(Base, AuditMixin):
    __tablename__ = "system_state"
    id = Column(Integer, primary_key=True)
    announcement_message = Column(String(500), nullable=True)
    is_announcement_active = Column(Boolean, default=False)
    app_version = Column(String(50), default="1.0.0")

class DirectMessage(Base):
    __tablename__ = "direct_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], backref="received_messages")

class ActionItem(Base, AuditMixin):
    __tablename__ = "action_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    content = Column(String(1000))
    is_completed = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    user = relationship("User", foreign_keys=[user_id], backref="action_items")
    task = relationship("Task", foreign_keys=[task_id])

class PTOAuditLog(Base, AuditMixin):
    __tablename__ = 'pto_audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    transaction_type = Column(String(100), nullable=False)
    amount_hours = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    user = relationship('User', foreign_keys=[user_id])
