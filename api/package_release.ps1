# Prepare Release Script
$ErrorActionPreference = "Stop"

echo "1. Building Frontend..."
cd ../frontend
npm run build

echo "2. Building Backend..."
cd ../api
npm run build

echo "3. Creating Release Package..."
cd ..
if (Test-Path release) { Remove-Item release -Recurse -Force }
New-Item -ItemType Directory -Force -Path release | Out-Null

# Copy Backend Files
Copy-Item -Path api/dist -Destination release/dist -Recurse
Copy-Item -Path api/package.json -Destination release/package.json
Copy-Item -Path api/prisma -Destination release/prisma -Recurse
Copy-Item -Path api/.env -Destination release/.env -ErrorAction SilentlyContinue

# Copy Frontend Files to api/public
New-Item -ItemType Directory -Force -Path release/public | Out-Null
Copy-Item -Path frontend/dist/* -Destination release/public -Recurse

# Create Start Script
$startScript = @"
npm install --production
npx prisma migrate deploy
node dist/index.js
"@
Set-Content -Path release/start.sh -Value $startScript
Set-Content -Path release/start.bat -Value $startScript

echo "Release package created in 'release' folder."
echo "You can upload this folder to your server and run 'sh start.sh' or 'start.bat'."
