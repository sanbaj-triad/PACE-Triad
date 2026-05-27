import os
import re

files_to_check = [
    r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\TaskFormV2.jsx",
    r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\TaskReport.jsx",
    r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\TaskList.jsx",
    r"c:\Apps\python\Invoice_Project_Lead\frontend\src\pages\Timesheet.jsx"
]

all_options = ['Admin', 'Design', 'Documentation', 'Engineering', 'FAT', 'LAB', 'Learning', 'Onsite', 'Ordering', 'Other', 'PM', 'PTO', 'Panel Building', 'Planning', 'Programming', 'SAT', 'Shipping', 'Support', 'Testing', 'Training']
all_options.sort() # Ensure sorted alphabetically

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the block of <option value="X">X</option>
    # We look for a line with "Engineering" and replace the whole contiguous block of <option> tags
    def replace_block(match):
        block = match.group(0)
        # Find the indentation of the first <option>
        m = re.search(r'^([ \t]+)<option', block, re.MULTILINE)
        indent = m.group(1) if m else "                            "
        
        # Build new block
        new_block_lines = []
        # If it has an <option value="">All Types</option>, preserve it at top!
        if '<option value="">All Types</option>' in block:
            new_block_lines.append(f'{indent}<option value="">All Types</option>')
            
        for opt in all_options:
            new_block_lines.append(f'{indent}<option value="{opt}">{opt}</option>')
            
        return "\n".join(new_block_lines)

    # This regex matches a contiguous block of <option ...> tags that span multiple lines
    # It requires the block to contain at least "Engineering" and "PTO"
    pattern = r'([ \t]*<option[^>]*>.*?</option>\r?\n?)+'

    def filter_and_replace(m):
        txt = m.group(0)
        if "value=\"Engineering\"" in txt and "value=\"PTO\"" in txt and "value=\"LAB\"" in txt:
            return replace_block(m)
        return txt

    new_content = re.sub(pattern, filter_and_replace, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("done")
