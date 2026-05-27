import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app.database import engine
    from app import models
    print("Models imported.")
    models.Base.metadata.create_all(bind=engine)
    print("Tables created successfully")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
