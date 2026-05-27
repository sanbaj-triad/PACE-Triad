
import sqlite3
import os
import sys

# Add current dir to path to import app modules
sys.path.append(os.getcwd())

DB_FILE = "sql_app.db"

def migrate():
    print(f"Migrating {DB_FILE}...")
    
    # 0. Initialize Tables (Create milestone_audits if missing)
    try:
        from app.database import engine
        from app import models
        print("Creating new tables from models...")
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Error initializing tables: {e}")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Backfill Audits
    print("Checking for existing invoiced milestones...")
    try:
        # Check if invoice_id column exists (it should)
        cursor.execute("PRAGMA table_info(milestones)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'invoice_id' not in columns:
            print("'invoice_id' column not found in milestones table. Migration might have already run or table schema is different.")
            conn.close()
            return
            
        # Select invoiced milestones
        cursor.execute("SELECT id, invoice_id, cost, name FROM milestones WHERE invoice_id IS NOT NULL")
        invoiced_milestones = cursor.fetchall()
        
        print(f"Found {len(invoiced_milestones)} invoiced milestones to migrate.")
        
        count = 0
        for m_id, inv_id, cost, name in invoiced_milestones:
            # Check if Audit exists
            cursor.execute("SELECT id FROM milestone_audits WHERE milestone_id = ? AND invoice_id = ?", (m_id, inv_id))
            if cursor.fetchone():
                continue # Already migrated
                
            # Get Invoice Number
            cursor.execute("SELECT invoice_number FROM invoices WHERE id = ?", (inv_id,))
            res = cursor.fetchone()
            inv_num = res[0] if res else "UNKNOWN"
            
            # Get LineItem amount if possible
            cursor.execute("SELECT amount FROM line_items WHERE milestone_id = ? AND invoice_id = ?", (m_id, inv_id))
            li_res = cursor.fetchone()
            amount = li_res[0] if li_res else (cost or 0.0)
            
            # Insert Audit
            # action='Billed'
            print(f"Migrating Milestone '{name}' (ID: {m_id}) -> Invoice {inv_num} (${amount})")
            cursor.execute("""
                INSERT INTO milestone_audits (milestone_id, invoice_id, invoice_number, action, amount, percentage, created_at, updated_at)
                VALUES (?, ?, ?, 'BILLED', ?, NULL, datetime('now'), datetime('now'))
            """, (m_id, inv_id, inv_num, amount))
            
            count += 1
            
        print(f"Migrated {count} records options.")
        
        # Optional: Set invoice_id to NULL to prevent confusion? 
        # Or leave it as legacy data. 
        # Let's leave it for now, as the new Model ignores it.
        
        conn.commit()
    except Exception as e:
        print(f"Migration Error: {e}")
    finally:
        conn.close()
    
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
