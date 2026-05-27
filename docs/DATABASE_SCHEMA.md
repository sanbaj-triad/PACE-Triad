# PACE Database Schema Guide

This document defines the relational database architecture of the PACE application. The application utilizes a MySQL / MariaDB engine in development and production (mapped dynamically via SQLAlchemy).

---

## 1. Audit Logging Mixin (`AuditMixin`)

Most core entities inherit from `AuditMixin`. This class automatically adds audit attributes and hooks that link back to the `users` table, allowing the system to track who created or updated a record and when.

| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| `created_at` | `DateTime` | `default=datetime.utcnow` | Timestamp of record creation. |
| `updated_at` | `DateTime` | `default=datetime.utcnow`, `onupdate=datetime.utcnow` | Timestamp of last modification. |
| `created_by_id` | `Integer` | `ForeignKey("users.id")`, `nullable=True` | ID of the User who created this record. |
| `updated_by_id` | `Integer` | `ForeignKey("users.id")`, `nullable=True` | ID of the User who last updated this record. |

---

## 2. Table Definition Catalog

Below is the detailed schema specification for each of the 25 database tables defined in the SQLAlchemy models layer (`app/models.py`).

### 1. `users`
Represents application accounts and employee records. Contains standard credentials, O365 login synchronization flags, geolocation coordinates, and cost rate mappings.
* **Columns**:
  - `id` (INT, Primary Key, Auto-Increment)
  - `username` (VARCHAR(50), Unique, Indexed)
  - `email` (VARCHAR(255), Unique, Indexed)
  - `hashed_password` (VARCHAR(255))
  - `is_active` (BOOLEAN, Default: `True`)
  - `has_financial_access` (BOOLEAN, Default: `False`)
  - `role` (VARCHAR(50), Default: `"user"`)
  - `is_employee` (BOOLEAN, Default: `False`)
  - `first_name` (VARCHAR(100), Nullable)
  - `last_name` (VARCHAR(100), Nullable)
  - `title` (VARCHAR(100), Nullable)
  - `department` (VARCHAR(50), Nullable)
  - `phone` (VARCHAR(50), Nullable)
  - `start_date` (DATETIME, Nullable)
  - `region` (VARCHAR(50), Default: `"US/Headquarters"`)
  - `last_login` (DATETIME, Nullable)
  - `login_count` (INT, Default: `0`)
  - `locked_out` (BOOLEAN, Default: `False`)
  - `login_enabled` (BOOLEAN, Default: `False`)
  - `needs_password_change` (BOOLEAN, Default: `False`)
  - `is_online` (BOOLEAN, Default: `False`)
  - `last_active_at` (DATETIME, Nullable)
  - `home_latitude` (FLOAT, Nullable)
  - `home_longitude` (FLOAT, Nullable)
  - `home_address` (VARCHAR(255), Nullable)
  - `annual_pto_allowance` (FLOAT, Default: `0.0`)
  - `hourly_billing_rate` (FLOAT, Nullable)
  - `internal_cost_rate` (FLOAT, Nullable)
  - `manager_id` (INT, ForeignKey: `users.id`, Nullable)
  - `customer_id` (INT, ForeignKey: `customers.id`, Nullable)
  - `location_id` (INT, ForeignKey: `locations.id`, Nullable)
* **Explicit Relationships**:
  - `manager` -> Self-referential relationship pointing to manager `User` record.
  - `direct_reports` -> List of direct reports (subordinate users).
  - `customer` -> Customer profile link if this user is a client POC.
  - `location` -> Physical office location assigned.
  - `notifications` -> Native notification history list.

### 2. `notifications`
System logs of user-focused action alerts.
* **Columns**:
  - `id` (INT, Primary Key)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `title` (VARCHAR(255))
  - `message` (TEXT, Nullable)
  - `link` (VARCHAR(255), Nullable)
  - `is_read` (BOOLEAN, Default: `False`)
  - `created_at` (DATETIME, Default: `utcnow`)

### 3. `customers`
Profiles of corporate clients.
* **Columns**:
  - `id` (INT, Primary Key)
  - `name` (VARCHAR(255), Indexed)
  - `email` (VARCHAR(255), Nullable)
  - `phone` (VARCHAR(50), Nullable)
  - `address` (VARCHAR(255), Nullable)
  - `title` (VARCHAR(100), Nullable)
  - `payment_terms` (INT, Default: `30` days)
* **Explicit Relationships**:
  - `users` -> Client contacts representing this customer.
  - `projects` -> Projects mapped to this client.
  - `locations` -> Customer-specific locations/job sites.

