# ⚡ ECOFlow Backend - Quick Start Guide

## 🎯 Current Status
✅ **Phase 1 Complete:** Authentication & Authorization fully tested and working!

---

## 🚀 Start the Server

### Option 1: PowerShell (Recommended)
```powershell
cd backend
npm run dev
```

### Option 2: New Window
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'PATH\TO\backend' ; npm run dev"
```

Server will start at: **http://localhost:5000**

---

## 🧪 Test the API

### 1. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

### 2. Login (Engineer)
```powershell
$body = @{ 
    email = "engineer@ecoflow.com"
    password = "password123" 
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Save token
$token = $response.accessToken
```

### 3. Get Current User (Protected)
```powershell
$headers = @{ "Authorization" = "Bearer $token" }

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/auth/me" `
    -Method GET `
    -Headers $headers
```

### 4. Create New User
```powershell
$signupBody = @{
    email = "test@ecoflow.com"
    password = "test123"
    name = "Test User"
    role = "OPERATIONS"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/auth/signup" `
    -Method POST `
    -Body $signupBody `
    -ContentType "application/json"
```

---

## 👥 Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@ecoflow.com | password123 | ADMIN |
| engineer@ecoflow.com | password123 | ENGINEERING |
| approver@ecoflow.com | password123 | APPROVER |
| operations@ecoflow.com | password123 | OPERATIONS |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts              # ⚡ Main entry point
│   ├── config/
│   │   └── database.ts        # 🗄️ Prisma client
│   ├── controllers/
│   │   └── auth.controller.ts # 🔐 Auth logic
│   ├── middlewares/
│   │   └── auth.middleware.ts # 🛡️ Protection
│   ├── routes/
│   │   └── auth.routes.ts     # 🛣️ API routes
│   └── utils/
│       ├── jwt.utils.ts       # 🎫 Token management
│       └── password.utils.ts  # 🔒 Password hashing
├── prisma/
│   ├── schema.prisma          # 📊 Database schema
│   └── seed.ts                # 🌱 Test data
└── .env                        # ⚙️ Configuration
```

---

## 📚 Available Documentation

- **README.md** - Complete developer guide
- **API_TESTING.md** - API endpoint documentation
- **TESTING_RESULTS.md** - Test results report
- **PHASE1_COMPLETION.md** - Phase 1 summary
- **DEVELOPMENT_PROGRESS.md** - Overall progress tracker

---

## 🔧 Common Commands

### Start Development Server
```bash
npm run dev
```

### Run Database Migration
```bash
npx prisma migrate dev
```

### Seed Database
```bash
npx prisma db seed
```

### Generate Prisma Client
```bash
npx prisma generate
```

### View Database in Prisma Studio
```bash
npx prisma studio
```

---

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Health
- `GET /health` - Server health check
- `GET /` - API info

---

## 🐛 Troubleshooting

### Server won't start
```powershell
# Kill existing node processes
Get-Process -Name node | Stop-Process -Force

# Restart
cd backend
npm run dev
```

### Database connection error
```powershell
# Check PostgreSQL is running
Get-Service -Name postgresql*

# Test database connection
npx prisma db push
```

### Port 5000 in use
```powershell
# Check what's using port 5000
Get-NetTCPConnection -LocalPort 5000

# Or change port in .env
PORT=5001
```

---

## 🎊 What's Working

✅ Authentication (login, signup, logout)  
✅ JWT tokens (access + refresh)  
✅ Protected routes  
✅ RBAC (4 roles)  
✅ Password hashing  
✅ Database connection  
✅ Health checks  

---

## 🚀 Next Steps

Phase 2 development can begin:
- User Management APIs
- Product Master Data
- BoM Management
- ECO System (core feature)

---

**Need help?** Check the documentation files or test the API using the examples above!
