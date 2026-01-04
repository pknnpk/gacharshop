
$envContent = Get-Content .env
$envVars = $envContent | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object { $_.Trim() -replace '"','' }
$envString = $envVars -join ","

Write-Host "Deploying with Env Vars: $envString"

gcloud run deploy gachar-shop `
  --image gcr.io/gachar-483208/gachar-shop `
  --region asia-southeast1 `
  --platform managed `
  --allow-unauthenticated `
  --project gachar-483208 `
  --set-env-vars $envString
