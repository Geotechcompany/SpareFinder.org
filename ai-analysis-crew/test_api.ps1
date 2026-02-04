# PowerShell test script for API endpoints

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Testing AI Spare Part Analyzer API" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Testing Root Endpoint (GET /)..." -ForegroundColor Yellow
$response1 = Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get
$response1 | ConvertTo-Json
Write-Host ""

Write-Host "2. Testing Health Endpoint (GET /health)..." -ForegroundColor Yellow
$response2 = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
$response2 | ConvertTo-Json
Write-Host ""

Write-Host "3. Testing POST /analyze-part with sample data..." -ForegroundColor Yellow
$form = @{
    user_email = "test@example.com"
    keywords = "Toyota Camry brake pad front right"
}
try {
    $response3 = Invoke-RestMethod -Uri "http://localhost:8000/analyze-part" -Method Post -Form $form
    $response3 | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "All tests completed!" -ForegroundColor Green

