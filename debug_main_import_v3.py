import traceback
try:
    import app.schemas
except Exception as e:
    with open("err_utf8.txt", "w", encoding="utf-8") as f:
        traceback.print_exc(file=f)
