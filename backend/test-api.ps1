# API Testing Script for ECOFlow Backend

Write-Host "=== Testing ECOFlow API ===" -ForegroundColor Cyan

# 1. Test Health Endpoint
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "✓ Health Check SUCCESS" -ForegroundColor Green
    $health | ConvertTo-Json
} catch {
    Write-Host "✗ Health Check FAILED: $_" -ForegroundColor Red
}

# 2. Test Login
Write-Host "`n2. Testing Login (Engineer)..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "engineer@ecoflow.com"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    Write-Host "✓ Login SUCCESS" -ForegroundColor Green
    Write-Host "User: $($loginResponse.user.email)" -ForegroundColor White
    Write-Host "Role: $($loginResponse.user.role)" -ForegroundColor White
    
    # Save token for next tests
    $global:accessToken = $loginResponse.accessToken
    $global:refreshToken = $loginResponse.refreshToken
    
    Write-Host "`nTokens saved for subsequent tests" -ForegroundColor Gray
} catch {
    Write-Host "✗ Login FAILED: $_" -ForegroundColor Red
}

# 3. Test Me Endpoint (Protected)
if ($global:accessToken) {
    Write-Host "`n3. Testing /me Endpoint (Protected)..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:accessToken"
        }
        
        $meResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" `
            -Method GET `
            -Headers $headers
        
        Write-Host "✓ /me Endpoint SUCCESS" -ForegroundColor Green
        $meResponse | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "✗ /me Endpoint FAILED: $_" -ForegroundColor Red
    }
}

# 4. Test Signup
Write-Host "`n4. Testing Signup (New User)..." -ForegroundColor Yellow
try {
    $signupBody = @{
        email = "testuser@ecoflow.com"
        password = "test123"
        fullName = "Test User"
        role = "OPERATIONS"
    } | ConvertTo-Json

    $signupResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/signup" `
        -Method POST `
        -Body $signupBody `
        -ContentType "application/json"
    
    Write-Host "✓ Signup SUCCESS" -ForegroundColor Green
    Write-Host "New User: $($signupResponse.user.email)" -ForegroundColor White
} catch {
    Write-Host "✗ Signup FAILED (might already exist): $_" -ForegroundColor Yellow
}

# 5. Test Refresh Token
if ($global:refreshToken) {
    Write-Host "`n5. Testing Refresh Token..." -ForegroundColor Yellow
    try {
        $refreshBody = @{
            refreshToken = $global:refreshToken
        } | ConvertTo-Json

        $refreshResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/refresh" `
            -Method POST `
            -Body $refreshBody `
            -ContentType "application/json"
        
        Write-Host "✓ Refresh Token SUCCESS" -ForegroundColor Green
        Write-Host "New Access Token received" -ForegroundColor White
    } catch {
        Write-Host "✗ Refresh Token FAILED: $_" -ForegroundColor Red
    }
}

# 6. Test Logout
if ($global:refreshToken) {
    Write-Host "`n6. Testing Logout..." -ForegroundColor Yellow
    try {
        $logoutBody = @{
            refreshToken = $global:refreshToken
        } | ConvertTo-Json

        $logoutResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/logout" `
            -Method POST `
            -Body $logoutBody `
            -ContentType "application/json"
        
        Write-Host "✓ Logout SUCCESS" -ForegroundColor Green
        $logoutResponse | ConvertTo-Json
    } catch {
        Write-Host "✗ Logout FAILED: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== API Testing Complete ===" -ForegroundColor Cyan
