$ErrorActionPreference = "Stop"

$PROJECT_ID = "gachar-483208"
$SERVICE_NAME = "gachar-shop-staging"
$REGION = "asia-southeast1"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "================================================="
Write-Host "Deploying to STAGING: $SERVICE_NAME"
Write-Host "Project: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "================================================="

# 0. Check for env.staging.yaml
if (-not (Test-Path "env.staging.yaml")) {
    Write-Error "ERROR: env.staging.yaml not found! Please create it."
    exit 1
}

# 1. Build Docker Image
Write-Host "Building Docker image for Staging..."
docker build -t $IMAGE_TAG .

# 2. Push to Container Registry
Write-Host "Pushing image to GCR..."
docker push $IMAGE_TAG

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run (Staging)..."
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_TAG `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --project $PROJECT_ID `
    --env-vars-file env.staging.yaml

# 4. Domain Mapping (Optional/Manual Step usually, but can try to prompt)
Write-Host "Deployment Complete!"
Write-Host "Service URL is listed above."
Write-Host ""
Write-Host "To map the custom domain 'staging.gacharshop.com', run:"
Write-Host "gcloud beta run domain-mappings create --service $SERVICE_NAME --domain staging.gacharshop.com --region $REGION --project $PROJECT_ID"
