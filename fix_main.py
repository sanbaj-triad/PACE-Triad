with open('app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

bad_string = "import os\nfrom google.cloud import storage\nfrom fastapi.responses import StreamingResponse\nimport io\n"
content = content.replace(bad_string, "import os\n")

if "from google.cloud import storage" not in content:
    top_imports = "from fastapi import FastAPI\nfrom google.cloud import storage\nfrom fastapi.responses import StreamingResponse\nimport io\n"
    content = content.replace("from fastapi import FastAPI", top_imports)

with open('app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
