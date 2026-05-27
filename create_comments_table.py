from app.database import engine
from app.models import Base

def migrate():
    print("Creating tables...")
    # This will create any tables that don't exist
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    migrate()
