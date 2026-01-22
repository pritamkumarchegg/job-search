# 🏗️ Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AllJobsPage Component                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Search Bar (by title, company, location)       │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  Filter Section (4 Filters)                    │ │   │
│  │  │  ├── 🇮🇳 Country (NEW - Default: India)        │ │   │
│  │  │  ├── 📍 Location                               │ │   │
│  │  │  ├── 🏢 Companies                              │ │   │
│  │  │  └── 💼 Job Type + Remote Only                │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  Job Cards (15 per page)                       │ │   │
│  │  │  ├── Job Title & Company                       │ │   │
│  │  │  ├── Location & Job Type                       │ │   │
│  │  │  ├── [Apply Now] Button                        │ │   │
│  │  │  │  ├─ Not Auth → Shows AuthRequiredModal     │ │   │
│  │  │  │  └─ Auth → Opens link directly             │ │   │
│  │  │  └── [Details] Button                         │ │   │
│  │  │     ├─ Not Auth → Shows AuthRequiredModal     │ │   │
│  │  │     └─ Auth → Opens JobDetailPage            │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  Pagination Controls                          │ │   │
│  │  │  ├── Previous                                 │ │   │
│  │  │  ├── Page 1 of N                              │ │   │
│  │  │  └── Next                                     │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  AuthRequiredModal (Conditional)               │ │   │
│  │  │  ├── Job Title: "[Job Title]"                  │ │   │
│  │  │  ├── Message: Sign in to apply                │ │   │
│  │  │  ├── Benefits List                            │ │   │
│  │  │  └── Buttons: Maybe Later|Create|Sign In      │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓ FETCH
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js)                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ GET /api/jobs?limit=5000                            │    │
│  │                                                      │    │
│  │ Returns: Array of Job Objects with:                │    │
│  │ ├── _id, title, location, country (or meta)        │    │
│  │ ├── applyUrl, description, status                  │    │
│  │ ├── meta.rawData (company, employment_type, etc)   │    │
│  │ └── ... (and other job details)                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                         ↓ QUERY                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │             MongoDB Database                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Jobs Collection                             │    │    │
│  │  │ ├── _id: ObjectId                           │    │    │
│  │  │ ├── title: String                           │    │    │
│  │  │ ├── location: String                        │    │    │
│  │  │ ├── country: String (NEW) - Default 'India'│    │    │
│  │  │ ├── meta: Mixed                             │    │    │
│  │  │ │   └── rawData.job_country: String         │    │    │
│  │  │ └── ... (other fields)                      │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─ User Visits /all-jobs ─┐
│                         │
│  (React Router)         │
│         ↓               │
│  AllJobsPage Component  │
│         │               │
│         ├─ useEffect()  ├─ Fetch /api/jobs
│         │   onMount()   │
│         │               │
│         ├─ [allJobs]    ├─ Backend returns array
│         │   state       │
│         │               │
│         ├─ useState()   ├─ Filters: [Country, Location, Company, JobType]
│         │               ├─ Default: selectedCountries = ['India']
│         │               │
│         └─ useMemo()    ├─ Extract countries from:
│            (filter)     │  1. job.country field
│                         │  2. meta.rawData.job_country
│                         │  3. Parse location string
│                         │  4. Default to 'India'
│                         │
│         ↓               ├─ Filter jobs by selectedCountries
│    [filteredJobs]       ├─ Apply other filters
│         │               ├─ Search query matching
│         │               ├─ Pagination
│         │               │
│         ↓               │
│   UI Rendering          ├─ Show country dropdown with flag emojis
│    ├── Country filter   │  (🇮🇳 India, 🇺🇸 USA, 🇬🇧 UK, ...)
│    ├── Jobs list        │
│    ├── Apply buttons    ├─ Check isAuthenticated
│    │   ├─ Auth → Open link directly
│    │   └─ Not Auth → Show AuthRequiredModal
│    └── Details buttons  │
│        ├─ Auth → Link to JobDetailPage
│        └─ Not Auth → Show AuthRequiredModal
│                         │
└─────────────────────────┘
```

## Country Extraction Logic

```
For Each Job:
├─ Check job.country field
│  └─ if exists → Use it
│     else ↓
├─ Check job.meta.rawData.job_country
│  └─ if exists → Use it
│     else ↓
├─ Parse job.location string
│  └─ Format: "City, State, COUNTRY"
│     ├─ Extract last part: "COUNTRY"
│     ├─ Normalize: US → USA, GB → UK, IN → India
│     └─ Use normalized value
│        else ↓
└─ Default: 'India'

