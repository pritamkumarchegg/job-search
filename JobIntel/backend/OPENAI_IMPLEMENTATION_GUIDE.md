# AI Job Matching System - OpenAI Implementation Guide

## Overview

This document explains where OpenAI is implemented in the AI Job Matching System and describes the master prompts that power the matching engine.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Endpoints                         │
│          (/api/ai/best-fit-jobs, /api/ai/analyze-resume, etc)  │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               AI Matching Controller                              │
│            (aiMatchingController.ts)                             │
│  - getBestFitJobs()                                             │
│  - analyzeResume()                                              │
│  - triggerMatching()                                            │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                          ┌───────────┴────────────┐
                          ▼                        ▼
        ┌──────────────────────────┐  ┌──────────────────────────┐
        │ Resume Analysis Service   │  │ Job Matching Service     │
        │ (aiResumeAnalysisService) │  │ (aiJobMatchingService)   │
        └──────────────────┬───────┘  └──────────────┬───────────┘
                           │                          │
                           └──────────────┬───────────┘
                                          ▼
                    ┌─────────────────────────────────────┐
                    │   OpenAI Configuration File         │
                    │   (config/openai.ts)                │
                    │                                     │
                    │  - OpenAI Client Setup              │
                    │  - RESUME_ANALYSIS_PROMPT           │
                    │  - JOB_MATCHING_PROMPT              │
                    │  - callOpenAI() with retry logic    │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   OpenAI API (gpt-4-turbo)    │
                        │   - Resume Analysis          │
                        │   - Job Matching             │
                        │   - Structured JSON Output   │
                        └───────────────────────┘
```

---

## 1. OpenAI Configuration File

**Location:** `/backend/src/config/openai.ts`

This is the **central hub** for all OpenAI integration. It contains:
- OpenAI client initialization
- Master prompt definitions
- API call wrapper with retry logic for rate limiting

### 1.1 OpenAI Client Setup

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Environment Variable Required:**
```
OPENAI_API_KEY=sk-... (your OpenAI API key)
```

### 1.2 Master Prompts

#### A. RESUME_ANALYSIS_PROMPT

**Purpose:** Extract structured profile information from a user's resume

**Instructions Sent to OpenAI:**
```
You are an expert resume analyzer. Extract the following information from the resume text and return ONLY valid JSON (no markdown, no explanations):

EXTRACT THIS INFORMATION:
1. extractedSkills: List of technical skills with years of experience and proficiency level
2. softSkills: List of soft skills (communication, leadership, teamwork, etc.)
3. totalExperienceYears: Total years of work experience
4. careerLevel: One of (fresher, junior, mid, senior, lead)
5. preferredRoles: Job titles the person seems suited for
6. preferredLocations: Locations mentioned or implied
7. workModePreference: One of (remote, onsite, hybrid)
8. preferredDomains: Industries or domains (e.g., FinTech, Healthcare, etc.)
9. programmingLanguages: Programming languages with proficiency
10. certifications: Professional certifications

RETURN FORMAT: Valid JSON only, no markdown code blocks
```

**Example Output:**
```json
{
  "extractedSkills": [
    {
      "skill": "JavaScript",
      "yearsOfExperience": 5,
      "proficiency": "expert"
    },
    {
      "skill": "React",
      "yearsOfExperience": 4,
      "proficiency": "advanced"
    }
  ],
  "softSkills": ["Team Leadership", "Communication", "Problem Solving"],
  "totalExperienceYears": 7,
  "careerLevel": "senior",
  "preferredRoles": ["Senior Frontend Developer", "Tech Lead"],
  "preferredLocations": ["San Francisco", "Remote"],
  "workModePreference": "remote",
  "preferredDomains": ["FinTech", "SaaS"],
  "programmingLanguages": [
    {
      "language": "JavaScript",
      "proficiency": "expert"
    }
  ],
  "certifications": ["AWS Solutions Architect"],
  "resumeSummary": "Experienced senior developer with strong JavaScript skills...",
  "salaryExpectation": {
    "min": 150000,
    "max": 200000
  }
}
```

#### B. JOB_MATCHING_PROMPT

**Purpose:** Score and analyze how well a job matches a candidate's profile

**Instructions Sent to OpenAI:**
```
You are an expert recruiter and AI job matcher. Compare the candidate profile against the job description and generate ONLY valid JSON (no markdown, no explanations):

