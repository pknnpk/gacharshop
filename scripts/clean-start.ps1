
Write-Host "Searching for Next.js processes to kill..."

$processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*next*' -or $_.CommandLine -like '*next-dev*' }

if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Killing process ID $($p.ProcessId)"
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Next.js processes killed."
}
else {
    Write-Host "No Next.js processes found."
}

Write-Host "Starting Next.js Dev Server..."
npm run dev
