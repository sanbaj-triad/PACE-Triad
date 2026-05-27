import re, base64

def replace_logo():
    try:
        with open('app/pdf_generator.py', 'r') as f:
            text = f.read()

        new_b64 = base64.b64encode(open(r'frontend/public/TSE_PACE_tn.png', 'rb').read()).decode('utf-8')
        new_str = f'<img src="data:image/png;base64,{new_b64}"'

        text = re.sub(r'<img src="data:image/png;base64,[A-Za-z0-9+/=]+"', new_str, text)

        with open('app/pdf_generator.py', 'w') as f:
            f.write(text)
        print('Successfully replaced old base64 strings with TSE_PACE_tn.png')
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    replace_logo()
