
import sys
import os
sys.path.append(os.getcwd())

print("Importing app.main...")
try:
    from app import main
    print("Successfully imported app.main")
except Exception as e:
    print("Failed to import app.main")
    import traceback
    traceback.print_exc()
