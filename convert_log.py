try:
    with open('seed_error.log', 'rb') as f:
        content = f.read()
    # Try decoding as utf-16le first, then utf-8, then fallback
    try:
        text = content.decode('utf-16le')
    except:
        try:
            text = content.decode('utf-8')
        except:
            text = content.decode('cp1252', errors='ignore')
            
    with open('seed_error_utf8.log', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Conversion successful")
except Exception as e:
    print(f"Conversion failed: {e}")
