def fix():
    with open('c:/Apps/python/Invoice_Project_Lead/app/main.py', 'r', encoding='utf-8') as f:
        text = f.read()

    import re
    old1 = r'@app\.get\("/users/", response_model=List\[schemas\.User\]\)\ndef read_users\(skip: int = 0, limit: int = 100, db: Session = Depends\(get_db\)\):\n\s*return crud\.get_users\(db, skip=skip, limit=limit\)'
    new1 = '''@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    users = crud.get_users(db, skip=skip, limit=limit)
    if not getattr(current_user, 'has_financial_access', False) and getattr(current_user, 'role', '') != 'admin':
        for u in users:
            u.hourly_billing_rate = None
            u.internal_cost_rate = None
    return users'''

    text = re.sub(old1, new1, text)

    old2 = r'@app\.get\("/users/\{user_id\}", response_model=schemas\.User\)\ndef read_user\(user_id: int, db: Session = Depends\(get_db\)\):\n\s*db_user = crud\.get_user\(db, user_id=user_id\)\n\s*if db_user is None:\n\s*raise HTTPException\(status_code=404, detail="User not found"\)\n\s*return db_user'
    new2 = '''@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_active_user)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not getattr(current_user, 'has_financial_access', False) and getattr(current_user, 'role', '') != 'admin':
        db_user.hourly_billing_rate = None
        db_user.internal_cost_rate = None
    return db_user'''

    text = re.sub(old2, new2, text)

    with open('c:/Apps/python/Invoice_Project_Lead/app/main.py', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == '__main__':
    fix()
