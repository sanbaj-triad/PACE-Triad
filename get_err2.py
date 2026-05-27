import io
with open('backend_error.txt', 'rb') as f:
    text = f.read().decode('utf-16-le', errors='ignore')
print(text[-2000:])
