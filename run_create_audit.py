import sys
import os
sys.path.append('/app')

from app.database import engine
from app.models import Base

def create_tables():
    print("Creating newly added tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    create_tables()
