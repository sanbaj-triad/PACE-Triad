import os
import json
from openai import OpenAI
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from . import models

def do_ai_search(db: Session, query: str, limit: int = 15):
    api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY"))
    if not api_key:
        from .crud import global_search
        return global_search(db, query, limit)
        
    client = OpenAI(api_key=api_key)
    
    system_prompt = """
    You are an intelligent search parser.
    The user has typed a natural language sentence into our application's search bar.
    Extract their intent into a strictly formatted JSON object:
    {
      "target_entity": "Project" | "Lead" | "Customer" | "Invoice" | "Task" | "Any",
      "keywords": ["search", "terms", "here", "without", "stop", "words"],
      "location": "location name if mentioned, otherwise purely empty string",
      "status": "status if mentioned (e.g. Pending, Completed), otherwise empty",
      "is_employee_mention": boolean (true if user mentions employee, manager, staff)
    }
    
    Rules:
    - Target Entity should be specific if they ask for "leads in..." or "projects for...". If ambiguous, output "Any".
    - Keywords must just contain the core subjects (e.g. "plc", "additive", "valve"). Drop pronouns and stop words like "find", "a", "with", "in", "the".
    - Location should be extracted if they explicitly mention a geographic place like "Chesapeake".
    - Respond ONLY with the raw JSON object, do NOT wrap it in ```json blocks.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Query: {query}"}
            ],
            temperature=0.1
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        target = parsed.get("target_entity", "Any")
        keywords = parsed.get("keywords", [])
        location = parsed.get("location", "")
        
        results = []
        
        # Build flexible keyword condition
        def build_kw_cond(cols):
            if not keywords:
                return True # no constraints
            # Any keyword matching any column
            return or_(*[c.ilike(f"%{kw}%") for kw in keywords for c in cols])
            
        # Projects
        if target in ["Project", "Any"]:
            q = db.query(models.Project)
            if keywords:
                q = q.filter(build_kw_cond([models.Project.name, models.Project.description]))
            if location:
                q = q.join(models.Location).filter(models.Location.name.ilike(f"%{location}%"))
            for p in q.limit(limit).all():
                results.append({"type": "✅ AI Filtered", "id": f"proj_{p.id}", "label": f"Project: {p.name}", "url": f"/portal/projects/{p.id}"})
                
        # Leads
        if target in ["Lead", "Any"]:
            q = db.query(models.Lead)
            if keywords:
                q = q.filter(build_kw_cond([models.Lead.name, models.Lead.company, models.Lead.description]))
            if location:
                q = q.join(models.Location).filter(models.Location.name.ilike(f"%{location}%"))
            for l in q.limit(limit).all():
                results.append({"type": "✅ AI Filtered", "id": f"lead_{l.id}", "label": f"Lead: {l.company} - {l.name}", "url": f"/portal/leads/edit/{l.id}"})
                
        # Customers (No locations typically mapped inversely this easily, so ignore location for customer root)
        if target in ["Customer", "Any"]:
            q = db.query(models.Customer)
            if keywords:
                q = q.filter(build_kw_cond([models.Customer.name]))
            for c in q.limit(limit).all():
                results.append({"type": "✅ AI Filtered", "id": f"cust_{c.id}", "label": f"Customer: {c.name}", "url": f"/portal/customers/edit/{c.id}"})
                
        # Tasks
        if target in ["Task", "Any"]:
            q = db.query(models.Task)
            if keywords:
                q = q.filter(build_kw_cond([models.Task.description]))
            # Notice we ignore location for tasks as it requires deep joins not typical for a quick query
            for t in q.limit(limit).all():
                results.append({"type": "✅ AI Filtered", "id": f"task_{t.id}", "label": f"Task: {t.description[:40]}...", "url": f"/portal/tasks/edit/{t.id}"})

        # Provide a fallback if AI finds literally nothing but the parse succeeded
        if not results:
            results.append({"type": "⚠️ AI Notice", "id": "none", "label": "No records matched your specific intent.", "url": "#"})
            
        return results

    except Exception as e:
        print(f"AI Search Error: {e}")
        from .crud import global_search
        return global_search(db, query, limit)
