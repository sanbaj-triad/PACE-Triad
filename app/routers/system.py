from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, auth, dependencies
from ..database import SessionLocal

router = APIRouter(
    prefix="/system",
    tags=["System"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_admin_user(current_user: models.User = Depends(dependencies.get_current_active_user)):
    if current_user.role != "admin" and not current_user.has_financial_access:
        raise HTTPException(status_code=403, detail="Not authorized. Admins only.")
    return current_user

def init_system_state_if_missing(db: Session):
    state = db.query(models.SystemState).first()
    if not state:
        state = models.SystemState(
            announcement_message="Welcome to PACE. No scheduled maintenance at this time.",
            is_announcement_active=False,
            app_version="1.0.0"
        )
        db.add(state)
        db.commit()
        db.refresh(state)
    return state

@router.get("/state", response_model=schemas.SystemState)
def get_system_state(db: Session = Depends(get_db)):
    # This endpoint is technically open logic to any authenticated system check, 
    # but we protect it if required. Since React boots this before auth strictly, 
    # we can leave it entirely public or auth-gated.
    # Leaving it public so the login screen can potentially pull Version numbers in the future.
    return init_system_state_if_missing(db)

@router.put("/state", response_model=schemas.SystemState)
def update_system_state(
    state_update: schemas.SystemStateUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    state = init_system_state_if_missing(db)
    
    if state_update.announcement_message is not None:
        state.announcement_message = state_update.announcement_message
    if state_update.is_announcement_active is not None:
        state.is_announcement_active = state_update.is_announcement_active
    if state_update.app_version is not None:
        state.app_version = state_update.app_version
        
    db.commit()
    db.refresh(state)
    return state
