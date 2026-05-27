from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base, TaskType, TaskStatus

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
metadata = MetaData()

def migrate():
    print("Migrating Tasks...")
    with engine.connect() as conn:
        # Create tables using raw SQL or SQLAlchemy metadata reflecting?
        # Since we have the models, we can use Base.metadata.create_all(bind=engine) 
        # but that only creates missing tables. This is perfect for new tables.
        
        Base.metadata.create_all(bind=engine)
        print("Tables created (if not existed).")
        
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