### 4. `locations`
Geographically mapped customer offices or job sites. Used in Haversine distance calculations for automatic timesheet location assignment.
* **Columns**:
  - `id` (INT, Primary Key)
  - `name` (VARCHAR(255), Indexed)
  - `address` (VARCHAR(500), Nullable)
  - `customer_id` (INT, ForeignKey: `customers.id`)
  - `latitude` (FLOAT, Nullable)
  - `longitude` (FLOAT, Nullable)
  - `pay_period_cycle` (VARCHAR(50), Default: `"Bi-Weekly"`)
  - `weekly_work_hours` (FLOAT, Default: `40.0`)
  - `auto_pto_calculation` (BOOLEAN, Default: `False`)
  - `payroll_start_date` (DATE, Nullable)

### 5. `projects`
Corporate contracts and deliverables managed by internal employees.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_unique_id` (VARCHAR(50), Unique, Indexed)
  - `name` (VARCHAR(255), Indexed)
  - `description` (VARCHAR(5000), Nullable)
  - `customer_id` (INT, ForeignKey: `customers.id`)
  - `lead_id` (INT, ForeignKey: `leads.id`, Nullable)
  - `priority` (VARCHAR(50), Default: `"Medium"`)
  - `project_type` (VARCHAR(50), Default: `"Other"`)
  - `customer_po` (VARCHAR(100), Nullable)
  - `is_master_po` (BOOLEAN, Default: `False`)
  - `budget` (FLOAT, Default: `0.0`)
  - `po_file_path` (VARCHAR(500), Nullable)
  - `do_not_invoice` (BOOLEAN, Default: `False`)
  - `is_virtual` (BOOLEAN, Default: `False`)
  - `use_project_billing_schedule` (BOOLEAN, Default: `False`)
  - `recurring_invoice_frequency` (VARCHAR(50), Nullable)
  - `next_invoice_date` (DATE, Nullable)
  - `recurring_invoice_percentage` (FLOAT, Nullable)
  - `customer_pm_id` (INT, ForeignKey: `users.id`, Nullable)
  - `pm_id` (INT, ForeignKey: `users.id`, Nullable)
  - `location_id` (INT, ForeignKey: `locations.id`, Nullable)
  - `invoice_type` (VARCHAR(50), Default: `"None"`)
  - `status` (VARCHAR(50), Default: `"active"`)
  - `start_date` (DATETIME, Nullable)
  - `due_date` (DATETIME, Nullable)
* **Explicit Relationships**:
  - `customer` -> Parent corporate client.
  - `lead` -> Original CRM lead linked to project.
  - `pm_user` -> PACE manager responsible for execution.
  - `customer_pm_user` -> Client-side representative.
  - `invoices` -> Invoices issued for project.
  - `milestones` -> Billing/delivery milestones.
  - `tasks` -> Work tasks.
  - `expenses` -> Travel, hardware, and subcontractor costs.

### 6. `project_attachments`
Reference files and scopes linked to a project.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_id` (INT, ForeignKey: `projects.id`)
  - `file_path` (VARCHAR(500))
  - `filename` (VARCHAR(255))
  - `description` (VARCHAR(1000), Nullable)
  - `created_at` (DATETIME, Default: `func.now`)

