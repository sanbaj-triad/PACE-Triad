import sys
try:
    with open('backend_error.txt', 'r', encoding='utf-16-le') as f:
        text = f.read()
    
    if "Traceback " in text:
        blocks = text.split("Traceback ")
        last_err = "Traceback " + blocks[-1]
        print(last_err[-2000:])
    elif "AttributeError" in text:
        blocks = text.split("AttributeError")
        print("AttributeError" + blocks[-1][:2000])
    else:
        print("No traceback found.")
except Exception as e:
    print(str(e))
