# OpenShift Deployment Script for Embedded CHEFS
param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$true)]
    [string]$RouteHost,
    
    [Parameter(Mandatory=$true)]
    [string]$FormId,
    
    [Parameter(Mandatory=$true)]
    [string]$FormVersionId,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$ImageNamespace = "your-github-username",
    [string]$ImageRegistry = "ghcr.io",
    [string]$ImageName = "chefs-embedded-form",
    [string]$ImageTag = "latest",
    [string]$RoutePath = "/",
    [string]$ChefsApiUrl = "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1736/api/v1",
    [int]$Replicas = 1,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying Embedded CHEFS Application..." -ForegroundColor Green
Write-Host "App Name: $AppName" -ForegroundColor Cyan
Write-Host "Route Host: $RouteHost" -ForegroundColor Cyan
Write-Host "Form ID: $FormId" -ForegroundColor Cyan

$processCommand = @(
    "oc", "process", "-f", "embedded-chefs-prebuilt.yaml",
    "-p", "APP_NAME=$AppName",
    "-p", "IMAGE_REGISTRY=$ImageRegistry",
    "-p", "IMAGE_NAMESPACE=$ImageNamespace", 
    "-p", "IMAGE_NAME=$ImageName",
    "-p", "IMAGE_TAG=$ImageTag",
    "-p", "ROUTE_HOST=$RouteHost",
    "-p", "ROUTE_PATH=$RoutePath",
    "-p", "VITE_CHEFS_API_URL=$ChefsApiUrl",
    "-p", "VITE_API_FORM_ID=$FormId",
    "-p", "VITE_API_FORM_VERSION_ID=$FormVersionId",
    "-p", "VITE_API_KEY=$ApiKey",
    "-p", "REPLICAS=$Replicas"
)

if ($DryRun) {
    Write-Host "DRY RUN - Generated YAML:" -ForegroundColor Yellow
    & $processCommand
} else {
    Write-Host "Applying to OpenShift..." -ForegroundColor Green
    & $processCommand | oc apply -f -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deployment successful!" -ForegroundColor Green
        Write-Host "Your app should be available at: https://$RouteHost$RoutePath" -ForegroundColor Cyan
        
        Write-Host "`nTo check deployment status:" -ForegroundColor Yellow
        Write-Host "oc get pods -l app=$AppName" -ForegroundColor Cyan
        Write-Host "oc logs -l app=$AppName -f" -ForegroundColor Cyan
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
        exit 1
    }
}
