import os

crud_path = r"c:\Apps\python\Invoice_Project_Lead\app\crud.py"

with open(crud_path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(".joinedload(models.Task.notes)", ".joinedload(models.Task.events)")

with open(crud_path, "w", encoding="utf-8") as f:
    f.write(text)

print("crud.py successfully updated!")
