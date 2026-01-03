#!/bin/bash
set -e

PROJECT_ID="gachar-483208"
SERVICE_NAME="gachar-shop"
REGION="asia-southeast1"
IMAGE_TAG="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "================================================="
echo "Deploying to Cloud Run: $SERVICE_NAME"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "================================================="

# 1. Build Docker Image
echo "Building Docker image..."
docker build -t $IMAGE_TAG .

# 2. Push to Container Registry
echo "Pushing image to GCR..."
docker push $IMAGE_TAG

# 3. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_TAG \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID

echo "Deployment Complete!"
