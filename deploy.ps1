$ErrorActionPreference = "Stop"

$PROJECT_ID = "gachar-483208"
$SERVICE_NAME = "gachar-shop"
$REGION = "asia-southeast1"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "================================================="
Write-Host "Deploying to Cloud Run: $SERVICE_NAME"
Write-Host "Project: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "================================================="

# 0. Check for env.yaml
if (-not (Test-Path "env.yaml")) {
    Write-Error "ERROR: env.yaml not found! You must create it from env.example.yaml and populate it with secrets."
    exit 1
}

# 1. Build Docker Image
Write-Host "Building Docker image..."
docker build -t $IMAGE_TAG .

# 2. Push to Container Registry
Write-Host "Pushing image to GCR..."
docker push $IMAGE_TAG

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_TAG `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --project $PROJECT_ID `
    --env-vars-file env.yaml

Write-Host "Deployment Complete!"
Write-Host "IMPORTANT: Please check the Service URL above."
Write-Host "If this is your first deploy, you MUST update NEXTAUTH_URL in env.yaml to this URL and re-deploy."
