$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupRoot = "c:\Apps\python\Invoice_Project_Lead_Backups"
$backupDir = Join-Path $backupRoot "Backup_$timestamp"
$sourceDir = "c:\Apps\python\Invoice_Project_Lead"

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Backing up to: $backupDir"

# 1. Copy Backend Code (app folder)
Write-Host "Copying backend code..."
Copy-Item -Path "$sourceDir\app" -Destination "$backupDir\app" -Recurse

# 2. Copy Frontend Code (src folder, public, package.json, vite.config)
Write-Host "Copying frontend code..."
$frontendDest = "$backupDir\frontend"
New-Item -ItemType Directory -Force -Path $frontendDest | Out-Null
Copy-Item -Path "$sourceDir\frontend\src" -Destination "$frontendDest\src" -Recurse
Copy-Item -Path "$sourceDir\frontend\public" -Destination "$frontendDest\public" -Recurse
Copy-Item -Path "$sourceDir\frontend\package.json" -Destination "$frontendDest\package.json"
Copy-Item -Path "$sourceDir\frontend\vite.config.js" -Destination "$frontendDest\vite.config.js"
Copy-Item -Path "$sourceDir\frontend\index.html" -Destination "$frontendDest\index.html"

# 3. Copy Database
Write-Host "Copying database..."
Copy-Item -Path "$sourceDir\sql_app.db" -Destination "$backupDir\sql_app.db"

# 4. Copy Python requirement/scripts files
Copy-Item -Path "$sourceDir\requirements.txt" -Destination "$backupDir\requirements.txt"
Copy-Item -Path "$sourceDir\*.py" -Destination "$backupDir\" 

Write-Host "Backup Complete!"
Get-ChildItem $backupDir
