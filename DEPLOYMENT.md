# 🚀 JobIntel Deployment Guide

Complete guide to deploy JobIntel with:
- **Frontend**: Netlify
- **Backend**: Render  
- **Database**: MongoDB Atlas
- **Alternative**: Docker Compose (local/self-hosted)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Render Backend Setup](#render-backend-setup)
4. [Netlify Frontend Setup](#netlify-frontend-setup)
5. [Docker Deployment](#docker-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Testing Deployment](#testing-deployment)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

**Fastest Deployment (Render + Netlify):**
1. Push code to GitHub ✅
2. Go to Render.com → Create Web Service
3. Connect to `pritamkumarchegg/job-search` repository
4. Build command: `npm ci && npm run build -w backend`
5. Start command: `npm start --prefix backend`
6. Add environment variables (see below)
7. Go to Netlify.com → Add new site
8. Connect to GitHub repository
9. Build command: `npm run build -w frontend`
10. Publish: `frontend/dist`
11. Add `VITE_API_URL=https://jobintel-backend.onrender.com`
12. Deploy ✅

**Time: ~15 minutes**

**Backend URL after deployment:** `https://jobintel-backend.onrender.com`
**Frontend URL after deployment:** `https://jobintel.netlify.app`

---

## 📦 Prerequisites

### Required Accounts
- ✅ GitHub account (code repository)
- ✅ Render account (render.com)
- ✅ Netlify account (netlify.com)
- ✅ MongoDB Atlas account (mongodb.com/cloud)

### Required Tools (for local testing)
- ✅ Node.js 20+ 
- ✅ Docker & Docker Compose (optional, for local deployment)
- ✅ Git CLI

### Repository
- ✅ Code pushed to GitHub: `https://github.com/pritamkumarchegg/job-search`

---

## 🔧 Render Backend Setup

### Step 1: Create Render Web Service

1. Go to [render.com](https://render.com) - Sign up/Login
2. Click "New +" → "Web Service"
3. Select "Build and deploy from a Git repository"
4. Connect your GitHub account
5. Choose repository: `pritamkumarchegg/job-search`
6. Fill in configuration:

| Field | Value |
|-------|-------|
| **Name** | `jobintel-backend` |
| **Environment** | `Node` |
| **Region** | `Ohio` (recommended) |
| **Branch** | `main` |
| **Root Directory** | Leave blank (auto-detect) |
| **Build Command** | `npm ci && npm run build -w backend` |
| **Start Command** | `npm start --prefix backend` |
| **Plan** | `Starter` ($7/month - recommended for production) |

### Step 2: Add Environment Variables in Render

In Render dashboard under your service, go to **Environment**:

**Required Variables (set these in Render UI):**

```bash
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/jobintel
JWT_SECRET=your-random-secret-key-at-least-32-chars-long
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
CORS_ORIGIN=https://jobintel.netlify.app
VITE_API_URL=https://jobintel-backend.onrender.com
```

**Get these values:**
- `MONGO_URI`: From MongoDB Atlas connection string
- `JWT_SECRET`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `RAZORPAY_*`: From your Razorpay dashboard (https://dashboard.razorpay.com)

### Step 3: Enable Auto-Deploy & Health Checks

1. Enable "Auto-Deploy" toggle
2. Add Health Check Path: `/api/health`
3. Set Health Check Interval: `10 minutes`

### Step 4: Deploy

- Click "Create Web Service"
- Render starts building automatically (~3-5 minutes)
- Wait for "Live" status ✅
- Backend URL: `https://jobintel-backend.onrender.com`
- Test: `curl https://jobintel-backend.onrender.com/api/health`

---

## 🎨 Netlify Frontend Setup

### Step 1: Create Netlify Site

1. Go to [netlify.com](https://netlify.com) - Sign up/Login
2. Click "Add new site" → "Import an existing project"
3. Select GitHub
4. Authorize Netlify to access your GitHub
5. Select repository: `pritamkumarchegg/job-search`
6. Fill in configuration:

| Field | Value |
|-------|-------|
| **Build Command** | `npm run build -w frontend` |
| **Publish Directory** | `frontend/dist` |
| **Node Version** | `20` |

### Step 2: Add Environment Variables in Netlify

After creating the site, go to **Site Settings** → **Build & deploy** → **Environment**:

**Required:**
```bash
VITE_API_URL=https://jobintel-backend.onrender.com
NODE_ENV=production
```

### Step 3: Trigger Deploy

- Click "Deploy site"
- Netlify auto-builds and deploys (~2-3 minutes)
- Wait for deployment to complete
- Your frontend URL: `https://jobintel.netlify.app`
- Enable auto-deploy on push: Already enabled by default

**Important:** Make sure Render backend is deployed first and `VITE_API_URL` is set to the Render backend URL before deploying frontend.

---

## 🐳 Docker Deployment

For self-hosted or local deployment.

### Option A: Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/pritamkumarchegg/job-search.git
cd job-search/JobIntel

# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option B: Individual Docker Images

```bash
# Build backend
docker build -f Dockerfile -t jobintel-backend ./backend

# Build frontend
docker build -f ../frontend/Dockerfile -t jobintel-frontend ./frontend

# Run backend
docker run -p 5000:5000 \
  -e MONGO_URI="mongodb://..." \
  -e JWT_SECRET="your-secret" \
  jobintel-backend

# Run frontend
docker run -p 8080:80 \
  -e VITE_API_URL="http://localhost:5000" \
  jobintel-frontend
```

### Docker Compose Configuration

See [docker-compose.yml](#docker-composeyml) for production setup.

---

## 🔐 Environment Configuration

### Backend Environment Variables

**Required:**
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobintel
JWT_SECRET=your-jwt-secret-key-at-least-32-chars
NODE_ENV=production
CORS_ORIGIN=https://jobintel.netlify.app
```

**Optional:**
```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=https://jobintel-backend.onrender.com/auth/github/callback

# Notification Services
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
WHATSAPP_API_KEY=your-whatsapp-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Razorpay (for payments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Frontend Environment Variables

**Required:**
```bash
VITE_API_URL=https://jobintel-backend.onrender.com
```

---

## 📊 Database Setup

### MongoDB Atlas Setup

1. Go to [mongodb.com/cloud](https://mongodb.com/cloud)
2. Sign up / Login
3. Create new project: "JobIntel"
4. Create cluster (free tier available)
5. Create database user:
   - Username: `jobintel_user`
   - Password: Generate strong password
   - Save connection string

6. Create database:
   - Name: `jobintel`
   - Collections: Auto-created

### Connection String Format

```
mongodb+srv://username:password@cluster.mongodb.net/jobintel?retryWrites=true&w=majority
```

### IP Whitelist

- Allow: `0.0.0.0/0` (allow all IPs)
- Or: Add specific IPs (Render, your office)

---

## ✅ Testing Deployment

### Test Backend

```bash
curl https://jobintel-backend.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-21T09:30:00Z"}
```

### Test Frontend

```bash
# Open in browser
https://jobintel.netlify.app

# Login with test account
# Email: test@example.com
# Password: test123
```

### Test Resume Upload

1. Login to frontend
2. Go to Profile → Upload Resume
3. Upload a PDF file
4. Verify:
   - File appears in profile
   - Skills extracted
   - Matches generated

### Test APIs

```bash
# List all jobs
curl "https://jobintel-backend.onrender.com/api/jobs"

# Get user profile (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://jobintel-backend.onrender.com/api/users/me"

# Upload resume (requires FormData)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf" \
  "https://jobintel-backend.onrender.com/api/resume/upload"
```

---

## 📝 Configuration Files

### netlify.toml

```toml
[build]
  command = "npm ci && npm run build -w frontend"
  publish = "frontend/dist"
  functions = "frontend/netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### render-backend.yaml

```yaml
services:
  - type: web
    name: jobintel-backend
    env: node
    region: oregon
    plan: free
    repo: https://github.com/pritamkumarchegg/job-search.git
    branch: main
    buildCommand: npm ci && npm run build -w backend
    startCommand: npm start --prefix backend
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URI
      - key: JWT_SECRET
      - key: VITE_API_URL
      - key: CORS_ORIGIN
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: jobintel-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    container_name: jobintel-redis
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    container_name: jobintel-backend
    ports:
      - "5000:5000"
    environment:
      MONGO_URI: mongodb://admin:password@mongodb:27017/jobintel
      JWT_SECRET: your-jwt-secret-key
      NODE_ENV: production
      CORS_ORIGIN: http://localhost:8080
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: jobintel-frontend
    ports:
      - "8080:80"
    environment:
      VITE_API_URL: http://backend:5000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongo-data:

networks:
  default:
    name: jobintel-network
```

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error: "Cannot find module 'pdf-parse'"**
- Solution: Run `npm install` in backend directory
- Or: Rebuild Docker image with `docker-compose build --no-cache backend`

**Error: "MONGO_URI not configured"**
- Solution: Add `MONGO_URI` environment variable
- Format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

**Error: "CORS error"**
- Solution: Update `CORS_ORIGIN` to match frontend URL
- Render: `https://jobintel.netlify.app`
- Local: `http://localhost:8080`

### Frontend Won't Load

**Error: "Cannot reach backend"**
- Solution: Update `VITE_API_URL` environment variable
- Check: Backend is running and accessible
- Test: `curl https://your-backend-url/api/health`

**Error: "Blank page"**
- Solution: Check browser console for errors
- Clear cache: Ctrl+Shift+Delete → All time
- Rebuild: Run `npm run build -w frontend` locally

### Resume Upload Fails

**Error: "Failed to process resume"**
- Solution: Check backend logs for details
- Render: View logs in Render dashboard
- Docker: Run `docker logs jobintel-backend`

**Common issues:**
- File size > 5MB (limit is 5MB)
- File format not PDF or DOCX
- Backend PDF parsing issue

### Database Connection Issues

**Error: "Cannot connect to MongoDB"**
- Check: MongoDB URI is correct
- Check: IP whitelist includes your server IP
- Check: Database user credentials are correct
- Test: Use MongoDB Compass to test connection

---

## 📈 Performance Optimization

### Frontend (Netlify)

```bash
# Enable compression
compression: true

# Cache static assets
cache-control: "public, max-age=31536000, immutable"

# Enable Brotli compression
precompressed: true
```

### Backend (Render)

- Use **Starter** plan for production
- Enable **Auto-scaling**
- Set **Health check** endpoint: `/api/health`
- Configure **Restart policy**: Always

### Database (MongoDB)

- Use **M0 Free** tier for development
- Use **M5** or higher for production
- Enable **Auto-scaling**
- Create **indexes** for frequently queried fields

---

## 🔐 Security Checklist

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Enable MongoDB IP whitelist
- [ ] Use HTTPS everywhere (Render/Netlify auto-enable)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS_ORIGIN to frontend URL only
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on API
- [ ] Set up monitoring and alerts
- [ ] Regular database backups
- [ ] Keep dependencies updated

---

## 📞 Support & Monitoring

### Monitoring

- **Render**: Built-in logs and metrics
- **Netlify**: Build logs and deployment history
- **MongoDB**: Atlas monitoring dashboard

### Debugging

```bash
# View backend logs
curl https://jobintel-backend.onrender.com/api/logs

# Check health status
curl https://jobintel-backend.onrender.com/api/health

# View frontend build logs
# In Netlify dashboard → Deployments → View logs
```

---

## 🚀 Next Steps

1. **Set up monitoring**: Enable alerts for errors
2. **Configure domain**: Add custom domain
3. **Set up CI/CD**: Automatic deployments on push
4. **Plan scaling**: Consider production plans as traffic grows
5. **User testing**: Beta test with real users

---

**Last Updated**: January 21, 2026  
**Status**: ✅ Production Ready
