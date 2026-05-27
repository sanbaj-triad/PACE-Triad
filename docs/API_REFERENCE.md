# PACE API Reference Manual

This document provides an exhaustive, auto-extracted catalog of all FastAPI endpoints registered within the PACE application backend. It includes request parameters, HTTP methods, authorization requirements, and return structures.

## Table of Contents

- [Authentication](#authentication)
- [Analytics](#analytics)
- [Users](#users)
- [Customers](#customers)
- [Locations](#locations)
- [Projects & Attachments](#projects--attachments)
- [Milestones & Audits](#milestones--audits)
- [Invoices & Payments](#invoices--payments)
- [Tasks & Time Logging](#tasks--time-logging)
- [Expenses](#expenses)
- [Calendar & O365](#calendar--o365)
- [AI Integration](#ai-integration)
- [Paid Time Off (PTO)](#paid-time-off-pto)
- [Direct Messages](#direct-messages)
- [Action Items](#action-items)
- [System & Integrations](#system--integrations)

---

## Authentication

### `GET` `/auth/callback/microsoft`

* **Function Name**: `callback_microsoft`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `code` | `str` | Required |
| `request` | `starlette.requests.Request` | Required |


### `POST` `/auth/change-password`

* **Function Name**: `change_password`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `req` | `ChangePasswordRequest` | Required |


### `POST` `/auth/forgot-password`

* **Function Name**: `forgot_password`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `req` | `ForgotPasswordRequest` | Required |


### `GET` `/auth/login/microsoft`

* **Function Name**: `login_microsoft`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `starlette.requests.Request` | Required |


### `POST` `/auth/microsoft/mobile-exchange`

* **Function Name**: `mobile_microsoft_exchange`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `access_token` | `str` | Required |


### `POST` `/token`

* **Function Name**: `login_for_access_token`
* **Authentication Level**: **Public**
* **Response Model**: `LoginResponse`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `form_data` | `fastapi.security.oauth2.OAuth2PasswordRequestForm` | Depends(dependency=None, use_cache=True, scope=None) |



---

## Analytics

### `GET` `/analytics/active-users`

* **Function Name**: `get_active_users`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/analytics/dashboard`

* **Function Name**: `read_dashboard_metrics`
* **Authentication Level**: **Public**
* **Response Model**: `DashboardMetrics`

*No request body or query parameters required.*


### `GET` `/analytics/my-dashboard`

* **Function Name**: `read_user_dashboard_metrics`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `UserDashboardMetrics`

*No request body or query parameters required.*



---

## Users

### `GET` `/users/`

* **Function Name**: `read_users`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[User]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `POST` `/users/`

* **Function Name**: `create_user`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `User`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user` | `UserCreate` | Required |


### `POST` `/users/import`

* **Function Name**: `import_users`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `file` | `fastapi.datastructures.UploadFile` | Required |


### `GET` `/users/me`

* **Function Name**: `read_user_me`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `User`

*No request body or query parameters required.*


### `GET` `/users/me/action-items`

* **Function Name**: `read_my_action_items`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[ActionItem]`

*No request body or query parameters required.*


### `POST` `/users/me/action-items`

* **Function Name**: `create_my_action_item`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `ActionItem`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `action_item` | `ActionItemCreate` | Required |


### `DELETE` `/users/me/action-items/{item_id}`

* **Function Name**: `delete_my_action_item`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `item_id` | `int` | Required |
| `permanent` | `bool` | False |


### `PUT` `/users/me/action-items/{item_id}`

* **Function Name**: `update_my_action_item`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `ActionItem`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `item_id` | `int` | Required |
| `action_item` | `ActionItemUpdate` | Required |


### `PUT` `/users/me/home_gps`

* **Function Name**: `update_my_home_gps`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `User`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `HomeGPSUpdate` | Required |


### `DELETE` `/users/{user_id}`

* **Function Name**: `delete_user`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `int` | Required |


### `GET` `/users/{user_id}`

* **Function Name**: `read_user`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `User`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `int` | Required |


### `PUT` `/users/{user_id}`

* **Function Name**: `update_user`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `User`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `int` | Required |
| `user` | `UserUpdate` | Required |


### `POST` `/users/{user_id}/offboard`

* **Function Name**: `offboard_user`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `int` | Required |
| `request` | `OffboardRequest` | Required |


### `GET` `/users/{user_id}/offboard-stats`

* **Function Name**: `get_offboard_stats`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `int` | Required |



---

## Customers

### `GET` `/customers/`

* **Function Name**: `read_customers`
* **Authentication Level**: **Public**
* **Response Model**: `List[Customer]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `POST` `/customers/`

* **Function Name**: `create_customer`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Customer`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `customer` | `CustomerCreate` | Required |


### `DELETE` `/customers/{customer_id}`

* **Function Name**: `delete_customer`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `customer_id` | `int` | Required |


### `GET` `/customers/{customer_id}`

* **Function Name**: `read_customer`
* **Authentication Level**: **Public**
* **Response Model**: `Customer`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `customer_id` | `int` | Required |


### `PUT` `/customers/{customer_id}`

* **Function Name**: `update_customer`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Customer`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `customer_id` | `int` | Required |
| `customer` | `CustomerUpdate` | Required |



---

## Locations

### `GET` `/locations/`

* **Function Name**: `read_locations`
* **Authentication Level**: **Public**
* **Response Model**: `List[Location]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `customer_id` | `Optional[int]` | None |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `POST` `/locations/`

* **Function Name**: `create_location`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Location`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `location` | `LocationCreate` | Required |


### `DELETE` `/locations/{location_id}`

* **Function Name**: `delete_location`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `location_id` | `int` | Required |


### `PUT` `/locations/{location_id}`

* **Function Name**: `update_location`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Location`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `location_id` | `int` | Required |
| `location` | `LocationUpdate` | Required |



---

## Projects & Attachments

### `DELETE` `/attachments/{attachment_id}`

* **Function Name**: `delete_attachment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `attachment_id` | `int` | Required |


### `GET` `/attachments/{attachment_id}/download`

* **Function Name**: `download_attachment`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `attachment_id` | `int` | Required |


### `GET` `/projects/`

* **Function Name**: `read_projects`
* **Authentication Level**: **Public**
* **Response Model**: `List[ProjectListOut]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |
| `unbilled_only` | `bool` | False |


### `POST` `/projects/`

* **Function Name**: `create_project`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Project`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project` | `ProjectCreate` | Required |


### `DELETE` `/projects/attachments/{attachment_id}`

* **Function Name**: `delete_project_attachment`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `attachment_id` | `int` | Required |


### `GET` `/projects/attachments/{attachment_id}/download`

* **Function Name**: `download_project_attachment`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `attachment_id` | `int` | Required |


### `POST` `/projects/smart-clone-execute`

* **Function Name**: `smart_clone_execute`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Project`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `ProjectSmartCloneExecuteRequest` | Required |


### `GET` `/projects/summary`

* **Function Name**: `read_projects_summary`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[ProjectSummaryOut]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 50000 |


### `DELETE` `/projects/{project_id}`

* **Function Name**: `delete_project`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `GET` `/projects/{project_id}`

* **Function Name**: `read_project`
* **Authentication Level**: **Public**
* **Response Model**: `Project`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `PUT` `/projects/{project_id}`

* **Function Name**: `update_project`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Project`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `project` | `ProjectUpdate` | Required |


### `POST` `/projects/{project_id}/attachments`

* **Function Name**: `create_project_attachment`
* **Authentication Level**: **Public**
* **Response Model**: `ProjectAttachment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `file` | `fastapi.datastructures.UploadFile` | Required |
| `description` | `Optional[str]` | Optional |


### `POST` `/projects/{project_id}/clone`

* **Function Name**: `clone_project`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Project`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `options` | `ProjectCloneOptions` | Required |


### `GET` `/projects/{project_id}/comments`

* **Function Name**: `read_comments`
* **Authentication Level**: **Public**
* **Response Model**: `List[Comment]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `POST` `/projects/{project_id}/comments`

* **Function Name**: `create_comment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Comment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `comment` | `CommentCreate` | Required |


### `GET` `/projects/{project_id}/expenses`

* **Function Name**: `read_expenses_by_project`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[Expense]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `POST` `/projects/{project_id}/expenses`

* **Function Name**: `create_expense`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Expense`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `expense` | `ExpenseCreate` | Required |


### `GET` `/projects/{project_id}/milestones/`

* **Function Name**: `read_project_milestones`
* **Authentication Level**: **Public**
* **Response Model**: `List[Milestone]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `POST` `/projects/{project_id}/milestones/`

* **Function Name**: `create_project_milestone`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Milestone`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `milestone` | `MilestoneCreate` | Required |


### `GET` `/projects/{project_id}/report/pdf`

* **Function Name**: `get_project_report_pdf`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |


### `POST` `/projects/{project_id}/upload-po`

* **Function Name**: `upload_project_po`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `project_id` | `int` | Required |
| `file` | `fastapi.datastructures.UploadFile` | Required |



---

## Milestones & Audits

### `GET` `/milestones/`

* **Function Name**: `read_all_milestones`
* **Authentication Level**: **Public**
* **Response Model**: `List[MilestoneListOut]`

*No request body or query parameters required.*


### `DELETE` `/milestones/{milestone_id}`

* **Function Name**: `delete_milestone`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `milestone_id` | `int` | Required |


### `PUT` `/milestones/{milestone_id}`

* **Function Name**: `update_milestone`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Milestone`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `milestone_id` | `int` | Required |
| `milestone` | `MilestoneUpdate` | Required |


### `POST` `/milestones/{milestone_id}/clone`

* **Function Name**: `clone_milestone`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Milestone`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `milestone_id` | `int` | Required |



---

## Invoices & Payments

### `GET` `/invoices/`

* **Function Name**: `read_invoices`
* **Authentication Level**: **Public**
* **Response Model**: `List[Invoice]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `POST` `/invoices/`

* **Function Name**: `create_invoice`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Invoice`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice` | `InvoiceCreate` | Required |


### `POST` `/invoices/generate`

* **Function Name**: `generate_invoice`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Invoice`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `data` | `InvoiceGenerate` | Required |


### `GET` `/invoices/{id}/download-pdf`

* **Function Name**: `get_invoice_pdf_download`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `id` | `int` | Required |


### `POST` `/invoices/{id}/send`

* **Function Name**: `send_invoice`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `id` | `int` | Required |
| `email_request` | `EmailRequest` | Required |


### `DELETE` `/invoices/{invoice_id}`

* **Function Name**: `delete_invoice`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `GET` `/invoices/{invoice_id}`

* **Function Name**: `read_invoice`
* **Authentication Level**: **Public**
* **Response Model**: `Invoice`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `GET` `/invoices/{invoice_id}/items/`

* **Function Name**: `read_invoice_items`
* **Authentication Level**: **Public**
* **Response Model**: `List[LineItem]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `POST` `/invoices/{invoice_id}/items/`

* **Function Name**: `create_invoice_item`
* **Authentication Level**: **Public**
* **Response Model**: `LineItem`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |
| `item` | `LineItemCreate` | Required |


### `POST` `/invoices/{invoice_id}/payments`

* **Function Name**: `record_invoice_payment`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |
| `payment` | `XeroPaymentPush` | Required |


### `GET` `/invoices/{invoice_id}/payments/`

* **Function Name**: `read_invoice_payments`
* **Authentication Level**: **Public**
* **Response Model**: `List[InvoicePayment]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `POST` `/invoices/{invoice_id}/payments/`

* **Function Name**: `create_local_invoice_payment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `InvoicePayment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |
| `payment` | `InvoicePaymentCreate` | Required |


### `POST` `/invoices/{invoice_id}/payments/`

* **Function Name**: `create_invoice_payment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `InvoicePayment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |
| `payment` | `InvoicePaymentCreate` | Required |


### `DELETE` `/invoices/{invoice_id}/payments/{payment_id}`

* **Function Name**: `delete_invoice_payment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |
| `payment_id` | `int` | Required |


### `GET` `/invoices/{invoice_id}/pdf`

* **Function Name**: `get_invoice_pdf`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `POST` `/invoices/{invoice_id}/refresh`

* **Function Name**: `refresh_invoice_from_xero`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `POST` `/invoices/{invoice_id}/sync`

* **Function Name**: `sync_invoice`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `invoice_id` | `int` | Required |


### `DELETE` `/line-items/{item_id}`

* **Function Name**: `delete_line_item`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `item_id` | `int` | Required |


### `PUT` `/line-items/{item_id}`

* **Function Name**: `update_line_item`
* **Authentication Level**: **Public**
* **Response Model**: `LineItem`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `item_id` | `int` | Required |
| `item` | `LineItemUpdate` | Required |


### `POST` `/task-events/approve`

* **Function Name**: `approve_timesheet`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `TimesheetAction` | Required |


### `POST` `/task-events/lock_project`

* **Function Name**: `lock_project`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `ProjectLockAction` | Required |


### `POST` `/task-events/reject`

* **Function Name**: `reject_timesheet`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `TimesheetAction` | Required |


### `POST` `/task-events/submit`

* **Function Name**: `submit_timesheet`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `TimesheetAction` | Required |



---

## Tasks & Time Logging

### `POST` `/events`

* **Function Name**: `create_global_event`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `TaskEvent`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `event` | `TaskEventCreate` | Required |


### `GET` `/task-events/`

* **Function Name**: `read_task_events`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[TaskEvent]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |
| `user_id` | `Optional[int]` | None |


### `DELETE` `/task-events/{event_id}`

* **Function Name**: `delete_task_event`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `event_id` | `int` | Required |


### `PUT` `/task-events/{event_id}`

* **Function Name**: `update_task_event`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `TaskEvent`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `event_id` | `int` | Required |
| `event_update` | `TaskEventUpdate` | Required |


### `GET` `/tasks/`

* **Function Name**: `read_tasks`
* **Authentication Level**: **Public**
* **Response Model**: `List[Task]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |
| `assigned_to_id` | `Optional[int]` | None |
| `task_type` | `Optional[app.models.TaskType]` | None |
| `hide_completed` | `bool` | False |
| `project_id` | `Optional[int]` | None |


### `POST` `/tasks/`

* **Function Name**: `create_task`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Task`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task` | `TaskCreate` | Required |


### `DELETE` `/tasks/{task_id}`

* **Function Name**: `delete_task`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |


### `GET` `/tasks/{task_id}`

* **Function Name**: `read_task`
* **Authentication Level**: **Public**
* **Response Model**: `Task`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |


### `PUT` `/tasks/{task_id}`

* **Function Name**: `update_task`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Task`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |
| `task` | `TaskUpdate` | Required |


### `POST` `/tasks/{task_id}/clone`

* **Function Name**: `clone_task`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Task`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |


### `GET` `/tasks/{task_id}/comments`

* **Function Name**: `read_task_comments`
* **Authentication Level**: **Public**
* **Response Model**: `List[Comment]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |


### `POST` `/tasks/{task_id}/comments`

* **Function Name**: `create_task_comment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Comment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |
| `comment` | `CommentCreate` | Required |
| `background_tasks` | `fastapi.background.BackgroundTasks` | Required |


### `POST` `/tasks/{task_id}/events`

* **Function Name**: `create_task_event`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `TaskEvent`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |
| `event` | `TaskEventCreate` | Required |


### `GET` `/tasks/{task_id}/pdf`

* **Function Name**: `generate_task_pdf`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `task_id` | `int` | Required |



---

## Expenses

### `GET` `/expenses/`

* **Function Name**: `read_all_expenses`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[Expense]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |
| `user_id` | `Optional[int]` | None |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |


### `POST` `/expenses/bulk-approve`

* **Function Name**: `bulk_approve_expenses`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `ExpenseBulkAction` | Required |


### `POST` `/expenses/bulk-reject`

* **Function Name**: `bulk_reject_expenses`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `ExpenseBulkAction` | Required |


### `POST` `/expenses/bulk-submit`

* **Function Name**: `bulk_submit_expenses`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `payload` | `ExpenseBulkAction` | Required |


### `POST` `/expenses/parse-receipt`

* **Function Name**: `parse_receipt`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `file` | `fastapi.datastructures.UploadFile` | Required |


### `DELETE` `/expenses/{expense_id}`

* **Function Name**: `delete_expense`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `expense_id` | `int` | Required |


### `PUT` `/expenses/{expense_id}`

* **Function Name**: `update_expense`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Expense`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `expense_id` | `int` | Required |
| `expense` | `ExpenseUpdate` | Required |


### `POST` `/expenses/{expense_id}/attachments`

* **Function Name**: `upload_expense_attachment`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `ExpenseAttachment`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `expense_id` | `int` | Required |
| `file` | `fastapi.datastructures.UploadFile` | Required |



---

## Calendar & O365

### `GET` `/calendar/events`

* **Function Name**: `get_calendar_events`
* **Authentication Level**: **Authenticated User**
* **Description**: Fetches due dates across Leads, Projects, Milestones, Invoices, and Tasks for a unified calendar.
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `Optional[int]` | None |
| `types` | `Optional[str]` | None |


### `GET` `/calendar/onsite.ics`

* **Function Name**: `get_onsite_calendar_feed`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `token` | `str` | Required |


### `GET` `/calendar/test`

* **Function Name**: `test_calendar`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*



---

## AI Integration

### `POST` `/ai/generate-draft`

* **Function Name**: `generate_draft`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `AIDraftResponse`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `AIDraftRequest` | Required |


### `POST` `/ai/generate-smart-clone`

* **Function Name**: `generate_smart_clone`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `ProjectSmartCloneExecuteRequest`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `ProjectSmartCloneRequest` | Required |


### `POST` `/ai/scan-receipt`

* **Function Name**: `scan_receipt`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `ReceiptScanResponse`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `ReceiptScanRequest` | Required |



---

## Paid Time Off (PTO)

### `POST` `/pto/banks`

* **Function Name**: `create_or_update_pto_bank`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `PTOBankOut`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `pto_bank` | `PTOBankCreate` | Required |


### `GET` `/pto/ledger`

* **Function Name**: `get_pto_ledger`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `PTOLedgerReport`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `year` | `int` | 2026 |


### `GET` `/pto/my-balance`

* **Function Name**: `get_my_pto_balance`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `year` | `int` | 2026 |


### `GET` `/pto/requests`

* **Function Name**: `get_pto_requests`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[PTORequestOut]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `user_id` | `Optional[int]` | None |
| `status` | `Optional[str]` | None |
| `year` | `Optional[int]` | None |


### `POST` `/pto/requests`

* **Function Name**: `create_pto_request`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `PTORequestOut`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `PTORequestCreate` | Required |


### `PUT` `/pto/requests/{request_id}/status`

* **Function Name**: `update_pto_request_status`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `PTORequestOut`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request_id` | `int` | Required |
| `status_update` | `PTORequestUpdateStatus` | Required |



---

## Direct Messages

### `GET` `/messages/`

* **Function Name**: `get_my_messages`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[DirectMessageOut]`

*No request body or query parameters required.*


### `POST` `/messages/`

* **Function Name**: `send_message`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `DirectMessageOut`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `msg` | `DirectMessageCreate` | Required |


### `POST` `/messages/{msg_id}/read`

* **Function Name**: `mark_message_read`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `DirectMessageOut`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `msg_id` | `int` | Required |



---

## Action Items

No endpoints registered in this category.

---

## System & Integrations

### `GET` `/`

* **Function Name**: `read_root`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/emails/logs`

* **Function Name**: `list_email_logs`
* **Authentication Level**: **Public**
* **Response Model**: `List[EmailLog]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |
| `entity_type` | `Optional[str]` | None |
| `entity_id` | `Optional[int]` | None |


### `GET` `/emails/logs/download`

* **Function Name**: `download_email_logs`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `entity_type` | `Optional[str]` | None |
| `entity_id` | `Optional[int]` | None |


### `GET` `/leads/`

* **Function Name**: `read_leads`
* **Authentication Level**: **Public**
* **Response Model**: `List[LeadListOut]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `POST` `/leads/`

* **Function Name**: `create_lead`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Lead`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `lead` | `LeadCreate` | Required |
| `background_tasks` | `fastapi.background.BackgroundTasks` | Required |


### `PUT` `/leads/bulk`

* **Function Name**: `update_leads_bulk`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[Lead]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `leads` | `List[LeadBulkUpdate]` | Required |


### `DELETE` `/leads/{lead_id}`

* **Function Name**: `delete_lead`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `lead_id` | `int` | Required |


### `PUT` `/leads/{lead_id}`

* **Function Name**: `update_lead`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Lead`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `lead_id` | `int` | Required |
| `lead` | `LeadCreate` | Required |
| `background_tasks` | `fastapi.background.BackgroundTasks` | Required |


### `POST` `/leads/{lead_id}/clone`

* **Function Name**: `clone_lead`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Lead`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `lead_id` | `int` | Required |


### `POST` `/leads/{lead_id}/convert-to-milestone`

* **Function Name**: `convert_lead_to_milestone_endpoint`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `Milestone`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `lead_id` | `int` | Required |
| `request` | `LeadToMilestoneConversionRequest` | Required |


### `GET` `/notifications/`

* **Function Name**: `get_user_notifications`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[Notification]`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 5000 |


### `POST` `/notifications/{notification_id}/read`

* **Function Name**: `mark_notification_read`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `notification_id` | `int` | Required |


### `GET` `/reports/event-analysis`

* **Function Name**: `get_event_analysis_report`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `EventAnalysisReport`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |
| `user_id` | `Optional[int]` | None |
| `task_type` | `Optional[str]` | None |


### `GET` `/reports/event-analysis/pdf`

* **Function Name**: `get_event_analysis_pdf`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |
| `user_id` | `Optional[int]` | None |
| `task_type` | `Optional[str]` | None |


### `GET` `/reports/financial`

* **Function Name**: `report_financial`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/reports/leads`

* **Function Name**: `report_leads`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/reports/pto-audit/`

* **Function Name**: `get_pto_audit_report`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `List[PTOAuditReportItem]`

*No request body or query parameters required.*


### `GET` `/reports/task-analysis`

* **Function Name**: `get_task_analysis_report`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `TaskAnalysisReport`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |
| `user_id` | `Optional[int]` | None |
| `task_type` | `Optional[str]` | None |


### `GET` `/reports/task-analysis/pdf`

* **Function Name**: `get_task_analysis_pdf`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `start_date` | `Optional[str]` | None |
| `end_date` | `Optional[str]` | None |
| `user_id` | `Optional[int]` | None |
| `task_type` | `Optional[str]` | None |


### `GET` `/search`

* **Function Name**: `perform_global_search`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `q` | `str` | Required |


### `POST` `/sync/task-events/`

* **Function Name**: `sync_offline_task_events`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `events` | `List[TaskEventCreate]` | Required |


### `GET` `/system/geocode`

* **Function Name**: `proxy_geocode`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `address` | `str` | Required |


### `GET` `/system/logs/email`

* **Function Name**: `read_email_logs`
* **Authentication Level**: **Authenticated User**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/system/state`

* **Function Name**: `get_system_state`
* **Authentication Level**: **Public**
* **Response Model**: `SystemState`

*No request body or query parameters required.*


### `PUT` `/system/state`

* **Function Name**: `update_system_state`
* **Authentication Level**: **Admin Only**
* **Response Model**: `SystemState`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `state_update` | `SystemStateUpdate` | Required |


### `GET` `/xero/api/bank-accounts`

* **Function Name**: `fetch_xero_bank_accounts`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `GET` `/xero/logs`

* **Function Name**: `get_xero_logs`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `skip` | `int` | 0 |
| `limit` | `int` | 500000 |


### `GET` `/xero/logs/download`

* **Function Name**: `download_xero_logs`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

*No request body or query parameters required.*


### `POST` `/xero/webhook`

* **Function Name**: `xero_webhook`
* **Authentication Level**: **Public**
* **Response Model**: `JSON`

**Request Parameters:**

| Parameter Name | Data Type | Default / Required |
| :--- | :--- | :--- |
| `request` | `starlette.requests.Request` | Required |

