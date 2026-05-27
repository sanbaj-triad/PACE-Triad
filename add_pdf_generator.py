# Replace pdf_generator.py with appended function
import os

with open("app/pdf_generator.py", "a") as f:
    f.write('''
def generate_project_report_pdf(project):
    """Generates a comprehensive PDF report for a project including milestones, tasks, and invoices."""
    issue_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Calculate Summaries
    total_budget = project.budget or 0
    total_planned = project.current_value or 0
    total_billed = project.total_billed or 0
    remaining = total_planned - total_billed
    
    # Customer and Lead info
    customer_name = project.customer.name if project.customer else (project.lead.company if project.lead else 'Unknown')
    customer_contact = project.customer.email if project.customer else (project.lead.email if project.lead else '-')
    
    html_content = f"""
    <html>
    <head>
        <style>
            @page {{ size: letter; margin: 0.5in; }}
            body {{ font-family: Helvetica, sans-serif; font-size: 11px; color: #333; line-height: 1.4; }}
            
            .header {{ margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
            .title {{ font-size: 24px; font-weight: bold; color: #2c3e50; float: left; }}
            
            .section-title {{ font-size: 14px; font-weight: bold; color: #fff; background-color: #2980b9; padding: 4px 8px; margin-top: 20px; margin-bottom: 10px; }}
            
            .info-grid {{ width: 100%; margin-bottom: 15px; }}
            .info-col {{ width: 48%; vertical-align: top; }}
            
            .kv-table {{ width: 100%; border-collapse: collapse; }}
            .kv-key {{ width: 100px; color: #7f8c8d; font-weight: bold; padding: 3px 0; vertical-align: top; }}
            .kv-value {{ padding: 3px 0; vertical-align: top; }}
            
            .data-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }}
            .data-table th {{ background-color: #f8f9fa; color: #2c3e50; font-weight: bold; text-align: left; padding: 6px 4px; border-bottom: 2px solid #ddd; }}
            .data-table td {{ padding: 6px 4px; border-bottom: 1px solid #eee; vertical-align: top; }}
            
            .amount {{ text-align: right; white-space: nowrap; }}
            .center {{ text-align: center; }}
            
            .financial-summary {{ margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #ddd; }}
        </style>
    </head>
    <body>
        <table style="width: 100%; border-bottom: 2px solid #eee; margin-bottom: 15px; padding-bottom: 10px;">
            <tr>
                <td style="vertical-align: top;">
                     <div class="title" style="margin-top: 0px;">PROJECT STATUS REPORT</div>
                     <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">{{project.name}}</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <img src="c:/Apps/python/Invoice_Project_Lead/app/static/logo.png" style="height: 50px;" />
                    <div style="font-size: 10px; color: #7f8c8d; margin-top: 5px;">Generated: {{issue_date}}</div>
                </td>
            </tr>
        </table>

        <!-- Overview Section -->
        <div class="section-title">PROJECT OVERVIEW</div>
        <table class="info-grid">
            <tr>
                <td class="info-col">
                    <table class="kv-table">
                        <tr><td class="kv-key">Status:</td><td class="kv-value" style="text-transform: capitalize;"><strong>{{project.status}}</strong></td></tr>
                        <tr><td class="kv-key">Client:</td><td class="kv-value">{{customer_name}}</td></tr>
                        <tr><td class="kv-key">Contact:</td><td class="kv-value">{{customer_contact}}</td></tr>
                        <tr><td class="kv-key">Project Manager:</td><td class="kv-value">{{project.pm_user.username if project.pm_user else '-'}}</td></tr>
                    </table>
                </td>
                <td style="width: 4%;"></td>
                <td class="info-col">
                    <table class="kv-table">
                        <tr><td class="kv-key">Start Date:</td><td class="kv-value">{{project.created_at.strftime("%Y-%m-%d") if project.created_at else '-'}}</td></tr>
                        <tr><td class="kv-key">Target End:</td><td class="kv-value">{{project.due_date.strftime("%Y-%m-%d") if project.due_date else 'TBD'}}</td></tr>
                        <tr><td class="kv-key">PO Number:</td><td class="kv-value">{{project.customer_po or '-'}}</td></tr>
                        <tr><td class="kv-key">Progress:</td><td class="kv-value">{{project.financial_progress or 0}}%</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <div class="section-title">FINANCIAL SUMMARY</div>
        <table class="data-table">
            <tr>
                <th>Estimated Budget</th>
                <th>Planned Value (Actual)</th>
                <th>Total Billed</th>
                <th>Remaining unbilled</th>
            </tr>
            <tr>
                <td>${{total_budget:,.2f}}</td>
                <td>${{total_planned:,.2f}}</td>
                <td style="color: #27ae60;">${{total_billed:,.2f}}</td>
                <td style="color: {{'#c0392b' if remaining < 0 else '#333'}};">${{remaining:,.2f}}</td>
            </tr>
        </table>
        
        <!-- Milestones & Tasks -->
        <div class="section-title">MILESTONES & TASKS</div>
        """
        
    if not project.milestones:
        html_content += "<p style='color: #7f8c8d; font-style: italic;'>No milestones defined for this project.</p>"
    else:
        for m in sorted(project.milestones, key=lambda x: str(x.milestone_number)):
            m_status = "Billed" if m.invoice_id else ("Completed" if m.is_completed else "In Progress")
            html_content += f"""
            <div style="background-color: #f1f2f6; padding: 6px; margin-top: 15px; border-left: 3px solid #2980b9; font-weight: bold; font-size: 12px;">
                Milestone #{m.milestone_number}: {m.name} 
                <span style="float: right; font-weight: normal; color: #555;">Status: {m_status} | Progress: {m.progress or 0}% | Value: ${m.cost:,.2f}</span>
            </div>
            """
            
            if not m.tasks:
                html_content += "<p style='margin-left: 10px; font-size: 9px; color: #999;'>No tasks assigned to this milestone.</p>"
            else:
                html_content += """
                <table class="data-table" style="margin-top: 0px; margin-left: 10px; width: 98%;">
                    <tr>
                        <th style="width: 40%">Task Description</th>
                        <th style="width: 15%">Assigned To</th>
                        <th style="width: 15%">Status</th>
                        <th style="width: 15%" class="center">Progress</th>
                        <th style="width: 15%" class="center">Hours (Act/Est)</th>
                    </tr>
                """
                for t in m.tasks:
                    assigned = t.assigned_to.username if t.assigned_to else 'Unassigned'
                    hrs_spent = t.total_hours_spent or 0
                    hrs_est = t.estimated_effort or 0
                    html_content += f"""
                    <tr>
                        <td>{t.description}</td>
                        <td>{assigned}</td>
                        <td>{t.status}</td>
                        <td class="center">{t.progress or 0}%</td>
                        <td class="center">{hrs_spent} / {hrs_est if hrs_est > 0 else '?'}</td>
                    </tr>
                    """
                html_content += "</table>"
                
    # Invoices
    html_content += """
        <div class="section-title">INVOICES ISSUED</div>
    """
    if not project.invoices:
        html_content += "<p style='color: #7f8c8d; font-style: italic;'>No invoices issued for this project.</p>"
    else:
        html_content += """
        <table class="data-table">
            <tr>
                <th>Invoice #</th>
                <th>Issue Date</th>
                <th>Status</th>
                <th class="amount">Amount</th>
            </tr>
        """
        for inv in sorted(project.invoices, key=lambda x: str(x.issue_date), reverse=True):
            issue_d = inv.issue_date.strftime("%Y-%m-%d") if inv.issue_date else "-"
            # sum up lines
            inv_total = sum(li.amount for li in inv.items) if inv.items else 0
            # note status is enum
            status_str = inv.status.value if hasattr(inv.status, 'value') else str(inv.status).replace('InvoiceStatus.', '')
            html_content += f"""
            <tr>
                <td>{inv.invoice_number}</td>
                <td>{issue_d}</td>
                <td><strong style="text-transform: capitalize;">{status_str}</strong></td>
                <td class="amount">${inv_total:,.2f}</td>
            </tr>
            """
        html_content += "</table>"

    html_content += """
    </body>
    </html>
    """
    
    return html_content
''')

print("Applied generate_project_report_pdf successfully")
