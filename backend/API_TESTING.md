# ECOFlow Backend API Testing Guide

## Base URL
```
http://localhost:5000
```

## Authentication Endpoints

### 1. Health Check
```http
GET /health
```

### 2. Signup (Register New User)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "test@ecoflow.com",
  "password": "password123",
  "name": "Test User",
  "role": "ENGINEERING"
}
```

**Roles:** `ENGINEERING`, `APPROVER`, `OPERATIONS`, `ADMIN`

### 3. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "engineer@ecoflow.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "engineer@ecoflow.com",
      "name": "Engineering User",
      "role": "ENGINEERING",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4. Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

### 5. Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 6. Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Testing with PowerShell

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
```

### Login
```powershell
$loginBody = @{
    email = "engineer@ecoflow.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$accessToken = $response.data.accessToken
$refreshToken = $response.data.refreshToken
```

### Get Current User (with token)
```powershell
$headers = @{
    Authorization = "Bearer $accessToken"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
```

## Testing with curl

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@ecoflow.com","password":"password123"}'
```

### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Default Test Users (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@ecoflow.com | password123 | ADMIN |
| engineer@ecoflow.com | password123 | ENGINEERING |
| approver@ecoflow.com | password123 | APPROVER |
| operations@ecoflow.com | password123 | OPERATIONS |

## Next Steps

1. Run database migration: `npm run prisma:migrate`
2. Seed database: `npm run prisma:seed`
3. Start server: `npm run dev`
4. Test the endpoints using the examples above
