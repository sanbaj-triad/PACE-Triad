# Documentation Regeneration Workflow (NotebookLM S.O.P.)

This Standard Operating Procedure defines the exact workflow required to rebuild, capture, and refresh the central documentation payload stored inside your `NotebookLM_Documentation` directory before a major production release.

By following this sequence, Google NotebookLM will always understand the exact, latest mathematical structure of your ecosystem.

---

## Step 1: Harvest Gemini Artifacts
Antigravity automatically compiles exhaustive, highly technical `Walkthroughs`, `Implementation Plans`, and `Bug Reports` behind the scenes as you code. These files are pure gold for AI context.

Before a release, you simply ask Antigravity in your chat window:
> *"Please aggregate all Markdown files and walkthrough artifacts from our secure brain directory and copy them directly into the `NotebookLM_Documentation` folder."*

This will seamlessly dump 100% of the conversational architectural pivots into your local pipeline context.

---

## Step 2: System Architecture Regeneration
Whenever you significantly change SQL data models (e.g. adding a new table for Notifications) or deploy new Cloud boundaries, the graphical Mermaid charts must be updated.

1. **Update the Syntax:** Open `SYSTEM_ARCHITECTURE.md` and manually adjust the Mermaid syntax to reflect the new API rules or Table relationships.
2. **Generate the PDFs:** Open a PowerShell core terminal at the project root and execute the headless Node conversion daemon to produce hard-copy visual assets for NotebookLM.
```powershell
npx @mermaid-js/mermaid-cli -i "NotebookLM_Documentation\SYSTEM_ARCHITECTURE.md" -o "NotebookLM_Documentation\PACE_System_Architecture.pdf"
```
*(Note: Mermaid-cli will automatically cut the payload into multiple PDFs denoted by `-1`, `-2`, `-3` based on the number of graphics inside.)*

---

## Step 3: Source Inventory Re-Indexing
As the application scales, you must recalculate the total file surface area and external API dependencies. 

1. **Recalculate File Limits:**
Open PowerShell at your project directory and execute this exact string to bypass Git and Node caches to get a pure physical inventory drop:
```powershell
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.FullName -notmatch '\\(\.venv|\.git|node_modules|__pycache__|dist|\.gemini)\\.*' } | Group-Object Extension | Select-Object Name, Count | Sort-Object Count -Descending > NotebookLM_Documentation/LATEST_FILE_COUNTS.txt
```

2. **Update Dependency Vectors:**
Monitor `requirements.txt` and `frontend/package.json`. If developers install a new module (e.g., `stripe-python` or `react-pdf`), manually add those physical definitions inside `SOURCE_INVENTORY.md` so the AI understands that module functions are legally available.

---

## Step 4: NotebookLM Refresh
Once Steps 1 - 3 are executed:
1. Open Google NotebookLM.
2. Open the Source Panel on the left-hand column.
3. Physically drag and drop the entirety of the `c:\Apps\python\Invoice_Project_Lead\NotebookLM_Documentation` folder.
4. If NotebookLM prompts you, choose to **Overwrite** existing sources to purge legacy constraints.

*Your team now possesses an AI architecture trained precisely to your current Production baseline point.*
