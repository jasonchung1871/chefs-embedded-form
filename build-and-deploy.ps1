# Build and deploy script for OpenShift (PowerShell)

param(
    [string]$AppName = "embedded-chefs",
    [string]$ImageName = "chefs-embedded-form", 
    [string]$ImageTag = "latest",
    [string]$Registry = "ghcr.io",
    [string]$Namespace = "your-github-username"
)

$ErrorActionPreference = "Stop"

Write-Host "Building Vue.js application..." -ForegroundColor Green
npm run build

Write-Host "Building Docker image..." -ForegroundColor Green
docker build -f Dockerfile.openshift -t "${Registry}/${Namespace}/${ImageName}:${ImageTag}" .

Write-Host "Pushing image to registry..." -ForegroundColor Green
docker push "${Registry}/${Namespace}/${ImageName}:${ImageTag}"

Write-Host "Image pushed: ${Registry}/${Namespace}/${ImageName}:${ImageTag}" -ForegroundColor Green
Write-Host ""
Write-Host "To deploy to OpenShift, use:" -ForegroundColor Yellow
Write-Host "oc process -f embedded-chefs-prebuilt.yaml ``" -ForegroundColor Cyan
Write-Host "  -p APP_NAME=${AppName} ``" -ForegroundColor Cyan
Write-Host "  -p IMAGE_REGISTRY=${Registry} ``" -ForegroundColor Cyan
Write-Host "  -p IMAGE_NAMESPACE=${Namespace} ``" -ForegroundColor Cyan
Write-Host "  -p IMAGE_NAME=${ImageName} ``" -ForegroundColor Cyan
Write-Host "  -p IMAGE_TAG=${ImageTag} ``" -ForegroundColor Cyan
Write-Host "  -p ROUTE_HOST=your-route-host.apps.cluster.domain ``" -ForegroundColor Cyan
Write-Host "  -p VITE_API_FORM_ID=your-form-id ``" -ForegroundColor Cyan
Write-Host "  -p VITE_API_FORM_VERSION_ID=your-version-id ``" -ForegroundColor Cyan
Write-Host "  -p VITE_API_KEY=your-api-key ``" -ForegroundColor Cyan
Write-Host "  | oc apply -f -" -ForegroundColor Cyan