ANALYZE THESE DIMENSIONS (0-100 score each):
1. skillsMatch: How well candidate skills match job requirements
2. roleMatch: How well the job role matches candidate's preferred roles
3. experienceMatch: How well candidate's experience level matches job requirements
4. locationMatch: How well job location matches candidate preferences
5. companyScore: How well job aligns with candidate career goals

GENERATE ANALYSIS (8 sections):
1. topReasons: Why this is a good match (3-5 points)
2. skillGaps: What skills candidate needs to develop
3. strengths: What candidate excels at that fits this role
4. concerns: Potential concerns or mismatches
5. nextSteps: What candidate should do to prepare
6. interviewTips: Specific tips for interviewing at this company
7. summary: One sentence summary of overall fit
8. overallScore: Final match score (0-100)

RETURN FORMAT: Valid JSON only, no markdown code blocks
```

**Example Output:**
```json
{
  "skillsScore": 85,
  "roleScore": 90,
  "experienceScore": 80,
  "locationScore": 100,
  "companyScore": 75,
  "overallScore": 86,
  "topReasons": [
    "5+ years JavaScript experience matches senior-level requirements",
    "Strong React background aligns with tech stack",
    "Remote work preference matches company policy",
    "SaaS domain experience relevant to company's market"
  ],
  "skillGaps": [
    "TypeScript - mentioned in job but not in resume",
    "GraphQL - nice to have but candidate lacks direct experience"
  ],
  "strengths": [
    "Exceeded years of experience (7 vs 5 required)",
    "Strong communication skills from tech lead role",
    "Experience with distributed teams"
  ],
  "concerns": [
    "Different tech stack (Vue vs React is not mentioned but implied)",
    "Limited AWS experience but role requires some"
  ],
  "nextSteps": [
    "Learn GraphQL basics before interview",
    "Prepare to discuss AWS project experience",
    "Research company's product and market"
  ],
  "interviewTips": [
    "Ask about mentorship opportunities for team leads",
    "Discuss scaling strategies for their platform"
  ],
  "summary": "Excellent candidate match (86%) - strong technical fit with one year growth opportunity in GraphQL",
  "thinkingProcess": "..."
}
```

---

## 2. Service Layer Implementation

### 2.1 Resume Analysis Service

**File:** `/backend/src/services/aiResumeAnalysisService.ts`

**Key Functions:**
- `analyzeResume(userId, resumeText)` - Analyze a user's resume
- `ensureAIProfile(userId)` - Get or create AI profile (7-day cache)
- `analyzeMultipleUsers(userIds)` - Batch analyze users

**How It Works:**
1. Takes user's resume text as input
2. Calls `callOpenAI(RESUME_ANALYSIS_PROMPT + resume)`
3. Parses JSON response into `AIProfile` object
4. Stores profile in MongoDB with timestamp
5. Creates `AIMatchingSession` to track analysis

### 2.2 Job Matching Service

**File:** `/backend/src/services/aiJobMatchingService.ts`

**Key Functions:**
- `getBestFitJobs(userId, limit)` - Get top matching jobs
- `scoreJobMatch(userId, job, aiProfile)` - Score single job
- `getMatchDetails(userId, jobId)` - Get detailed analysis
- `matchAllUsers(jobId)` - Batch match job against all users

**How It Works:**
1. Gets user's AI profile (or analyzes it first)
2. Fetches all active jobs from database
3. For each job:
   - Formats job data into prompt context
   - Calls `callOpenAI(JOB_MATCHING_PROMPT + context)`
   - Parses response into `JobMatchScore`
   - Rate limits with 500ms delay between jobs
4. Filters scores >= 70, sorts by score
5. Saves matches to MongoDB
6. Returns top 10 matches

### 2.3 Job Matching Trigger Service

**File:** `/backend/src/services/jobMatchingTriggerService.ts`

**Key Functions:**
- `onNewJobPosted(jobId)` - Trigger matching when job is posted
- `matchAllJobs()` - Batch match all jobs
- `sendMatchNotifications(jobId, job)` - Notify matched users
- `getMatchingStats()` - System statistics

---

## 3. API Controller Layer

**File:** `/backend/src/controllers/aiMatchingController.ts`

**Endpoints:**

### Public Endpoints (Require Authentication)

1. **GET `/api/ai/best-fit-jobs/:userId`**
   - Get best-fit jobs for user
   - Query param: `limit` (default: 10, max: 50)

2. **POST `/api/ai/analyze-resume`**
   - Analyze resume and extract profile
   - Body: `{ userId, resumeText }`

3. **POST `/api/ai/trigger-matching/:userId`**
   - Manually trigger matching
   - Returns top 5 matches

4. **GET `/api/ai/match-details/:userId/:jobId`**
   - Get detailed match analysis
   - Returns `JobMatchScore` with full analysis

5. **GET `/api/ai/my-matches/:userId`**
   - Get all saved matches for user
   - Query param: `limit` (default: 50, max: 100)

### Admin Endpoints (Require Admin Auth)

6. **POST `/api/ai/trigger-job-matching/:jobId`**
   - Trigger matching for new job against all users
   - Starts batch operation

7. **GET `/api/ai/matching-stats`**
   - Get system statistics
   - Returns: totalJobs, totalUsers, totalMatches, avgScore, topMatches

8. **POST `/api/ai/match-all-jobs`**
   - Batch match ALL jobs against ALL users
   - Background operation (returns immediately)

9. **POST `/api/ai/cleanup-matches`**
   - Cleanup old matches (>30 days)
   - Admin only

---

## 4. Routes File

**File:** `/backend/src/routes/aiMatching.ts`

All endpoints are registered here with proper authentication middleware.

**Route Registration in `/backend/src/index.ts`:**
```typescript
import aiMatchingRoutes from './routes/aiMatching';
app.use('/api/ai', aiMatchingRoutes);
```

---

## 5. OpenAI API Call Wrapper

**Function:** `callOpenAI()` in `/config/openai.ts`

**Features:**
- Automatic retry logic for rate limiting (3 attempts)
- Exponential backoff (1s, 2s, 4s between retries)
- Handles 429 (rate limit) errors gracefully
- Logs all API calls for debugging
- Returns parsed JSON response

**Example Usage:**
```typescript
const response = await callOpenAI(
  RESUME_ANALYSIS_PROMPT + "\n\nRESUME:\n" + resumeText
);

