from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import dependencies, schemas
from pydantic import BaseModel
from typing import Optional, Literal
import os
import json

from openai import OpenAI

router = APIRouter(prefix="/ai", tags=["AI"])

from . import dependencies, schemas, database

class AIDraftRequest(BaseModel):
    prompt: str
    target_type: Optional[Literal["Lead", "Project", "Invoice", "Task", "User"]] = None

class AIDraftResponse(BaseModel):
    intent: Literal["Lead", "Project", "Invoice", "Task", "User", "Unknown"]
    draft_data: dict
    display_names: dict = {}
    explanation: str

@router.post("/generate-draft", response_model=AIDraftResponse)
def generate_draft(request: AIDraftRequest, current_user = Depends(dependencies.get_current_active_user), db: Session = Depends(database.get_db)):
    from . import models
    api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(status_code=500, detail="AI_API_KEY or OPENAI_API_KEY is not configured on the server.")
        
    client = OpenAI(api_key=api_key)

    customers = db.query(models.Customer).all()
    locations = db.query(models.Location).all()
    users = db.query(models.User).all()

    context_str = f"Logged in User ID (Lead Creator / poc_id): {current_user.id}\n"
    context_str += "Database Customers available:\n" + ", ".join([f"ID: {c.id}, Name: {c.name}" for c in customers]) + "\n"
    context_str += "Database Locations available:\n" + ", ".join([f"ID: {l.id}, Name: {l.name}, CustomerID: {l.customer_id}" for l in locations]) + "\n"
    context_str += "Database Users/Contacts available:\n" + ", ".join([f"ID: {u.id}, Name: {u.username}, Email: {u.email}, CustomerID: {u.customer_id}" for u in users]) + "\n"

    system_prompt = f"""
    You are an intelligent assistant for a project management and invoicing application.
    Your job is to parse the user's natural language request and draft a JSON payload for one of the following entities:
    Lead, Project, Invoice, Task, or User.
    
    If the user's intent is ambiguous, guess the most likely entity.
    
    You have access to the following current database context to map names to IDs:
    {context_str}
    
    Required formatting:
    Respond STRICTLY in the following JSON format without Markdown blocks or additional text:
    {{
      "intent": "Lead" | "Project" | "Invoice" | "Task" | "User" | "Unknown",
      "draft_data": {{ 
          <include relevant fields guessed from the prompt based on the schema. MUST use exactly the schema keys. If 'User' ALWAYS invent a 12 char password.>
      }},
      "display_names": {{
          <for any ID integer fields like customer_id, location_id, etc. place their human-readable string names here so the UI can display them to the user> 
      }},
      "explanation": "A short 1-sentence explanation of what you drafted."
    }}
    
    Schemas:
    - Lead: name(str: MUST be the name of the project/opportunity, NEVER a person's name), email(str), company(str), description(str), estimated_value(float), customer_contract(str), customer_id(int), location_id(int), customer_contact_id(int), poc_id(int), due_date(YYYY-MM-DD), project_type(str: must be one of ['Preset Controller', 'Additive System', 'Blending System', 'PLC System', 'Automation System', 'Visualization System', 'Design', 'Hardware', 'Programming', 'Project Management', 'Field Services', 'Small Project', 'Engineering', 'Consulting', 'Other'])
    - Project: name(str), description(str), start_date(YYYY-MM-DD), target_end_date(YYYY-MM-DD), budget(float), status(str)="Pending", priority(int)=1
    - Invoice: customer_id(int), issue_date(str), due_date(str), total_amount(float), amount_due(float), status(str)="Draft", notes(str)
    - Task: description(str), budget_hours(float), priority(str)="Medium", status(str)="Pending", assigned_to_id(int)
    - User: username(str), first_name(str), last_name(str), email(str), password(str: generate a strong 12 char default), role(str: "user", "admin", or "pm"), is_employee(bool), title(str), department(str)
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User prompt: {request.prompt}\n\nTarget Hint: {request.target_type or 'Any'}"}
            ],
            temperature=0.2
        )
        
        content = response.choices[0].message.content
        parsed = json.loads(content)
        print("======== AI GENERATED PAYLOAD ========")
        print(json.dumps(parsed, indent=2))
        print("======================================")
        
        return AIDraftResponse(
            intent=parsed.get("intent", "Unknown"),
            draft_data=parsed.get("draft_data", {}),
            display_names=parsed.get("display_names", {}),
            explanation=parsed.get("explanation", "Draft generated.")
        )
    except Exception as e:
        print(f"CRITICAL AI ROUTER EXCEPTION: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"LLM Generation failed: {str(e)}")

@router.post("/generate-smart-clone", response_model=schemas.ProjectSmartCloneExecuteRequest)
def generate_smart_clone(request: schemas.ProjectSmartCloneRequest, current_user = Depends(dependencies.get_current_active_user), db: Session = Depends(database.get_db)):
    from . import models, crud
    
    api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(status_code=500, detail="AI_API_KEY or OPENAI_API_KEY is not configured.")
        
    client = OpenAI(api_key=api_key)
    
    lead = db.query(models.Lead).filter(models.Lead.id == request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    template_project = crud.get_project(db, request.template_project_id)
    if not template_project:
        raise HTTPException(status_code=404, detail="Template Project not found")
        
    # Serialize template project for the AI and sort milestones to maintain absolute order
    template_data = {
        "budget": template_project.budget,
        "milestones": []
    }
    ordered_milestones = sorted(template_project.milestones, key=lambda m: m.milestone_number or 0)
    
    for m in ordered_milestones:
        m_dict = {
            "name": m.name,
            "cost": m.cost,
            "description": m.description,
            "milestone_number": m.milestone_number,
            "owner_id": m.owner_id,
            "due_date": m.due_date.strftime('%Y-%m-%d') if m.due_date else None,
            "tasks": []
        }
        for t in m.tasks:
            m_dict["tasks"].append({
                "description": t.description,
                "estimated_effort": t.estimated_effort,
                "task_type": t.task_type.value if hasattr(t.task_type, 'value') else str(t.task_type),
                "assigned_to_id": t.assigned_to_id
            })
        template_data["milestones"].append(m_dict)

    system_prompt = f"""
    You are an expert project manager. You are tasked with cloning a Template Project, but customizing it entirely for a new Lead.
    
    Lead Data:
    - Name: {lead.name}
    - Description: {lead.description or "N/A"}
    - Budget / Estimated Value: {lead.estimated_value or 0}
    - Due Date: {lead.due_date.strftime('%Y-%m-%d') if lead.due_date else "N/A"}
    
    Template Data (JSON):
    {json.dumps(template_data)}
    
    INSTRUCTIONS:
    Draft a fully detailed JSON payload representing the final cloned project.
    1. Distribute the Lead's Budget proportionally across the milestones based on the Template's cost ratios. Make sure the sum of milestone costs perfectly equals the Lead Budget.
    2. Adjust names/descriptions of milestones/tasks if the Lead description implies a specific context.
    3. Keep existing `assigned_to_id` values exactly as they are in the Template for tasks.
    4. Generate `temp_id` values (e.g. "m1", "t1") for each milestone and task so they can be identified.
    5. Set `due_date` at the Project level to match the Lead. You MUST actively schedule the task `start_date` and `due_date` spreading the calendar linearly from today to the lead due date.
    6. CRITICAL: You MUST process the Milestones in the exact array order they are provided! Do not sort them alphabetically or otherwise. 
    7. CRITICAL: For every Milestone, you MUST perfectly reflect its original `milestone_number`, `owner_id`, and `due_date` in the JSON response payload. Do not erase them.
    
    REQUIRED JSON FORMAT:
    Matches exactly `schemas.ProjectSmartCloneExecuteRequest`. No markdown.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate the deeply nested clone payload."}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        # Inject standard static DB fields the AI might have missed
        parsed["lead_id"] = lead.id
        parsed["customer_id"] = lead.customer_id
        parsed["location_id"] = lead.location_id
        parsed["project_type"] = lead.project_type.value if hasattr(lead.project_type, 'value') else str(lead.project_type)
        if not parsed.get("name"):
            parsed["name"] = lead.name
            
        print("======== AI SMART CLONE GENERATED ========")
        print(json.dumps(parsed, indent=2))
        return parsed
        
    except Exception as e:
        print(f"CRITICAL AI SMART CLONE EXCEPTION: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"LLM Generation failed: {str(e)}")

class ReceiptScanRequest(BaseModel):
    image_base64: str

class ReceiptScanResponse(BaseModel):
    merchant_name: Optional[str] = None
    amount: Optional[float] = None
    date_time: Optional[str] = None
    expense_type: Optional[str] = None
    confidence: Optional[float] = None
    explanation: str

@router.post("/scan-receipt", response_model=ReceiptScanResponse)
def scan_receipt(request: ReceiptScanRequest, current_user = Depends(dependencies.get_current_active_user)):
    api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(status_code=500, detail="AI/OpenAI API key not configured.")
        
    client = OpenAI(api_key=api_key)
    
    base64_img = request.image_base64
    if "," in base64_img:
        base64_img = base64_img.split(",")[1]
        
    system_prompt = """
    You are an expert accounting AI. Your job is to extract data from a receipt image.
    Analyze the uploaded image and extract the following strictly in pure JSON format:
    {
      "merchant_name": "Name of the store or vendor (null if unreadable)",
      "amount": 12.34, 
      "date_time": "YYYY-MM-DD", 
      "expense_type": "Hardware" | "T&E" | "Meal" | "Parking" | "Hotel" | "Flight" | "Car Rental" | "Shipping" | "Software" | "Contractor" | "Tools",
      "confidence": 0.95,
      "explanation": "Brief string detailing what you read."
    }
    Note: amount must be a numeric float. Do not include currency symbols.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}
                        }
                    ]
                }
            ],
            temperature=0.0
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        return ReceiptScanResponse(
            merchant_name=parsed.get("merchant_name"),
            amount=parsed.get("amount") if isinstance(parsed.get("amount"), (int, float)) else None,
            date_time=parsed.get("date_time"),
            expense_type=parsed.get("expense_type"),
            confidence=parsed.get("confidence"),
            explanation=parsed.get("explanation", "Extracted details.")
        )
    except Exception as e:
        print(f"CRITICAL AI RECEIPT SCAN EXCEPTION: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"LLM Receipt Vision scan failed: {str(e)}")
