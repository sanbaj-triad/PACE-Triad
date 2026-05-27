import sys
import os

def patch_sql_dump(filepath):
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        return

    print(f"Patching {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='utf-16') as f:
            content = f.read()

    if not content.startswith('SET FOREIGN_KEY_CHECKS=0;'):
        content = 'SET FOREIGN_KEY_CHECKS=0;\n' + content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success! Forced FOREIGN_KEY_CHECKS=0 at the top of the file.")
    else:
        print("File is already patched with FOREIGN_KEY_CHECKS=0.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python patch_sql_dump.py <path_to_sql_file>")
    else:
        patch_sql_dump(sys.argv[1])
