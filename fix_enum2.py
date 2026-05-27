import re

with open('c:/Apps/python/Invoice_Project_Lead/app/models.py', 'r', encoding='utf-8') as f:
    text = f.read()

new_block = '''class ExpenseType(str, enum.Enum):
    HARDWARE = "Hardware"
    TE = "T&E"
    MEAL = "Meal"
    PARKING = "Parking"
    HOTEL = "Hotel"
    FLIGHT = "Flight"
    CAR_RENTAL = "Car Rental"
    SHIPPING = "Shipping"
    SOFTWARE = "Software"
    CONTRACTOR = "Contractor"
    TOOLS = "Tools"\n\n'''

text = re.sub(r'class ExpenseType\(str, enum\.Enum\):[\s\S]*?(?=class Expense\()', new_block, text)

with open('c:/Apps/python/Invoice_Project_Lead/app/models.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Successfully Replaced')
