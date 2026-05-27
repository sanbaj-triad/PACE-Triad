import sys
import traceback
import os

sys.path.append(os.getcwd())

try:
    with open('startup_error.log', 'w') as f:
        try:
            print("Attempting to import app.main...", file=f)
            from app import main
            print("Import successful!", file=f)
        except Exception:
            traceback.print_exc(file=f)
    print("Diagnostic ran. Check startup_error.log")
except Exception as e:
    print(f"Failed to run diagnostic: {e}")
