import os

docs = {
    '01_Creating_a_Project.md': '''# Training Module 1: Creating a Project

## Overview
This module covers how to create a new project in the PACE application. Projects are the central hub for tracking time, expenses, tasks, and milestones.

## Step-by-Step Guide
1. **Navigate to the Dashboard:** Log into the PACE application using your credentials.
2. **Access the Projects List:** In the left-hand sidebar navigation, click on **Projects**.
3. **Initiate Creation:** In the top-right corner of the Project List view, click the green **+ New Project** button.
4. **Fill out the Project Details:**
   - **Project Name:** Enter a descriptive name for the project.
   - **Customer:** Select the relevant customer from the dropdown. *If the customer does not exist, they must be created in the Customers tab first.*
   - **PO #:** Enter the Customer Purchase Order number if applicable.
   - **Location:** Select the project location (this list filters based on the selected customer).
   - **Internal PM:** Assign the project to an internal Project Manager.
   - **Project Type:** Select the category that best fits the work (e.g., Automation System, Consulting).
5. **Save:** Click the **Create** or **Save** button at the bottom of the form.
6. **Confirmation:** You will be automatically redirected to the detailed view of your newly created project.

*(Insert your screen recording video here)*
''',

    '02_Managing_Milestones.md': '''# Training Module 2: Managing Milestones

## Overview
Milestones break a project down into distinct, billable or trackable phases.

## Step-by-Step Guide
1. **Open a Project:** Navigate to the **Projects** list and click on an active project to open its detailed view.
2. **Locate the Milestones Section:** Scroll down or click the **Milestones** tab within the project detail page.
3. **Add a Milestone:** Click **+ Add Milestone**.
4. **Enter Milestone Details:**
   - **Name:** Enter the name of the phase (e.g., "Hardware Design").
   - **Lead:** Assign a lead (if applicable).
   - **Budget:** Allocate a portion of the project's total budget to this specific milestone.
   - **Start & End Dates:** Set the projected timeline.
5. **Save Milestone:** Click **Save**.
6. **Updating Progress:** To update the progress of an existing milestone, click the edit icon (pencil) next to it, adjust the **Progress %** slider or input, and save.

*(Insert your screen recording video here)*
''',

    '03_Project_Gantt_Chart.md': '''# Training Module 3: Project Gantt Chart

## Overview
The interactive Gantt chart provides a visual timeline of all project milestones and tasks, allowing for easy schedule adjustments.

## Step-by-Step Guide
1. **Access the Gantt Chart:** From the main dashboard, click on **Gantt** in the sidebar. Alternatively, view a specific project's Gantt chart from its detail page.
2. **Navigating the Timeline:** Use the scrollbar at the bottom to move left or right through time. You can zoom in/out using the controls in the top right.
3. **Editing Dates:** 
   - Hover over a task or milestone bar.
   - Click and drag the **center** of the bar to move the entire schedule forward or backward.
   - Click and drag the **left or right edges** of the bar to extend or shorten the duration.
4. **Dependencies:** Click the connector circles at the end of one task and drag to the start of another to create a dependency.
5. **Saving:** The Gantt chart automatically saves your changes. If validation fails (e.g., moving a task outside project boundaries), it will snap back and display a warning.

*(Insert your screen recording video here)*
''',

    '04_Task_Management.md': '''# Training Module 4: Task Management

## Overview
Tasks are the granular action items assigned to team members. They roll up into Milestones.

## Step-by-Step Guide
1. **Navigate to Tasks:** Click on **Tasks** in the sidebar to see the global task list, or go to a Project -> Milestone and add a task directly there.
2. **Create a Task:** Click **+ New Task**.
3. **Fill Task Details:**
   - **Title & Description:** Clearly describe what needs to be done.
   - **Assignee:** Select the team member responsible for the work.
   - **Project & Milestone:** Link the task to the appropriate project and milestone.
   - **Priority:** Set the priority (Low, Medium, High, Urgent).
   - **Estimated Hours:** Input the expected time to complete.
4. **Update Status:** As work progresses, the assignee can drag and drop the task on the **Kanban Board** (if viewing the board layout) or edit the task to change its status from *Pending* -> *In Progress* -> *Completed*.

*(Insert your screen recording video here)*
''',

    '05_Timesheets_and_Resource_Mapping.md': '''# Training Module 5: Timesheets & Resource Mapping

## Overview
Learn how to log time against tasks and view team resource allocation.

## Step-by-Step Guide (Timesheets)
1. **Clocking In:** On the mobile app or web dashboard, locate the active task you are working on.
2. **Start Timer:** Click **Start** or **Clock In**. The system will begin tracking time against that task.
3. **Manual Entry:** If you forgot to clock in, navigate to **Timesheets** in the sidebar. Click **+ Log Time**, select the task, and enter the hours worked manually.
4. **GPS Tracking (Mobile):** If using the mobile app, ensure location permissions are granted so the system can log the site location.

## Step-by-Step Guide (Resource Mapping)
1. **View Allocation:** Click on **Resource Map** or **Team Workload** in the sidebar.
2. **Analyze Load:** The view shows a calendar grid with each employee's assigned tasks. Red blocks indicate over-allocation (>8 hours/day).
3. **Reassign:** Drag and drop a task from an over-allocated team member to someone with available capacity to balance the workload.

*(Insert your screen recording video here)*
''',

    '06_Expenses.md': '''# Training Module 6: Expenses

## Overview
How to log project-related expenses and upload receipts for reimbursement or billing.

## Step-by-Step Guide
1. **Navigate to Expenses:** Click **Expenses** in the sidebar.
2. **Log a New Expense:** Click **+ New Expense**.
3. **Fill Details:**
   - **Merchant & Amount:** Where the purchase was made and how much it cost.
   - **Project Link:** Tie the expense to a specific Project so it applies to the project budget.
   - **Category:** Select the expense type (Travel, Materials, Meals, etc.).
   - **Billable:** Check the "Billable" box if this expense should be passed on to the customer in the next invoice.
4. **Upload Receipt:** Drag and drop the receipt image or PDF into the attachment zone.
5. **Save:** Click **Submit Expense**. It will now await manager approval if required.

*(Insert your screen recording video here)*
''',

    '07_Invoicing_and_Payments.md': '''# Training Module 7: Invoicing & Payments

## Overview
Generating an invoice for completed milestones/expenses and recording customer payments.

## Step-by-Step Guide (Generating an Invoice)
1. **Navigate to Invoices:** Click **Invoices** in the sidebar.
2. **Create Invoice:** Click **+ Generate Invoice**.
3. **Select Project:** Choose the project you wish to bill. The system will automatically pull in any completed, unbilled Milestones and any unbilled, billable Expenses.
4. **Review Line Items:** Verify the amounts. You can manually adjust line items if a partial billing is required.
5. **Finalize:** Click **Create Invoice**. You can then download the PDF or sync it to your accounting software (e.g., Xero) using the sync button.

## Step-by-Step Guide (Recording Payments)
1. **Open the Invoice:** Click on the generated invoice to view its details.
2. **Record Payment:** Click the **Record Payment** button.
3. **Enter Details:** Input the payment amount, date received, and payment method (Check, ACH, etc.).
4. **Update Status:** Once the full amount is recorded, the invoice status will automatically change to **Paid**.

*(Insert your screen recording video here)*
'''
}

base_dir = r"c:\Apps\python\Invoice_Project_Lead\NotebookLM_Documentation\Training_Modules"
import os
if not os.path.exists(base_dir):
    os.makedirs(base_dir)

for filename, content in docs.items():
    with open(os.path.join(base_dir, filename), "w") as f:
        f.write(content)

print("Successfully created 7 training module documents.")
