from app.database import engine
from sqlalchemy import text

def alter_enum():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE invoices MODIFY COLUMN status ENUM('draft', 'sent', 'paid', 'void', 'partial') DEFAULT 'draft'"))
        print("Success")

if __name__ == '__main__':
    alter_enum()
