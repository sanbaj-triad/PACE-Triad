from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime, date, time
from .models import ProjectStatus, InvoiceStatus, ProjectPriority, ProjectType, InvoiceType, MilestoneType, ExpenseType, ExpenseStatus

class AuditBase(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DirectMessageBase(BaseModel):
    content: str
    recipient_id: int

class DirectMessageCreate(DirectMessageBase):
    pass

class DirectMessageOut(DirectMessageBase):
    id: int
    sender_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Location Schemas ---
class LocationBase(BaseModel):
    name: str
    address: Optional[str] = None
    customer_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pay_period_cycle: Optional[str] = "Bi-Weekly"
    weekly_work_hours: Optional[float] = 40.0
    auto_pto_calculation: Optional[bool] = False
    payroll_start_date: Optional[date] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    customer_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pay_period_cycle: Optional[str] = None
    weekly_work_hours: Optional[float] = None
    auto_pto_calculation: Optional[bool] = None
    payroll_start_date: Optional[date] = None

class Location(LocationBase, AuditBase):
    id: int
    class Config: from_attributes = True

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    title: Optional[str] = None
    payment_terms: int = 30
    is_owner: Optional[bool] = False

    class Config:
        from_attributes = True

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    title: Optional[str] = None
    payment_terms: Optional[int] = None
    is_owner: Optional[bool] = None

class Customer(CustomerBase, AuditBase):
    id: int
    locations: List[Location] = []
    class Config: from_attributes = True

# --- User Schemas ---
# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    role: str = "user"
    customer_id: Optional[int] = None
    location_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    start_date: Optional[datetime] = None
    region: Optional[str] = "US/Headquarters"
    last_login: Optional[datetime] = None
    manager_id: Optional[int] = None
    is_active: bool = True
    is_employee: bool = False
    locked_out: bool = False
    login_enabled: bool = False
    needs_password_change: bool = False
    is_online: bool = False
    last_active_at: Optional[datetime] = None
    has_financial_access: bool = False
    home_address: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
    annual_pto_allowance: Optional[float] = 0.0
    hourly_billing_rate: Optional[float] = None
    internal_cost_rate: Optional[float] = None

    class Config:
        from_attributes = True



class UserCreate(UserBase):
    password: Optional[str] = None

class User(UserBase, AuditBase):
    id: int
    customer: Optional[CustomerBase] = None
    location: Optional[Location] = None
    manager: Optional["UserBase"] = None
    direct_reports: List["UserBase"] = []
    notifications: List["Notification"] = []
    class Config: from_attributes = True

class NotificationBase(BaseModel):
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ... skipping lines ...



class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    customer_id: Optional[int] = None
    annual_pto_allowance: Optional[float] = None
    hourly_billing_rate: Optional[float] = None
    internal_cost_rate: Optional[float] = None
    location_id: Optional[int] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    start_date: Optional[datetime] = None
    region: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_employee: Optional[bool] = None
    has_financial_access: Optional[bool] = None
    home_address: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None

class HomeGPSUpdate(BaseModel):
    home_latitude: float
    home_longitude: float

class OffboardRequest(BaseModel):
    target_user_id: int
    transfer_projects: bool = True
    transfer_tasks: bool = True
    transfer_milestones: bool = True
    transfer_leads: bool = True
    transfer_pto_approvals: bool = True
    deactivate_user: bool = True

# --- Project Schemas ---
class CustomerReference(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProjectReference(BaseModel):
    id: int
    name: str
    project_unique_id: Optional[str] = None
    customer: Optional[CustomerReference] = None
    
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_unique_id: Optional[str] = None # Generated server-side
    
    customer_id: int
    location_id: Optional[int] = None
    lead_id: Optional[int] = None
    # created_by removed, determined by auth
    
    priority: str = "Medium"
    # Relaxing validation to allow legacy UPPERCASE values from DB
    project_type: Optional[str] = "Other" 
    customer_po: Optional[str] = None
    is_master_po: bool = False
    customer_pm_id: Optional[int] = None
    pm_id: Optional[int] = None
    invoice_type: str = InvoiceType.NONE
    budget: float = 0.0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    do_not_invoice: bool = False
    
    # Virtual / Annual Project Support
    is_virtual: bool = False
    use_project_billing_schedule: bool = False
    recurring_invoice_frequency: Optional[str] = None
    next_invoice_date: Optional[date] = None
    recurring_invoice_percentage: Optional[float] = None
    
    status: str = ProjectStatus.ACTIVE

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    project_unique_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[int] = None
    location_id: Optional[int] = None
    lead_id: Optional[int] = None
    priority: Optional[str] = None
    # Relax validation
    project_type: Optional[str] = None
    customer_po: Optional[str] = None
    is_master_po: Optional[bool] = None
    do_not_invoice: Optional[bool] = None
    customer_pm_id: Optional[int] = None
    pm_id: Optional[int] = None
    invoice_type: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
    is_virtual: Optional[bool] = None
    use_project_billing_schedule: Optional[bool] = None
    recurring_invoice_frequency: Optional[str] = None
    next_invoice_date: Optional[date] = None
    recurring_invoice_percentage: Optional[float] = None

class ProjectCloneOptions(BaseModel):
    clone_milestones: bool = False
    clone_tasks: bool = False
    link_to_lead_id: Optional[int] = None

class ProjectSmartCloneRequest(BaseModel):
    lead_id: int
    template_project_id: int
    
class TaskWizardDraft(BaseModel):
    temp_id: Optional[str] = None
    description: str
    estimated_effort: float = 0.0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    task_type: Optional[str] = None

class MilestoneWizardDraft(BaseModel):
    temp_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    cost: float = 0.0
    due_date: Optional[datetime] = None
    owner_id: Optional[int] = None
    milestone_number: Optional[int] = None
    tasks: List[TaskWizardDraft] = []

class ProjectSmartCloneExecuteRequest(BaseModel):
    name: str
    description: Optional[str] = None
    lead_id: int
    customer_id: int
    location_id: Optional[int] = None
    budget: float = 0.0
    due_date: Optional[datetime] = None
    project_type: Optional[str] = None
    milestones: List[MilestoneWizardDraft] = []

# --- Expense Schemas ---
class ExpenseAttachmentBase(BaseModel):
    filename: str
    file_path: str

class ExpenseAttachmentCreate(ExpenseAttachmentBase):
    pass

class ExpenseAttachment(ExpenseAttachmentBase, AuditBase):
    id: int
    expense_id: int

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    date_time: datetime
    amount: float
    billable: bool = True
    expense_type: str = ExpenseType.HARDWARE
    status: str = ExpenseStatus.DRAFT
    merchant_name: Optional[str] = None
    notes: Optional[str] = None

class ExpenseBulkAction(BaseModel):
    expense_ids: List[int]

class ExpenseCreate(ExpenseBase):
    pass
    # project_id passed via URL usually, milestone_id optional
    milestone_id: Optional[int] = None
    user_id: Optional[int] = None

class ExpenseUpdate(BaseModel):
    date_time: Optional[datetime] = None
    amount: Optional[float] = None
    billable: Optional[bool] = None
    expense_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    milestone_id: Optional[int] = None
    user_id: Optional[int] = None

class Expense(ExpenseBase, AuditBase):
    id: int
    project_id: int
    milestone_id: Optional[int] = None
    user_id: Optional[int] = None
    attachments: List[ExpenseAttachment] = []
    project: Optional['ProjectReference'] = None
    milestone: Optional['MilestoneBase'] = None
    user: Optional['UserBase'] = None

    class Config:
        from_attributes = True
        use_enum_values = True

# Add expenses to Project and Milestone
# Note: Since they are defined below Project and Milestone, we append them here or just let FastAPI handle it conditionally.
# BUT wait! Project and Milestone schemas are already defined. We can just add them to the Project/Milestone models above?


class Project(ProjectBase, AuditBase):
    id: int
    current_value: float = 0.0
    remaining_value: float = 0.0
    amount_paid: float = 0.0
    balance_due: float = 0.0
    milestones: List['Milestone'] = []
    customer: Optional['CustomerBase'] = None # Use Base to avoid recursion or just Customer if safe
    location: Optional[Location] = None
    lead: Optional['LeadBase'] = None
    pm_user: Optional['UserBase'] = None
    customer_pm_user: Optional['UserBase'] = None
    created_by_user: Optional['UserBase'] = None
    updated_by_user: Optional['UserBase'] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True

    total_billed: float = 0.0
    financial_progress: float = 0.0
    po_file_path: Optional[str] = None
    attachments: List["ProjectAttachment"] = []
    invoices: List["InvoiceForProject"] = []
    expenses: List["Expense"] = []

class ProjectAttachment(BaseModel):
    id: int
    project_id: int
    file_path: str
    filename: str
    description: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Invoice Schemas ---
class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = None # Generated server-side
    status: str = InvoiceStatus.DRAFT
    issue_date: datetime = datetime.utcnow()
    due_date: Optional[datetime] = None
    xero_id: Optional[str] = None
    amount_paid: float = 0.0

class XeroPaymentPush(BaseModel):
    amount: float
    date: str
    account_code: str
    reference: Optional[str] = ""

class InvoicePaymentBase(BaseModel):
    amount: float
    payment_method: str = "Check"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[datetime] = None

class InvoicePaymentCreate(InvoicePaymentBase):
    pass

class InvoicePayment(InvoicePaymentBase, AuditBase):
    id: int
    invoice_id: int
    
    class Config:
        from_attributes = True

class InvoiceCreate(InvoiceBase):
    project_id: int

class Invoice(InvoiceBase, AuditBase):
    id: int
    project_id: int
    project: Optional["Project"] = None
    items: List["LineItem"] = []
    payments: List[InvoicePayment] = []
    created_by_user: Optional['UserBase'] = None
    
    class Config:
        from_attributes = True

class InvoiceForProject(InvoiceBase, AuditBase):
    id: int
    project_id: int
    items: List["LineItem"] = []
    payments: List[InvoicePayment] = []
    created_by_user: Optional['UserBase'] = None
    
    class Config:
        from_attributes = True

# --- Milestone Schemas ---
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    cost: Optional[float] = None
    is_completed: bool = False
    owner_id: Optional[int] = None
    lead_id: Optional[int] = None
    progress: int = 0
    milestone_number: int = 0
    milestone_po: Optional[str] = None
    milestone_type: Optional[str] = MilestoneType.OTHER
    line_item_name: Optional[str] = None
    
    # Global Bucket / Recurring Billing
    is_global_bucket: bool = False
    global_access_level: Optional[str] = "ALL"
    recurring_invoice_frequency: Optional[str] = None
    next_invoice_date: Optional[date] = None
    recurring_invoice_percentage: Optional[float] = None
    
    # Dynamic Fields
    budget_hours: Optional[float] = None
    design_ifr_hours: Optional[float] = None
    design_ifc_hours: Optional[float] = None
    design_asbuilt_hours: Optional[float] = None
    hardware_expense_budget: Optional[float] = None
    hardware_shipping_budget: Optional[float] = None
    hardware_other_expense_budget: Optional[float] = None
    onsite_travel_expense: Optional[float] = None
    onsite_num_trips: Optional[int] = None
    onsite_num_flights: Optional[int] = None
    remote_plc_hours: Optional[float] = None
    remote_hmi_hours: Optional[float] = None
    remote_fat_hours: Optional[float] = None

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(BaseModel):
    milestone_number: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    cost: Optional[float] = None
    is_completed: Optional[bool] = None
    owner_id: Optional[int] = None
    lead_id: Optional[int] = None
    progress: Optional[int] = None
    milestone_po: Optional[str] = None
    milestone_type: Optional[str] = None
    line_item_name: Optional[str] = None
    
    # Global Bucket / Recurring Billing
    is_global_bucket: Optional[bool] = None
    global_access_level: Optional[str] = None
    recurring_invoice_frequency: Optional[str] = None
    next_invoice_date: Optional[date] = None
    recurring_invoice_percentage: Optional[float] = None
    
    budget_hours: Optional[float] = None
    design_ifr_hours: Optional[float] = None
    design_ifc_hours: Optional[float] = None
    design_asbuilt_hours: Optional[float] = None
    hardware_expense_budget: Optional[float] = None
    hardware_shipping_budget: Optional[float] = None
    hardware_other_expense_budget: Optional[float] = None
    onsite_travel_expense: Optional[float] = None
    onsite_num_trips: Optional[int] = None
    onsite_num_flights: Optional[int] = None
    remote_plc_hours: Optional[float] = None
    remote_hmi_hours: Optional[float] = None
    remote_fat_hours: Optional[float] = None

class Milestone(MilestoneBase):
    id: int
    project_id: int
    invoice_id: Optional[int] = None
    invoice: Optional["InvoiceBase"] = None # Nested link
    owner: Optional["UserBase"] = None # Nested link

    class Config:
        from_attributes = True

    total_billed: float = 0.0
    remaining_amount: float = 0.0
    progress_percentage: float = 0.0
    customer_name: Optional[str] = None
    project_name: Optional[str] = None
    audits: List["MilestoneAudit"] = []
    tasks: List["Task"] = []
    
    @property
    def display_id(self):
        return f"M-{self.id}"

class MilestoneAudit(AuditBase):
    id: int
    milestone_id: int
    invoice_id: Optional[int]
    invoice_number: Optional[str]
    action: str
    amount: float
    percentage: Optional[float]

    class Config:
        from_attributes = True

# --- Milestone Schemas --- (Reference needed for LineItem)
class MilestoneReference(BaseModel):
    id: int
    project_id: int
    name: str
    milestone_number: int
    due_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- LineItem Schemas ---
class LineItemBase(BaseModel):
    description: str
    memo: Optional[str] = None
    quantity: float = 1.0
    unit_price: float
    amount: float

class LineItemCreate(LineItemBase):
    pass

class LineItemUpdate(BaseModel):
    description: Optional[str] = None
    memo: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None

class LineItem(LineItemBase):
    id: int
    invoice_id: int
    milestone_id: Optional[int] = None # Expose ID for linking
    milestone: Optional[MilestoneReference] = None

    class Config:
        from_attributes = True

# --- Comment Schemas ---
class CommentBase(BaseModel):
    content: str
    project_id: Optional[int] = None
    task_id: Optional[int] = None

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional['User'] = None

    class Config:
        from_attributes = True

# --- Lead Schemas ---
from .models import LeadStatus

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    estimated_value: Optional[float] = None
    due_date: Optional[datetime] = None
    project_type: Optional[str] = "Other"
    customer_id: Optional[int] = None
    location_id: Optional[int] = None
    poc_id: Optional[int] = None
    customer_contact_id: Optional[int] = None
    customer_contract: Optional[str] = None
    
    @field_validator('due_date', mode='before')
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v
    
    @property
    def display_id(self):
        return f"L-{self.id}"
    status: str = LeadStatus.NEW
    
    class Config:
        from_attributes = True

class LeadCreate(LeadBase):
    pass

class LeadBulkUpdate(BaseModel):
    id: int
    name: Optional[str] = None
    status: Optional[str] = None
    project_type: Optional[str] = None
    estimated_value: Optional[float] = None
    customer_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class LeadToMilestoneConversionRequest(BaseModel):
    parent_project_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    due_date: Optional[datetime] = None
    owner_id: Optional[int] = None
    milestone_type: Optional[str] = None

class Lead(LeadBase, AuditBase):
    id: int
    project: Optional['ProjectReference'] = None # Nested link to project
    milestone: Optional['MilestoneReference'] = None # Nested link to milestone
    customer: Optional['CustomerBase'] = None
    location: Optional[Location] = None
    poc: Optional['UserBase'] = None
    customer_contact_user: Optional['UserBase'] = None

    class Config:
        from_attributes = True

class MilestoneBillItem(BaseModel):
    milestone_id: int
    amount: Optional[float] = None # Specific Amount
    percentage: Optional[float] = None # Percentage to bill (0-100)

class InvoiceGenerate(BaseModel):
    project_id: int
    items: List[MilestoneBillItem]
    invoice_number: Optional[str] = None # Optional, generated if not provided
    issue_date: datetime
    due_date: Optional[datetime] = None



# Resolve forward references
# Moved to bottom due to Task dependencies

# --- Task Schemas ---
from .models import TaskType, TaskStatus, TaskPriority, TimesheetStatus

class TaskEventBase(BaseModel):
    content: str
    event_date: datetime
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hours_spent: float = 0.0
    status: TimesheetStatus = TimesheetStatus.DRAFT
    event_type: str = TaskType.OTHER
    work_location: str = "Office"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    entry_type: str = "Automated"

class TaskEventCreate(TaskEventBase):
    user_id: Optional[int] = None
    task_id: Optional[int] = None
    milestone_id: Optional[int] = None

class TaskEventUpdate(BaseModel):
    content: Optional[str] = None
    event_date: Optional[datetime] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hours_spent: Optional[float] = None
    user_id: Optional[int] = None
    event_type: Optional[str] = None
    work_location: Optional[str] = None
    task_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    clock_out_latitude: Optional[float] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    entry_type: Optional[str] = None
    milestone_id: Optional[int] = None

class TaskEvent(TaskEventBase):
    id: int
    task_id: Optional[int] = None
    milestone_id: Optional[int] = None
    user_id: int
    entry_date: datetime
    user: Optional[User] = None
    task: Optional['TaskBase'] = None
    project_name: Optional[str] = None
    project_number: Optional[str] = None
    milestone_name: Optional[str] = None
    customer_name: Optional[str] = None
    task_title: Optional[str] = None
    
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    description: str
    task_type: str = TaskType.OTHER
    status: str = TaskStatus.OPEN
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_effort: float = 0.0
    estimated_utilization: int = 0
    progress: int = 0
    priority: str = "Medium"
    assigned_to_id: Optional[int] = None # Defaults to current user if None?
    project_id: Optional[int] = None
    milestone_id: Optional[int] = None

    class Config:
        from_attributes = True

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    description: Optional[str] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_effort: Optional[float] = None
    estimated_utilization: Optional[int] = None
    progress: Optional[int] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    project_id: Optional[int] = None
    milestone_id: Optional[int] = None

class Task(TaskBase, AuditBase):
    id: int
    assigned_to: Optional[User] = None
    events: List[TaskEvent] = []
    total_hours_spent: float = 0.0
    project: Optional["ProjectReference"] = None
    milestone: Optional["MilestoneReference"] = None
    
    class Config:
        from_attributes = True


# Report Schemas

class TaskSummaryForReport(BaseModel):
    id: int
    description: str
    task_type: str
    status: str
    hours_logged: float # In the period
    total_hours_spent: float # Lifetime
    estimated_effort: float
    
    class Config:
        from_attributes = True

class UserEffectiveness(BaseModel):
    username: str
    hours_logged: float

class TypeAnalysis(BaseModel):
    task_type: str
    hours_logged: float
    
class LocationBreakdown(BaseModel):
    work_location: str
    hours_logged: float

class TaskAnalysisReport(BaseModel):
    start_date: Optional[date]
    end_date: Optional[date]
    total_hours_logged: float
    by_user: List[UserEffectiveness] = []
    by_type: List[TypeAnalysis]
    by_location: List[LocationBreakdown] = []
    tasks: List[TaskSummaryForReport]

class EventSummaryForReport(BaseModel):
    id: int
    event_date: datetime
    hours_spent: float
    description: Optional[str] = None
    event_type: str
    work_location: str
    username: str
    task_id: int
    task_description: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    
    class Config:
        from_attributes = True

class EventAnalysisReport(BaseModel):
    start_date: Optional[date]
    end_date: Optional[date]
    total_hours_logged: float
    by_user: List[UserEffectiveness] = []
    by_type: List[TypeAnalysis]
    by_location: List[LocationBreakdown] = []
    events: List[EventSummaryForReport]
# Xero Sync Logging
class XeroSyncLogBase(BaseModel):
    endpoint: str
    entity_type: str
    entity_id: Optional[int] = None
    status: str
    details: Optional[str] = None

class XeroSyncLogCreate(XeroSyncLogBase):
    pass

class XeroSyncLog(XeroSyncLogBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Email Logging
class EmailLogBase(BaseModel):
    entity_type: str
    entity_id: Optional[int] = None
    recipients: Optional[str] = None
    subject: Optional[str] = None
    status: str
    details: Optional[str] = None
    created_by_id: Optional[int] = None

class EmailLogCreate(EmailLogBase):
    pass

class EmailLog(EmailLogBase):
    id: int
    timestamp: datetime
    created_by: Optional[UserBase] = None
    
    class Config:
        from_attributes = True

# Analytics Dashboard Schemas
class DashboardMetrics(BaseModel):
    total_leads: int
    leads_by_status: dict
    total_projects: int
    avg_project_completion: float
    projects_by_type: dict
    projects_by_pm: dict
    projects_by_customer: dict
    total_milestones: int
    avg_milestone_completion: float
    milestones_by_type: dict
    milestones_by_user: dict
    total_tasks: int
    avg_task_completion: float
    tasks_by_type: dict
    tasks_by_user: dict
    tasks_avg_time_spent: float
    total_events: int
    total_event_hours: float
    events_by_type: dict
    events_by_user: dict
    events_by_location: dict
    
    class Config:
        from_attributes = True

class AgendaItem(BaseModel):
    id: int
    type: str # 'Task' or 'Milestone'
    title: str
    due_date: Optional[datetime] = None
    status: str
    priority: str

class UserDashboardMetrics(BaseModel):
    login_count: int
    total_tasks_assigned: int
    avg_task_completion: float
    tasks_by_type: dict
    total_event_hours: float
    avg_event_time: float
    deadlines_met_pct: float
    agenda_items: List[AgendaItem]
    event_type_analysis: List[dict] = []
    location_analysis: List[dict] = []

    class Config:
        from_attributes = True

# Resolve all forward references now that all schemas are defined

# --- Project Summary Read-Only Schemas ---
class TaskSummaryOut(BaseModel):
    id: int
    description: Optional[str] = None
    status: str
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[UserBase] = None
    
    class Config:
        from_attributes = True

class MilestoneSummaryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_completed: bool = False
    due_date: Optional[datetime] = None
    tasks: List[TaskSummaryOut] = []
    
    class Config:
        from_attributes = True

class MilestoneProgressOut(BaseModel):
    id: int
    name: str
    milestone_number: Optional[int] = None
    progress: float = 0.0

    class Config:
        from_attributes = True

class ProjectListOut(ProjectBase, AuditBase):
    id: int
    current_value: float = 0.0
    remaining_value: float = 0.0
    amount_paid: float = 0.0
    balance_due: float = 0.0
    total_billed: float = 0.0
    financial_progress: float = 0.0

    customer: Optional['CustomerBase'] = None
    location: Optional[Location] = None
    pm_user: Optional['UserBase'] = None
    created_by_user: Optional['UserBase'] = None
    
    milestones: List[MilestoneProgressOut] = []

    class Config:
        from_attributes = True

class MilestoneListOut(MilestoneBase, AuditBase):
    id: int
    project: Optional['ProjectReference'] = None
    owner: Optional['UserBase'] = None
    
    class Config:
        from_attributes = True

class LeadListOut(LeadBase, AuditBase):
    id: int
    customer: Optional['CustomerBase'] = None
    location: Optional[Location] = None
    poc: Optional['UserBase'] = None
    project: Optional['ProjectReference'] = None
    milestone: Optional['MilestoneBase'] = None

    class Config:
        from_attributes = True

class ProjectSummaryOut(BaseModel):
    id: int
    name: str
    project_unique_id: Optional[str] = None
    description: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    pm_user: Optional[UserBase] = None
    milestones: List[MilestoneSummaryOut] = []
    
    class Config:
        from_attributes = True

Invoice.update_forward_refs()
InvoiceForProject.update_forward_refs()
Project.update_forward_refs()
ProjectListOut.update_forward_refs()
Lead.update_forward_refs()
LeadListOut.update_forward_refs()
Milestone.update_forward_refs()
MilestoneListOut.update_forward_refs()
Task.update_forward_refs()
Expense.update_forward_refs()
User.update_forward_refs()
UserBase.update_forward_refs()

# --- PTO Schemas ---
class PTORequestBase(BaseModel):
    start_date: datetime
    end_date: datetime
    hours_requested: float
    notes: Optional[str] = None

class PTORequestCreate(PTORequestBase):
    pass

class PTORequestUpdateStatus(BaseModel):
    status: str

class PTORequestOut(PTORequestBase):
    id: int
    user_id: int
    status: str
    manager_id: Optional[int] = None
    finance_id: Optional[int] = None

    class Config:
        from_attributes = True

class PTOBankBase(BaseModel):
    user_id: int
    year: int
    allowance_hours: float

class PTOBankCreate(PTOBankBase):
    pass

class PTOBankOut(PTOBankBase):
    id: int
    updated_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None

    class Config:
        from_attributes = True

class PTOAuditLogBase(BaseModel):
    user_id: int
    transaction_type: str
    amount_hours: float
    balance_after: float
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None

class PTOAuditLogOut(PTOAuditLogBase):
    id: int
    
    class Config:
        from_attributes = True

class PTOAuditReportItem(PTOAuditLogOut):
    user_name: str

class PTOLedgerEntry(BaseModel):
    user_id: int
    username: str
    region: str
    year: int
    allowance_hours: float
    approved_pending_hours: float
    taken_hours: float
    remaining_balance: float
    last_updated: Optional[datetime] = None
    last_updated_by: Optional[str] = None

class PTOLedgerReport(BaseModel):
    year: int
    entries: List[PTOLedgerEntry]

class SystemStateUpdate(BaseModel):
    announcement_message: Optional[str] = None
    is_announcement_active: Optional[bool] = None
    app_version: Optional[str] = None

class SystemState(BaseModel):
    id: int
    announcement_message: Optional[str] = None
    is_announcement_active: bool
    app_version: str

    class Config:
        from_attributes = True

# --- Action Items Schemas ---
class ActionItemBase(BaseModel):
    content: str
    is_completed: bool = False
    task_id: Optional[int] = None
    is_deleted: bool = False

class ActionItemCreate(ActionItemBase):
    pass

class ActionItemUpdate(BaseModel):
    content: Optional[str] = None
    is_completed: Optional[bool] = None
    is_deleted: Optional[bool] = None

class ActionItem(ActionItemBase):
    id: int
    user_id: int
    task_id: Optional[int]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
