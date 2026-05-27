from app import models, database, schemas, crud
from sqlalchemy.orm import joinedload
from datetime import datetime

db = database.SessionLocal()

try:
    print("--- VERIFYING LEAD -> PROJECT LINK ---")
    
    # 1. Create a Test Lead
    print("1. Creating Test Lead...")
    lead_data = schemas.LeadCreate(
        name="Test Lead Link Verify",
        status="new"
    )
    # Mock current user
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin:
        print("SKIP: No admin user found for test.")
        exit()
        
    lead = crud.create_lead(db, lead_data, admin)
    print(f"   Created Lead ID: {lead.id}")
    
    # 2. Convert to Project (Manual simulation of logic)
    print("2. Converting to Project...")
    proj_data = schemas.ProjectCreate(
        name=f"Project for {lead.name}",
        customer_id=1, # Assume customer 1 exists
        lead_id=lead.id,
        project_unique_id=f"TEST-{lead.id}"
    )
    project = crud.create_project(db, proj_data, admin)
    
    # Update Lead status & link
    lead.status = models.LeadStatus.CONVERTED
    # crud.create_project sets lead_id on project, but we rely on relationship loading
    db.commit()
    print(f"   Created Project ID: {project.id} linked to Lead {lead.id}")
    
    # 3. Fetch Lead (Simulate API Read)
    print("3. Fetching Lead via CRUD (with eager load)...")
    db.refresh(lead) # Clear session cache to force reload
    
    # Use logic from crud.get_leads (explicit joinedload)
    fetched_lead = db.query(models.Lead).options(
        joinedload(models.Lead.project)
    ).filter(models.Lead.id == lead.id).first()
    
    print(f"   Fetched Lead: {fetched_lead.name}, Status: {fetched_lead.status}")
    print(f"   ORM Project: {fetched_lead.project}")
    
    if fetched_lead.project:
        print(f"   SUCCESS: ORM Link found. Project Name: {fetched_lead.project.name}")
        
        # 4. Pydantic Validation
        print("4. Validating with Pydantic Schema...")
        pydantic_lead = schemas.Lead.from_orm(fetched_lead)
        print(f"   Pydantic Project: {pydantic_lead.project}")
        
        if pydantic_lead.project and pydantic_lead.project.id == project.id:
             print("   SUCCESS: Pydantic Validation passed. Link is intact.")
        else:
             print("   FAILURE: Pydantic Validation lost the project link.")
    else:
        print("   FAILURE: ORM Link missing.")

    # Cleanup
    print("5. Cleaning up...")
    crud.delete_project(db, project.id) 
    # delete_project should revert lead to QUALIFIED
    db.refresh(fetched_lead)
    print(f"   Lead Status after Project Delete: {fetched_lead.status} (Expected: qualified)")
    crud.delete_lead(db, lead.id)
    print("   Cleanup complete.")

except Exception as e:
    print(f"CRITICAL FAILURE: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