Examples:
├─ "Cary, North Carolina, US" → "USA"
├─ "New York, New York, US" → "USA"
├─ "London, England, UK" → "UK"
├─ "Bangalore, Karnataka, India" → "India"
└─ job.country = "India" → "India" (direct)
```

## Filter Combination Logic

```
All Filters Apply (AND Logic):
┌─────────────────────────────────────────────────┐
│  Filter Conditions Combined:                    │
│  ├─ Search query (title, company, location)  AND
│  ├─ Country filter (selectedCountries[])     AND
│  ├─ Location filter (selectedLocations[])    AND
│  ├─ Company filter (selectedCompanies[])     AND
│  ├─ Job Type filter (selectedJobTypes[])     AND
│  └─ Remote filter (remoteOnly boolean)       AND
│                                               │
│  Result: jobs where ALL conditions match      │
│  (if any filter empty, that filter is skipped)│
└─────────────────────────────────────────────────┘

Example:
├─ Country = ['India', 'USA'] (selected both)
├─ Location = ['New York', 'Bangalore'] (selected)
├─ Company = [] (none selected - skip this filter)
├─ JobType = ['Full-time'] (selected)
├─ Search = 'developer' (entered)
│
└─ Result: Jobs matching ALL of:
   ├─ Country in ['India', 'USA']
   ├─ Location in ['New York', 'Bangalore']
   ├─ Employment type = 'Full-time'
   └─ Title/Company/Location contains 'developer'
```

## Authentication Modal Flow

```
┌─ User Not Logged In ─┐
│                      │
│  Visits /all-jobs    │
│  Sees job cards      │
│                      │
│  Clicks "Apply Now"  │
│       ↓              │
│  Check isAuthenticated
│       │              │
│       NO ↓           │
│                      │
│  onClick handler     │
│  ├─ setAuthModalOpen(true)
│  ├─ setSelectedJobForAuth({id, title})
│       │              │
│       ↓              │
│  <AuthRequiredModal> │
│  ├─ isOpen: true     │
│  ├─ jobTitle: "iOS Developer"
│  ├─ Message: "Sign in to apply for iOS Developer"
│  ├─ Benefits displayed
│  ├─ Buttons:        │
│  │  ├─ Maybe Later  │ → Close modal
│  │  ├─ Create       │ → Navigate to /register
│  │  └─ Sign In      │ → Navigate to /login
│  │                  │
│  └─ After Auth ✓   │
│     └─ Can Apply ✓  │
└──────────────────────┘
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRODUCTION                          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Netlify (Frontend)                              │ │
│  │  ├─ Repository: pritamkumarchegg/job-search    │ │
│  │  ├─ Build: npm run build -w frontend           │ │
│  │  ├─ Publish: frontend/dist                     │ │
│  │  ├─ URL: https://jobintel.netlify.app         │ │
│  │  └─ ENV: VITE_API_URL=render-backend-url      │ │
│  └──────────────────────────────────────────────────┘ │
│                          ↓ API Calls                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Render (Backend)                                │ │
│  │  ├─ Repository: pritamkumarchegg/job-search    │ │
│  │  ├─ Build: npm run build -w backend            │ │
│  │  ├─ Start: npm start --prefix backend          │ │
│  │  ├─ Port: 5000                                 │ │
│  │  ├─ URL: https://jobintel-backend.onrender.com│ │
│  │  └─ ENV: MONGO_URI, JWT_SECRET, Razorpay keys│ │
│  └──────────────────────────────────────────────────┘ │
│                          ↓ Database Queries            │
│  ┌──────────────────────────────────────────────────┐ │
│  │  MongoDB Atlas (Cloud Database)                  │ │
│  │  ├─ Cluster: jobintel-prod                     │ │
│  │  ├─ Database: job_search                       │ │
│  │  ├─ Collections: Jobs, Users, UsageTracking    │ │
│  │  └─ Connection: MONGO_URI from Render env      │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## State Management