const aiProfile = JSON.parse(response);
```

---

## 6. Data Flow Example

### Example: Get Best-Fit Jobs

```
1. User hits: GET /api/ai/best-fit-jobs/user123

2. Controller receives request:
   - aiMatchingController.getBestFitJobs('user123')

3. Service ensures AI profile exists:
   - aiResumeAnalysisService.ensureAIProfile('user123')
   - If cached and fresh (< 7 days): use it
   - Otherwise: call analyzeResume() → calls OpenAI → stores in DB

4. Get AI Profile Response:
   {
     extractedSkills: [...],
     preferredRoles: ['Senior Developer'],
     careerLevel: 'senior',
     ...
   }

5. Fetch Active Jobs:
   - Query MongoDB for 100 active jobs

6. Score Each Job:
   - For each job:
     - Call callOpenAI(JOB_MATCHING_PROMPT + job context + user context)
     - Parse response → get score (0-100)
     - Wait 500ms (rate limiting)

7. Filter & Sort:
   - Keep only scores >= 70
   - Sort by score descending
   - Return top 10

8. Save to Database:
   - Insert/update JobMatch records

9. Return Response:
   {
     success: true,
     data: {
       userId: 'user123',
       jobCount: 8,
       jobs: [
         {
           jobId: 'job1',
           jobTitle: 'Senior Developer',
           company: 'TechCorp',
           matchScore: 92,
           dimensionalScores: {...},
           analysis: {...}
         },
         ...
       ]
     }
   }
