def scale_logo():
    try:
        with open('app/pdf_generator.py', 'r') as f:
            text = f.read()

        text = text.replace('style="height: 150px;"', 'style="height: 98px;"')
        text = text.replace('style="height: 125px;"', 'style="height: 81px;"')

        with open('app/pdf_generator.py', 'w') as f:
            f.write(text)
        print('Successfully scaled logo heights.')
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    scale_logo()