### 7. `invoices`
Accounts receivable documents issued to customers.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_id` (INT, ForeignKey: `projects.id`)
  - `invoice_number` (VARCHAR(50), Unique, Indexed)
  - `status` (VARCHAR(50), Default: `"draft"`)
  - `issue_date` (DATETIME, Default: `utcnow`)
  - `due_date` (DATETIME, Nullable)
  - `xero_id` (VARCHAR(100), Nullable, Indexed)
  - `amount_paid` (FLOAT, Default: `0.0`)
* **Explicit Relationships**:
  - `items` -> Individual line items billed.
  - `payments` -> Partial payment logs from client.

### 8. `invoice_payments`
Logs of financial payments (checks, wires, writes-offs) applied to invoices.
* **Columns**:
  - `id` (INT, Primary Key)
  - `invoice_id` (INT, ForeignKey: `invoices.id`)
  - `amount` (FLOAT, Not Null)
  - `payment_date` (DATETIME, Default: `utcnow`)
  - `payment_method` (VARCHAR(50), Default: `"Check"`)
  - `reference_number` (VARCHAR(100), Nullable)
  - `notes` (VARCHAR(500), Nullable)

### 9. `line_items`
Billing rows attached to an Invoice.
* **Columns**:
  - `id` (INT, Primary Key)
  - `invoice_id` (INT, ForeignKey: `invoices.id`)
  - `milestone_id` (INT, ForeignKey: `milestones.id`, Nullable)
  - `description` (VARCHAR(500))
  - `memo` (VARCHAR(500), Nullable)
  - `quantity` (FLOAT, Default: `1.0`)
  - `unit_price` (FLOAT)
  - `amount` (FLOAT)

### 10. `milestones`
Billing and completion thresholds defined on a project. Contains sparse budget/hours targets categorized by discipline.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_id` (INT, ForeignKey: `projects.id`)
  - `invoice_id` (INT, ForeignKey: `invoices.id`, Nullable)
  - `name` (VARCHAR(255))
  - `description` (VARCHAR(5000), Nullable)
  - `start_date` (DATETIME, Nullable)
  - `due_date` (DATETIME, Nullable)
  - `cost` (FLOAT, Nullable)
  - `is_completed` (BOOLEAN, Default: `False`)
  - `owner_id` (INT, ForeignKey: `users.id`, Nullable)
  - `lead_id` (INT, ForeignKey: `leads.id`, Nullable)
  - `progress` (INT, Default: `0`)
  - `milestone_number` (INT, Default: `0`)
  - `milestone_po` (VARCHAR(100), Nullable)
  - `milestone_type` (VARCHAR(50), Default: `"Other"`)
  - `line_item_name` (VARCHAR(255), Nullable)
  - `is_global_bucket` (BOOLEAN, Default: `False`)
  - `global_access_level` (VARCHAR(50), Default: `"ALL"`)
  - `recurring_invoice_frequency` (VARCHAR(50), Nullable)
  - `next_invoice_date` (DATE, Nullable)
  - `recurring_invoice_percentage` (FLOAT, Nullable)
  - `budget_hours` (FLOAT, Nullable)
  - `design_ifr_hours` (FLOAT, Nullable)
  - `design_ifc_hours` (FLOAT, Nullable)
  - `design_asbuilt_hours` (FLOAT, Nullable)
  - `hardware_expense_budget` (FLOAT, Nullable)
  - `hardware_shipping_budget` (FLOAT, Nullable)
  - `hardware_other_expense_budget` (FLOAT, Nullable)
  - `onsite_travel_expense` (FLOAT, Nullable)
  - `onsite_num_trips` (INT, Nullable)
  - `onsite_num_flights` (INT, Nullable)
  - `remote_plc_hours` (FLOAT, Nullable)
  - `remote_hmi_hours` (FLOAT, Nullable)
  - `remote_fat_hours` (FLOAT, Nullable)

### 11. `milestone_audits`
Record of billing status updates, used to generate detailed financial metrics and reversal logs.
* **Columns**:
  - `id` (INT, Primary Key)
  - `milestone_id` (INT, ForeignKey: `milestones.id`)
  - `invoice_id` (INT, ForeignKey: `invoices.id`, Nullable)
  - `invoice_number` (VARCHAR(50), Nullable)
  - `action` (VARCHAR(50), Default: `"Billed"`)
  - `amount` (FLOAT)
  - `percentage` (FLOAT, Nullable)

### 12. `leads`
Original CRM opportunity records that feed into Projects and Milestones.
* **Columns**:
  - `id` (INT, Primary Key)
  - `name` (VARCHAR(255), Indexed)
  - `email` (VARCHAR(255), Nullable)
  - `company` (VARCHAR(255), Nullable)
  - `description` (VARCHAR(5000), Nullable)
  - `estimated_value` (FLOAT, Nullable)
  - `due_date` (DATETIME, Nullable)
  - `project_type` (VARCHAR(50), Default: `"Other"`)
  - `customer_id` (INT, ForeignKey: `customers.id`, Nullable)
  - `location_id` (INT, ForeignKey: `locations.id`, Nullable)
  - `poc_id` (INT, ForeignKey: `users.id`, Nullable)
  - `customer_contact_id` (INT, ForeignKey: `users.id`, Nullable)
  - `customer_contract` (VARCHAR(255), Nullable)
  - `status` (VARCHAR(50), Default: `"new"`)

