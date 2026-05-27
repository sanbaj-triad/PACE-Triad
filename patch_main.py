import re

with open('app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'from google.cloud import storage' not in content:
    content = content.replace('import os', 'import os\nfrom google.cloud import storage\nfrom fastapi.responses import StreamingResponse\nimport io')

# 1. create_project_attachment
create_project_att_old = """async def create_project_attachment(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filename = f"po_att_{project_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = f"app/static/uploads/{filename}"
    
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)
        
    relative_path = f"/static/uploads/{filename}"
    
    attachment = models.ProjectAttachment(
        project_id=project_id,
        filename=file.filename,
        file_path=relative_path
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment"""

create_project_att_new = """async def create_project_attachment(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filename = f"po_att_{project_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    
    # Upload to GCS
    storage_client = storage.Client()
    bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(f"projects/{project_id}/{filename}")
    
    file.file.seek(0)
    blob.upload_from_file(file.file, content_type=file.content_type)
    
    attachment = models.ProjectAttachment(
        project_id=project_id,
        filename=file.filename,
        file_path=blob.name
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment"""

content = content.replace(create_project_att_old, create_project_att_new)

# 2. delete_project_attachment
delete_project_att_old = """def delete_project_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted"}"""

delete_project_att_new = """def delete_project_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    try:
        storage_client = storage.Client()
        bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(att.file_path)
        blob.delete()
    except Exception as e:
        print(f"Error deleting from GCS: {e}")
        
    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted"}"""

content = content.replace(delete_project_att_old, delete_project_att_new)

# 3. download_project_attachment
download_project_att_old = """def download_project_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    full_path = attachment.file_path
    if full_path.startswith('/'):
        full_path = "app" + full_path
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path=full_path, filename=attachment.filename)"""

download_project_att_new = """def download_project_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ProjectAttachment).filter(models.ProjectAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    try:
        storage_client = storage.Client()
        bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        
        file_bytes = blob.download_as_bytes()
        
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={attachment.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found on cloud storage: {str(e)}")"""

content = content.replace(download_project_att_old, download_project_att_new)

# 4. upload_expense_attachment
upload_expense_att_old = """async def upload_expense_attachment(expense_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    unique_filename = f"exp_{expense_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return crud.create_expense_attachment(db, expense_id=expense_id, filename=file.filename, file_path=file_path)"""

upload_expense_att_new = """async def upload_expense_attachment(expense_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    unique_filename = f"exp_{expense_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    
    # Upload to GCS
    storage_client = storage.Client()
    bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(f"expenses/{expense_id}/{unique_filename}")
    
    file.file.seek(0)
    blob.upload_from_file(file.file, content_type=file.content_type)
        
    return crud.create_expense_attachment(db, expense_id=expense_id, filename=file.filename, file_path=blob.name)"""

content = content.replace(upload_expense_att_old, upload_expense_att_new)

# 5. delete_expense_attachment
delete_expense_att_old = """def delete_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    expense = db.query(models.Expense).filter(models.Expense.id == attachment.expense_id).first()
    if expense and current_user.role not in ['admin', 'manager'] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    if os.path.exists(attachment.file_path):
        try:
            os.remove(attachment.file_path)
        except:
            pass
            
    crud.delete_expense_attachment(db, attachment_id)
    return {"detail": "Attachment deleted successfully"}"""

delete_expense_att_new = """def delete_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    expense = db.query(models.Expense).filter(models.Expense.id == attachment.expense_id).first()
    if expense and current_user.role not in ['admin', 'manager'] and expense.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    try:
        storage_client = storage.Client()
        bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        blob.delete()
    except Exception as e:
        print(f"Error deleting expense attachment from GCS: {e}")
            
    crud.delete_expense_attachment(db, attachment_id)
    return {"detail": "Attachment deleted successfully"}"""

content = content.replace(delete_expense_att_old, delete_expense_att_new)

# 6. download_expense_attachment
download_expense_att_old = """def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(path=attachment.file_path, filename=attachment.filename)"""

download_expense_att_new = """def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.ExpenseAttachment).filter(models.ExpenseAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    try:
        storage_client = storage.Client()
        bucket_name = getattr(config.settings, 'gcs_attachment_bucket', 'pace-app-attachments')
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(attachment.file_path)
        
        file_bytes = blob.download_as_bytes()
        
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={attachment.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found on cloud storage: {str(e)}")"""

content = content.replace(download_expense_att_old, download_expense_att_new)

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")
