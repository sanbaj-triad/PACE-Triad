
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import Column, Integer, Enum, create_engine, String
from sqlalchemy.orm import declarative_base, sessionmaker
import enum

class AuditAction(str, enum.Enum):
    BILLED = "Billed"
    REVERSED = "Reversed"
    MODIFIED = "Modified"

Base = declarative_base()

class TestModel(Base):
    __tablename__ = "test_enum"
    id = Column(Integer, primary_key=True)
    action = Column(Enum(AuditAction))

def test():
    # In-memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("--- Inserting via ORM ---")
    t1 = TestModel(action=AuditAction.BILLED)
    session.add(t1)
    session.commit()
    
    # Check raw value
    res = session.execute("SELECT action FROM test_enum").fetchone()
    print(f"Stored value for AuditAction.BILLED: '{res[0]}'")
    
    # If it stored 'BILLED' (Name), then my manual migration of 'Billed' (Value) is wrong.
    
    print("--- Truncating and inserting 'Billed' manually ---")
    session.execute("DELETE FROM test_enum")
    session.execute("INSERT INTO test_enum (action) VALUES ('Billed')")
    session.commit()
    
    print("--- Reading back via ORM ---")
    try:
        t2 = session.query(TestModel).first()
        print(f"Read back: {t2.action}")
    except Exception as e:
        print(f"Read failed: {e}")

if __name__ == "__main__":
    test()