### 13. `comments`
Collaboration comments pinned on Tasks or Projects.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_id` (INT, ForeignKey: `projects.id`, Nullable)
  - `task_id` (INT, ForeignKey: `tasks.id`, Nullable)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `content` (VARCHAR(1000))
  - `created_at` (DATETIME, Default: `utcnow`)

### 14. `tasks`
Individual work tickets assigned to standard employees.
* **Columns**:
  - `id` (INT, Primary Key)
  - `description` (VARCHAR(5000), Nullable)
  - `task_type` (VARCHAR(50), Default: `"Other"`)
  - `status` (VARCHAR(50), Default: `"Open"`)
  - `priority` (VARCHAR(50), Default: `"Medium"`)
  - `start_date` (DATETIME, Nullable)
  - `due_date` (DATETIME, Nullable)
  - `estimated_effort` (FLOAT, Default: `0.0`)
  - `estimated_utilization` (INT, Default: `0`)
  - `progress` (INT, Default: `0`)
  - `o365_event_id` (VARCHAR(255), Nullable)
  - `assigned_to_id` (INT, ForeignKey: `users.id`)
  - `project_id` (INT, ForeignKey: `projects.id`, Nullable)
  - `milestone_id` (INT, ForeignKey: `milestones.id`, Nullable)

### 15. `task_events`
Individual timesheet records containing logged hours, GPS coordinates, and submission states.
* **Columns**:
  - `id` (INT, Primary Key)
  - `status` (VARCHAR(50), Default: `"Draft"`)
  - `task_id` (INT, ForeignKey: `tasks.id`, Nullable)
  - `milestone_id` (INT, ForeignKey: `milestones.id`, Nullable)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `content` (VARCHAR(5000))
  - `event_date` (DATETIME, Default: `utcnow`)
  - `start_time` (TIME, Nullable)
  - `end_time` (TIME, Nullable)
  - `event_type` (VARCHAR(50), Default: `"Other"`)
  - `hours_spent` (FLOAT, Default: `0.0`)
  - `entry_date` (DATETIME, Default: `utcnow`)
  - `work_location` (VARCHAR(50), Default: `"Office"`)
  - `latitude` (FLOAT, Nullable)
  - `longitude` (FLOAT, Nullable)
  - `clock_out_latitude` (FLOAT, Nullable)
  - `clock_out_longitude` (FLOAT, Nullable)
  - `entry_type` (VARCHAR(50), Default: `"Automated"`)

### 16. `expenses`
Business expenses (flights, hotel, meals, hardware parts) logged against projects.
* **Columns**:
  - `id` (INT, Primary Key)
  - `project_id` (INT, ForeignKey: `projects.id`, Indexed)
  - `milestone_id` (INT, ForeignKey: `milestones.id`, Indexed, Nullable)
  - `user_id` (INT, ForeignKey: `users.id`, Indexed, Nullable)
  - `date_time` (DATETIME, Default: `utcnow`)
  - `amount` (FLOAT, Default: `0.0`)
  - `billable` (BOOLEAN, Default: `True`)
  - `expense_type` (VARCHAR(50), Default: `"Hardware"`)
  - `status` (VARCHAR(50), Default: `"Draft"`)
  - `merchant_name` (VARCHAR(255), Nullable)
  - `notes` (VARCHAR(5000), Nullable)

### 17. `expense_attachments`
Uploaded receipts for logged expenses.
* **Columns**:
  - `id` (INT, Primary Key)
  - `expense_id` (INT, ForeignKey: `expenses.id`, Indexed)
  - `filename` (VARCHAR(255))
  - `file_path` (VARCHAR(500))

### 18. `xero_sync_logs`
System logs tracking transactional updates pushed to the Xero API.
* **Columns**:
  - `id` (INT, Primary Key)
  - `timestamp` (DATETIME, Default: `now`)
  - `endpoint` (VARCHAR(250), Indexed)
  - `entity_type` (VARCHAR(100), Indexed)
  - `entity_id` (INT, Nullable, Indexed)
  - `status` (VARCHAR(50), Indexed)
  - `details` (VARCHAR(5000), Nullable)

### 19. `email_logs`
System audit logs detailing outgoing transactional notification emails.
* **Columns**:
  - `id` (INT, Primary Key)
  - `timestamp` (DATETIME, Default: `now`)
  - `entity_type` (VARCHAR(100), Indexed)
  - `entity_id` (INT, Nullable, Indexed)
  - `recipients` (VARCHAR(1000), Nullable)
  - `subject` (VARCHAR(500), Nullable)
  - `status` (VARCHAR(50), Indexed)
  - `details` (VARCHAR(5000), Nullable)
  - `created_by_id` (INT, ForeignKey: `users.id`, Nullable)

### 20. `pto_banks`
The yearly allocation of Paid Time Off hours per user.
* **Columns**:
  - `id` (INT, Primary Key)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `year` (INT, Indexed)
  - `allowance_hours` (FLOAT, Default: `0.0`)

### 21. `pto_requests`
Planned PTO request filings and authorization states.
* **Columns**:
  - `id` (INT, Primary Key)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `start_date` (DATETIME)
  - `end_date` (DATETIME)
  - `hours_requested` (FLOAT)
  - `status` (VARCHAR(50), Default: `"Pending"`)
  - `notes` (TEXT, Nullable)
  - `manager_id` (INT, ForeignKey: `users.id`, Nullable)
  - `finance_id` (INT, ForeignKey: `users.id`, Nullable)
  - `o365_event_id` (VARCHAR(255), Nullable)

### 22. `system_state`
Global runtime constants, such as maintenance announcements and system version numbers.
* **Columns**:
  - `id` (INT, Primary Key)
  - `announcement_message` (VARCHAR(500), Nullable)
  - `is_announcement_active` (BOOLEAN, Default: `False`)
  - `app_version` (VARCHAR(50), Default: `"1.0.0"`)

### 23. `direct_messages`
Historical text chat logs.
* **Columns**:
  - `id` (INT, Primary Key)
  - `sender_id` (INT, ForeignKey: `users.id`)
  - `recipient_id` (INT, ForeignKey: `users.id`)
  - `content` (TEXT, Not Null)
  - `is_read` (BOOLEAN, Default: `False`)
  - `created_at` (DATETIME, Default: `utcnow`)

### 24. `action_items`
Personal checklists assigned directly to employees.
* **Columns**:
  - `id` (INT, Primary Key)
  - `user_id` (INT, ForeignKey: `users.id`)
  - `task_id` (INT, ForeignKey: `tasks.id`, Nullable)
  - `content` (VARCHAR(1000))
  - `is_completed` (BOOLEAN, Default: `False`)
  - `is_deleted` (BOOLEAN, Default: `False`)

### 25. `pto_audit_logs`
Financial transaction ledgers tracking automatic allocations and manual adjustments of PTO banks.
* **Columns**:
  - `id` (INT, Primary Key)
  - `user_id` (INT, ForeignKey: `users.id`, Not Null)
  - `transaction_type` (VARCHAR(100), Not Null)
  - `amount_hours` (FLOAT, Not Null)
  - `balance_after` (FLOAT, Not Null)
  - `transaction_date` (DATETIME, Default: `utcnow`)
  - `notes` (TEXT, Nullable)

---

## 3. Physical Engine & Constraint Properties

The physical database is compiled under **MariaDB 10.6+ / MySQL 8.x** with the following system characteristics:

- **Storage Engine**: `InnoDB` is enforced across all tables to support ACID compliance, transaction handling, and foreign key constraints.
- **Character Set & Collation**: Enforces `utf8mb4` with collation `utf8mb4_general_ci` or `utf8mb4_0900_ai_ci` to support full Unicode storage (e.g. text/symbol characters).
- **Index Naming Conventions**:
  - Primary Keys are mapped to implicit indexes.
  - Custom column indexes created by SQLAlchemy use the `ix_<table_name>_<column_name>` naming pattern (e.g., `ix_customers_name` on `customers.name`, `ix_invoices_xero_id` on `invoices.xero_id`).
- **Physical Foreign Key Mappings**:
  - Foreign key constraints mapped physically follow the MariaDB/MySQL automatic name suffix pattern `<table_name>_ibfk_<N>` (e.g., `action_items_ibfk_1` referencing `users.id` inside `action_items`).
  - Legacy schema anomalies (e.g., duplicate constraints in `comments`) represent physical metadata debt described in the Maintenance Log.
- **Physical Schema Anomalies**:
  - Table `customers` contains a physical column `is_owner` (`tinyint(1) DEFAULT '0'`) that is not yet declared in the SQLAlchemy model `Customer` inside [models.py](file:///c:/Users/Sanbaj%20Ansari/Downloads/PACE-App-main/PACE-App-main/app/models.py).
  - Table `task_events` contains a physical column `created_at` (`datetime DEFAULT NULL`) that is not declared in the SQLAlchemy model `TaskEvent` inside [models.py](file:///c:/Users/Sanbaj%20Ansari/Downloads/PACE-App-main/PACE-App-main/app/models.py) (which uses `event_date` and `entry_date` for timestamping instead).
  - Table `task_notes` exists in the physical DB dump as a legacy table but has no SQLAlchemy model in [models.py](file:///c:/Users/Sanbaj%20Ansari/Downloads/PACE-App-main/PACE-App-main/app/models.py). The codebase renames this table to `task_events` via [migrate_task_events.py](file:///c:/Users/Sanbaj%20Ansari/Downloads/PACE-App-main/PACE-App-main/migrate_task_events.py), but the legacy table remains in DB dumps/backups.


