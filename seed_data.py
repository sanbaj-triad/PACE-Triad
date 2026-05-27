
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app import models, auth

def seed_data():
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Starting seed...")
        
        # 1. Users
        print("Seeding Users...")
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            hashed_pw = auth.get_password_hash("admin")
            admin = models.User(
                username="admin", 
                email="admin@example.com", 
                hashed_password=hashed_pw, 
                role="admin",
                first_name="Super",
                last_name="Admin",
                title="Administrator",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        pm_user = db.query(models.User).filter(models.User.username == "pm_user").first()
        if not pm_user:
            hashed_pw = auth.get_password_hash("password")
            pm_user = models.User(
                username="pm_user", 
                email="pm@example.com", 
                hashed_password=hashed_pw, 
                role="user",
                first_name="Jane",
                last_name="Manager",
                title="Project Manager",
                is_active=True,
                created_by_id=admin.id,
                updated_by_id=admin.id
            )
            db.add(pm_user)
            db.commit()
            db.refresh(pm_user)

        # 2. Customers
        print("Seeding Customers...")
        customers = []
        for i in range(1, 4):
            cust = db.query(models.Customer).filter(models.Customer.name == f"Customer {i}").first()
            if not cust:
                cust = models.Customer(
                    name=f"Customer {i}", 
                    email=f"contact{i}@customer.com",
                    created_by_id=admin.id,
                    updated_by_id=admin.id
                )
                db.add(cust)
                db.commit()
                db.refresh(cust)
            customers.append(cust)

        # 3. Leads
        print("Seeding Leads...")
        leads = []
        for i in range(1, 6):
            lead = models.Lead(
                name=f"Potential Project {i}",
                email=f"lead{i}@prospect.com",
                status=random.choice(list(models.LeadStatus)),
                estimated_value=random.randint(5000, 50000),
                created_by_id=pm_user.id,
                updated_by_id=pm_user.id,
                customer_id=random.choice(customers).id if customers else None
            )
            db.add(lead)
            leads.append(lead)
        db.commit()
        
        # 4. Projects
        print("Seeding Projects...")
        for i in range(1, 4):
            project = models.Project(
                name=f"Project Alpha {i}",
                project_unique_id=f"PROJ-000{i}",
                description="A sample project focusing on automation.",
                budget=random.randint(10000, 100000),
                status=random.choice(list(models.ProjectStatus)),
                due_date=datetime.utcnow() + timedelta(days=random.randint(30, 90)),
                customer_id=customers[0].id if customers else None,
                lead_id=leads[0].id if leads else None,
                pm_id=pm_user.id,
                created_by_id=admin.id,
                updated_by_id=pm_user.id
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            
            # 5. Milestones
            print(f"  Seeding Milestones for {project.name}...")
            for m in range(1, 4):
                milestone = models.Milestone(
                    name=f"Milestone {m}",
                    description=f"Deliverable for phase {m}",
                    due_date=datetime.utcnow() + timedelta(days=m*10),
                    cost=5000.0 * m,
                    progress=random.randint(0, 100),
                    is_completed=random.choice([True, False]),
                    project_id=project.id,
                    milestone_number=m,
                    created_by_id=pm_user.id,
                    updated_by_id=pm_user.id
                )
                db.add(milestone)
            db.commit()

        print("Seed completed successfully!")
        
    except Exception as e:
        print("Seed Error:", e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
