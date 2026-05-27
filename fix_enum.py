with open('c:/Apps/python/Invoice_Project_Lead/app/models.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = '''class ExpenseType(str, enum.Enum):
    HARDWARE = "Hardware"
    TE = "T&E"
    SHIPPING = "Shipping"
    SOFTWARE = "Software"
    CONTRACTOR = "Contractor"
    TOOLS = "Tools"'''

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
    TOOLS = "Tools"'''

old_block = old_block.replace('\n', '\r\n')
new_block = new_block.replace('\n', '\r\n')

text = text.replace(old_block, new_block)

with open('c:/Apps/python/Invoice_Project_Lead/app/models.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("Replaced!")
