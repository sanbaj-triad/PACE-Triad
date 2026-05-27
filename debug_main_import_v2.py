import sys
import traceback

print("Attempting to import app.main...")
try:
    from app import main
    print("Import SUCCESS.")
except Exception:
    print("Import FAILED.")
    traceback.print_exc()
