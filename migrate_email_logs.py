from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL

print(f"Connecting to database: {SQLALCHEMY_DATABASE_URL}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
with engine.connect() as conn:
    print("Executing EmailLog Migration...")
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                entity_type VARCHAR(100),
                entity_id INT,
                recipients VARCHAR(1000),
                subject VARCHAR(500),
                status VARCHAR(50),
                details TEXT,
                created_by_id INT,
                FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        conn.commit()
        print("Successfully created `email_logs` table!")
    except Exception as e:
        print(f"Migration Failed: {e}")
