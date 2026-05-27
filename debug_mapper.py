import sys
from sqlalchemy.orm import configure_mappers
from app import models

print("Attempting to configure mappers...")
try:
    configure_mappers()
    print("Mappers configured successfully.")
except Exception as e:
    print(f"Mapper configuration FAILED: {e}")
    import traceback
    traceback.print_exc()
