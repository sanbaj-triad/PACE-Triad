def update_milestone(db: Session, milestone_id: int, update_data: schemas.MilestoneUpdate, current_user: models.User):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        return None
    data = update_data.model_dump(exclude_unset=True)
    
    if milestone.invoice_id:
        blocked_fields = ['cost', 'name', 'due_date', 'description']
        for field in blocked_fields:
            if field in data and data[field] != getattr(milestone, field):
                raise ValueError(f"Cannot edit {field} of invoiced milestone. Remove from invoice first.")

    for key, value in data.items():
        setattr(milestone, key, value)
    
    if current_user:
        milestone.updated_by_id = current_user.id
        milestone.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(milestone)
    return milestone