```

---

## 7. Environment Setup

**.env file requirements:**
```
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo

# MongoDB
MONGODB_URI=mongodb+srv://...

# Redis (for job queues)
REDIS_URL=redis://...
```

---

## 8. Model Relationships

```
User
├── aiProfile: AIProfile
│   ├── extractedSkills: []
│   ├── softSkills: []
│   ├── totalExperienceYears: number
│   └── ...
└── resume: { rawText, uploadedAt, ... }

Job
├── title: string
├── company: string
├── description: string
├── requiredSkills: []
├── location: string
└── ...

JobMatch
├── userId: string (ref User)
├── jobId: string (ref Job)
├── matchScore: number (0-100)
├── dimensionalScores: { skillsMatch, roleMatch, ... }
├── analysis: { topReasons, skillGaps, strengths, ... }
└── matchedAt: Date

AIMatchingSession
├── userId: string
├── sessionType: 'resumeAnalysis' | 'jobMatching'
├── status: 'processing' | 'completed' | 'failed'
├── resumeAnalysisResult: {...}
├── jobMatchingResult: {...}
├── openaiTokensUsed: number
└── completedAt: Date
```

---

## 9. Rate Limiting & Retry Logic

**OpenAI API Limits:** ~3,500 requests per minute

**Our Retry Strategy:**
```typescript
async function callOpenAI(prompt: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await openai.chat.completions.create({...});
    } catch (error) {
      if (error.status === 429 && attempt < 3) {
        const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
}
```

**Per-Job Rate Limiting:**
- 500ms delay between job scoring (matches)
- 1s delay between user matching (batch operations)
- 2s delay between job posting events

---

## 10. Cost Estimation

**Per Resume Analysis:**
- Average resume: ~2,000 tokens (input)
- Response: ~1,000 tokens (output)
- Cost: ~0.015 cents (gpt-4-turbo pricing)

**Per Job Match:**
- Input: ~1,500 tokens
- Response: ~800 tokens
- Cost: ~0.011 cents

**Example:**
- 100 users analyzing resumes: ~$1.50
- 100 users × 50 jobs matching: ~$55
- Monthly (1000 matches): ~$165

---

## 11. Testing the System

### Test Resume Analysis
```bash
curl -X POST http://localhost:5000/api/ai/analyze-resume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "user123",
    "resumeText": "10 years of JavaScript experience..."
  }'
```

### Test Get Best-Fit Jobs
```bash
curl http://localhost:5000/api/ai/best-fit-jobs/user123?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

### Test Trigger Matching for Job
```bash
curl -X POST http://localhost:5000/api/ai/trigger-job-matching/job123 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 12. Troubleshooting

### Issue: "Rate limit exceeded"
**Solution:** The system retries 3 times automatically. If still failing, wait a few minutes and try again.

### Issue: "Invalid OpenAI response"
**Solution:** OpenAI returned non-JSON response. Check:
- Prompt formatting
- Resume/job data encoding
- OpenAI API status

### Issue: Matches not being saved
**Solution:** Check:
- MongoDB connection
- User has AI profile
- Jobs exist in database

### Issue: High API costs
**Solution:**
- Enable caching (7-day profile cache)
- Batch process during off-peak hours
- Use cheaper model (gpt-3.5-turbo) for high-volume

---

## Summary

The OpenAI implementation is **centralized in `/config/openai.ts`** with:
- Master prompt definitions for resume analysis and job matching
- Retry logic for rate limiting
- Structured JSON output parsing

The system flows through:
1. **Controller** → Receives HTTP requests
2. **Services** → Business logic (analysis, matching, triggering)
3. **OpenAI Config** → Calls OpenAI API with master prompts
4. **Database** → Stores results

All endpoints require authentication and are rate-limited to prevent abuse.
