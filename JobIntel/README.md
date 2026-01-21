# JobIntel - AI-Powered Job Matching Platform

**Status**: ✅ Production Ready  
**Latest**: Resume upload fixed, Mobile responsive, Deployment guides added

## 📋 Quick Links

- 🚀 **[Deployment Guide](../DEPLOYMENT.md)** - Deploy to Render + Netlify
- 📱 **[Mobile Responsive Guide](../MOBILE_RESPONSIVE_COMPLETE.md)** - All pages responsive
- 🐳 **[Docker Guide](#docker-deployment)** - Self-hosted deployment
- 🔧 **[Setup Guide](#editing-and-running-locally)** - Local development

---

## 🎯 Project Overview

JobIntel is a full-stack AI-powered job matching platform that:
- ✅ Scrapes jobs from multiple sources
- ✅ Parses user resumes using AI
- ✅ Matches jobs using 6-factor algorithm
- ✅ Sends notifications (Email, Telegram, WhatsApp)
- ✅ Admin dashboard for job management
- ✅ User dashboard for applications
- ✅ Fully mobile responsive

## 📁 Repository Structure

```
job-search/
├── JobIntel/
│   ├── frontend/          → React + Vite + TypeScript
│   ├── backend/           → Express + Node.js + TypeScript
│   ├── types/             → Shared TypeScript types
│   ├── database/          → MongoDB migrations
│   ├── docker-compose.yml → Local deployment
│   ├── netlify.toml       → Netlify frontend config
│   └── render-backend.yaml→ Render backend config
├── DEPLOYMENT.md          → Production deployment guide
├── MOBILE_RESPONSIVE_COMPLETE.md
└── README.md
```

## 🚀 Quick Start

### 1. Local Development (5 minutes)

```bash
# Clone and setup
git clone https://github.com/pritamkumarchegg/job-search.git
cd job-search/JobIntel
npm install

# Start dev server (frontend + backend)
npm run dev

# App runs at: http://localhost:8080
# API runs at: http://localhost:5000
```

### 2. Docker Deployment (10 minutes)

```bash
cd job-search/JobIntel
docker-compose up -d

# Frontend: http://localhost:8080
# Backend: http://localhost:5000
```

### 3. Production Deployment (Render + Netlify)

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete guide.

---

## 🔧 Technologies

### Frontend
- ✅ React 18 + TypeScript
- ✅ Vite (fast build tool)
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ Responsive design (mobile-first)

### Backend
- ✅ Node.js + Express
- ✅ TypeScript
- ✅ MongoDB (Atlas)
- ✅ Redis (caching)
- ✅ JWT Authentication
- ✅ PDF parsing (pdfjs-dist)

### Infrastructure
- ✅ Docker & Docker Compose
- ✅ GitHub Actions (CI/CD)
- ✅ Render (backend hosting)
- ✅ Netlify (frontend hosting)
- ✅ MongoDB Atlas (database)

---

## 📋 Monorepo Commands

### Install & Setup
```bash
npm install
npm run install:all
```

### Development
```bash
npm run dev
npm run dev -w frontend
npm run dev -w backend
```

### Building
```bash
npm run build
npm run build -w frontend
npm run build -w backend
```

---

## 🐳 Docker Deployment

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🔐 Required Environment Variables

**Backend:**
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobintel
JWT_SECRET=your-32-char-secret-key
VITE_API_URL=https://api.yourdomain.com
CORS_ORIGIN=https://your-frontend-url
NODE_ENV=production
```

**Frontend:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## ✅ Features

- ✅ Job scraping & browsing
- ✅ Resume parsing (PDF/DOCX)
- ✅ AI job matching
- ✅ User & admin dashboards
- ✅ Email/Telegram/WhatsApp notifications
- ✅ Fully mobile responsive
- ✅ Docker deployment ready

---

## 📱 Mobile Responsive

All pages fully responsive:
- ✅ Mobile (320px-640px)
- ✅ Tablet (641px-1024px)
- ✅ Desktop (1025px+)

See [MOBILE_RESPONSIVE_COMPLETE.md](../MOBILE_RESPONSIVE_COMPLETE.md)

---

## 🚀 Recent Fixes

### v1.4.0 - January 21, 2026
- ✅ **Fixed Resume Upload** - Now uses pdfjs-dist for reliable PDF parsing
- ✅ **Mobile Responsive** - All pages optimized for all screen sizes
- ✅ **Deployment Guides** - Complete Render + Netlify setup

### How to Test Resume Upload:
1. Login to app
2. Go to Profile → Upload Resume
3. Upload a PDF or DOCX file
4. Verify skills are extracted

---

## 📚 Documentation

- [Deployment Guide](../DEPLOYMENT.md)
- [Mobile Responsiveness](../MOBILE_RESPONSIVE_COMPLETE.md)
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)

---

## 🔐 Security

- ✅ JWT authentication
- ✅ CORS protection
- ✅ Environment variables for secrets
- ✅ Database injection prevention
- ✅ XSS protection
- ✅ HTTPS enforced (production)

---

## 📄 License

MIT License

---

**Status**: 🟢 Production Ready | **Last Updated**: January 21, 2026
