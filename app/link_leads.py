import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Project, Lead, Customer
import difflib

def get_similarity(a, b):
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, str(a).lower(), str(b).lower()).ratio()

def link_leads(auto_link_threshold=0.85):
    db: Session = SessionLocal()
    try:
        # Get all projects that don't have a lead_id
        unlinked_projects = db.query(Project).filter(Project.lead_id == None).all()
        print(f"Found {len(unlinked_projects)} unlinked projects.")
        
        # Get all leads
        leads = db.query(Lead).all()
        
        for project in unlinked_projects:
            customer_name = ""
            if project.customer:
                customer_name = project.customer.name
            else:
                # no customer to match against, continue
                continue
                
            best_match = None
            best_score = 0.0
            
            for lead in leads:
                # Try to match lead's company or name
                score_company = get_similarity(customer_name, lead.company)
                score_name = get_similarity(customer_name, lead.name)
                
                score = max(score_company, score_name)
                
                if score > best_score:
                    best_score = score
                    best_match = lead
            
            if best_match and best_score >= auto_link_threshold:
                print(f"Linking Project '{project.name}' (Customer: {customer_name}) to Lead '{best_match.company or best_match.name}' (Score: {best_score:.2f})")
                project.lead_id = best_match.id
                
                # Also link milestones
                for ms in project.milestones:
                    if not ms.lead_id:
                        ms.lead_id = best_match.id
                        
            elif best_match and best_score >= 0.60:
                print(f"Potential Match found but below threshold: Project '{project.name}' (Customer: {customer_name}) <-> Lead '{best_match.company or best_match.name}' (Score: {best_score:.2f})")

        db.commit()
        print("Linking process finished.")
    except Exception as e:
        db.rollback()
        print(f"Error during lead linking: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    link_leads()
