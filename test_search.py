from app.database import SessionLocal
from app.crud import global_search

def test():
    db = SessionLocal()
    print("Testing '2000'")
    print(global_search(db, "2000"))
    print("Testing 'P-2000'")
    print(global_search(db, "P-2000"))
    
if __name__ == "__main__":
    test()
