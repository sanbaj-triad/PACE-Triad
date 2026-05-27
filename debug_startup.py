import sys
import os

# Ensure app module can be found
sys.path.append(os.getcwd())

try:
    from app.database import engine
    from app import models
    print("Attempting to create tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Database initialized successfully.")
except Exception as e:
    print("Startup Error Caught:")
    import traceback
    traceback.print_exc()
