
import sys
import os
import inspect
sys.path.append(os.getcwd())

from app import main

def find_function():
    try:
        func = main.get_invoice_pdf
        lines, start_line = inspect.getsourcelines(func)
        print(f"Found 'get_invoice_pdf' in {inspect.getfile(func)} at line {start_line}")
        print("".join(lines[:5])) # Print first 5 lines to confirm
    except AttributeError:
        print("'get_invoice_pdf' not found in app.main dir()")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_function()
