
Write-Host "Killing all Node.js processes..."
try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "All Node processes killed."
}
catch {
    Write-Host "No Node processes running."
}

Write-Host "Starting Next.js Dev Server..."
npm run dev
