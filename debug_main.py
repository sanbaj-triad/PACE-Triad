import sys
import os
sys.path.append(os.getcwd())
try:
    from app import main
    print("Main imported successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