```
AllJobsPage Component State:

┌─ Filter State ──────────────────────┐
│ ├─ [allJobs]: Job[]                │
│ ├─ [searchQuery]: string            │
│ ├─ [selectedCountries]: string[]    │ ← DEFAULT: ['India']
│ ├─ [selectedLocations]: string[]    │
│ ├─ [selectedCompanies]: string[]    │
│ ├─ [selectedJobTypes]: string[]     │
│ ├─ [remoteOnly]: boolean            │
│ └─ [showFilters]: boolean           │
└─────────────────────────────────────┘
           ↓ useMemo (filteredJobs)
┌─ Computed State ────────────────────┐
│ ├─ [countries]: extracted & sorted  │
│ ├─ [locations]: extracted & sorted  │
│ ├─ [companies]: extracted & sorted  │
│ ├─ [jobTypes]: extracted & sorted   │
│ ├─ [filteredJobs]: filtered array   │
│ ├─ [paginatedJobs]: page slice      │
│ └─ [totalPages]: calculated         │
└─────────────────────────────────────┘
           ↓ Auth State (from store)
┌─ Authentication State ──────────────┐
│ ├─ [isAuthenticated]: boolean       │
│ ├─ [user]: UserObject | null        │
│ └─ [token]: string | null           │
└─────────────────────────────────────┘
           ↓ Modal State ───────────────┐
│ ├─ [authModalOpen]: boolean         │
│ └─ [selectedJobForAuth]: Job|null   │
└─────────────────────────────────────┘
```

## Component Hierarchy

```
App Component
└─ AllJobsPage
   ├─ Header (Gradient background)
   ├─ Search & Filter Card
   │  ├─ Search Input
   │  ├─ Filter Toggle Button
   │  └─ Expandable Filters Section (when visible)
   │     ├─ CountryFilter (NEW)
   │     │  └─ Checkbox list of countries
   │     ├─ LocationFilter
   │     │  └─ Checkbox list of locations
   │     ├─ CompanyFilter
   │     │  └─ Checkbox list of companies
   │     ├─ JobTypeFilter
   │     │  ├─ Checkbox list of job types
   │     │  └─ Remote Only checkbox
   │     └─ Reset Button
   │
   ├─ Jobs List or Empty State
   │  ├─ Job Card (repeating)
   │  │  ├─ Job Title (link to detail)
   │  │  ├─ Company & Location info
   │  │  ├─ Status & Job Type badges
   │  │  ├─ Description preview
   │  │  ├─ [Apply Now] Button
   │  │  │  └─ JobApplyBlocker wrapper
   │  │  └─ [Details] Button
   │  │     ├─ Link to detail page (if auth)
   │  │     └─ Modal trigger (if not auth)
   │  │
   │  └─ AuthRequiredModal (conditional)
   │     ├─ Header with icon
   │     ├─ Job title & message
   │     ├─ Benefits list
   │     └─ Action buttons
   │
   └─ Pagination Controls
      ├─ Previous button
      ├─ Current page info
      └─ Next button
```

## Key Technical Decisions

```
1. Country Extraction Strategy:
   └─ Multiple fallback sources to handle various data formats
      ├─ Direct field (job.country)
      ├─ Metadata field (meta.rawData.job_country)
      └─ Parse location string

2. Default Country:
   └─ 'India' by default (business requirement)
      ├─ Reduces noise for India-focused users
      ├─ Can still explore USA/UK if interested
      └─ Encourages international expansion

3. Authentication Modal:
   └─ Shown on Apply & Details button clicks
      ├─ Encourages account creation
      ├─ Shows value proposition before signup
      └─ Non-intrusive (Maybe Later button)

4. Filter Combination:
   └─ AND logic for all filters
      ├─ More restrictive (better for precision search)
      ├─ Each filter narrows down results
      └─ Empty filter skipped (optional filtering)

5. Country Sorting:
   └─ Custom order: India → USA → UK → Others
      ├─ India first (default/popular)
      ├─ USA/UK second (common targets)
      └─ Alphabetical for the rest
```

---

**Architecture Last Updated:** January 22, 2026  
**Current Status:** ✅ Production Ready  
**Deployment Target:** Netlify + Render
