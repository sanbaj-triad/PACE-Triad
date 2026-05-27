import sqlite3
import os
import pymysql

def run_migration_sqlite():
    db_file = "sql_app.db"
    if not os.path.exists(db_file):
        print("SQLite database not found.")
        return

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)")
        print("Added project_id column to tasks table (SQLite)")
    except sqlite3.OperationalError as e:
        print(f"Column project_id might already exist in SQLite: {e}")

    try:
        cursor.execute("ALTER TABLE tasks ADD COLUMN milestone_id INTEGER REFERENCES milestones(id)")
        print("Added milestone_id column to tasks table (SQLite)")
    except sqlite3.OperationalError as e:
        print(f"Column milestone_id might already exist in SQLite: {e}")

    conn.commit()
    conn.close()

def run_migration_mysql():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='invoice_user',
            password='invoice_password',
            database='invoice_app'
        )
        cursor = conn.cursor()
        
        try:
            cursor.execute("ALTER TABLE tasks ADD COLUMN project_id INT NULL, ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id);")
            print("Added project_id column to tasks table (MySQL)")
        except pymysql.MySQLError as e:
            print(f"MySQL project_id alter error (might exist): {e}")

        try:
            cursor.execute("ALTER TABLE tasks ADD COLUMN milestone_id INT NULL, ADD CONSTRAINT fk_tasks_milestone FOREIGN KEY (milestone_id) REFERENCES milestones(id);")
            print("Added milestone_id column to tasks table (MySQL)")
        except pymysql.MySQLError as e:
            print(f"MySQL milestone_id alter error (might exist): {e}")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Could not connect to MySQL: {e}")

if __name__ == "__main__":
    print("Running migrations...")
    run_migration_sqlite()
    run_migration_mysql()
    print("Migration finished.")
