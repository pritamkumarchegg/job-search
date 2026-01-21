# AI Job Matching - Quick Reference & OpenAI Master Prompts

## TL;DR - Where Everything Is

### 🎯 OpenAI Implementation Location
**File:** `/backend/src/config/openai.ts`

This single file contains:
- ✅ OpenAI client setup
- ✅ Master prompts (RESUME_ANALYSIS_PROMPT, JOB_MATCHING_PROMPT)
- ✅ API call wrapper with retry logic

### 📞 Master Prompts Explained

#### 1. RESUME_ANALYSIS_PROMPT
**What it does:** Extracts structured information from a resume

**Extracts:**
- Technical skills (React, JavaScript, SQL, etc.)
- Soft skills (communication, leadership, teamwork)
- Total years of experience
- Career level (fresher, junior, mid, senior, lead)
- Preferred job roles
- Preferred locations
- Work mode (remote, onsite, hybrid)
- Preferred domains/industries
- Programming languages & proficiency
- Certifications

**Example:**
```
Input: Resume text about a senior JavaScript developer
Output: 
{
  "extractedSkills": [{"skill": "React", "years": 5, "proficiency": "expert"}],
  "careerLevel": "senior",
  "preferredRoles": ["Senior Frontend", "Tech Lead"],
  "totalExperienceYears": 7,
  ...
}
```

#### 2. JOB_MATCHING_PROMPT
**What it does:** Scores a job against a candidate's profile

**Scores on 5 dimensions (0-100 each):**
1. Skills match - Do they have the required skills?
2. Role match - Does job title match their preferences?
3. Experience match - Is their level right for the job?
4. Location match - Does location work for them?
5. Company fit - Will they like the company/domain?

**Also provides:**
- Top reasons it's a good fit
- Skill gaps they need to learn
- Strengths they bring
- Interview tips
- Next steps to prepare

**Example:**
```
Input: Senior React developer profile + Software Engineer job posting
Output:
{
  "overallScore": 85,
  "skillsAlignment": 90,
  "roleAlignment": 85,
  "topReasons": ["5+ years React", "Senior level experience"],
  "skillGaps": ["GraphQL"],
  "summary": "Great fit - 85% match"
}
```

---

## 📁 Backend Service Structure

```
Express API
    ↓
aiMatchingController.ts (handles HTTP requests)
    ↓
Services:
├── aiResumeAnalysisService.ts → analyzeResume()
├── aiJobMatchingService.ts → getBestFitJobs()
└── jobMatchingTriggerService.ts → onNewJobPosted()
    ↓
config/openai.ts (OpenAI API + master prompts)
    ↓
OpenAI API (gpt-4-turbo)
```

---

## 🔗 API Endpoints

### For Users

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/analyze-resume` | POST | Upload & analyze resume |
| `/api/ai/best-fit-jobs/:userId` | GET | Get 10 best matching jobs |
| `/api/ai/my-matches/:userId` | GET | Get all saved matches |
| `/api/ai/match-details/:userId/:jobId` | GET | Detailed analysis of specific match |
| `/api/ai/trigger-matching/:userId` | POST | Force recheck all jobs |

### For Admin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/trigger-job-matching/:jobId` | POST | When new job posted, match to all users |
| `/api/ai/match-all-jobs` | POST | Match all jobs to all users (background) |
| `/api/ai/matching-stats` | GET | System stats (total jobs, users, matches) |
| `/api/ai/cleanup-matches` | POST | Delete old matches (>30 days) |

---

## 📊 How It Works - Step by Step

### When User Uploads Resume
1. **User** → POST `/api/ai/analyze-resume` with resume text
2. **Controller** → Calls `aiResumeAnalysisService.analyzeResume()`
3. **Service** → Calls `callOpenAI(RESUME_ANALYSIS_PROMPT + resume)`
4. **OpenAI** → Returns JSON with extracted profile
5. **Service** → Stores in DB under `User.aiProfile`
6. **API** → Returns extracted data to user

### When User Requests Best-Fit Jobs
1. **User** → GET `/api/ai/best-fit-jobs/user123`
2. **Controller** → Calls `aiJobMatchingService.getBestFitJobs(user123)`
3. **Service** → Gets user's AI profile (cached 7 days)
4. **Service** → Fetches all 100 active jobs
5. **Service** → For each job:
   - Calls `callOpenAI(JOB_MATCHING_PROMPT + job context + user context)`
   - Gets score 0-100
   - Waits 500ms (rate limiting)
6. **Service** → Filters scores ≥ 70, sorts by score, returns top 10
7. **API** → Returns list to user with scores and analysis

### When New Job Posted
1. **Admin** → Job posted via crawling/API
2. **Service** → `jobMatchingTriggerService.onNewJobPosted(jobId)` triggered
3. **Service** → Calls `aiJobMatchingService.matchAllUsers(jobId)`
4. **Service** → For each user with resume:
   - Gets their AI profile
   - Scores the job against them
   - If score ≥ 75, creates JobMatch record
5. **Service** → Sends notifications for high matches
6. **Users** → Get alerts about new matching jobs

---

## 🔑 Key Configuration

**Environment Variables Needed:**
```
OPENAI_API_KEY=sk-...  # Your OpenAI API key
OPENAI_MODEL=gpt-4-turbo  # Model to use
```

**Rate Limits (Built-in):**
- 500ms between job matches (prevents rate limiting)
- 1s between batch operations
- 3 automatic retries on 429 errors (rate limit)
- 2s backoff between retries

**Costs:**
- Resume analysis: ~$0.015 per user
- Job matching: ~$0.011 per match
- Example: 100 users × 50 jobs = ~$55

---

## 💾 Database Models

```
User
└── aiProfile: {
    extractedSkills: [],
    softSkills: [],
    totalExperienceYears: number,
    careerLevel: string,
    preferredRoles: [],
    preferredLocations: [],
    workModePreference: string,
    preferredDomains: [],
    programmingLanguages: [],
    certifications: [],
    resumeSummary: string,
    salaryExpectation: {min, max}
}

JobMatch
├── userId: string
├── jobId: string
├── matchScore: number (0-100)
├── dimensionalScores: {skillsMatch, roleMatch, experienceMatch, locationMatch, companyFit}
├── analysis: {topReasons, skillGaps, strengths, concerns, nextSteps, interviewTips, summary}
└── matchedAt: Date
```

---

## 🚀 Quick Start for Developers

### 1. Setup OpenAI
```typescript
// Already in config/openai.ts
import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

### 2. Use Resume Analysis
```typescript
import { aiResumeAnalysisService } from './services/aiResumeAnalysisService';

// Analyze a resume
const profile = await aiResumeAnalysisService.analyzeResume(
  userId, 
  resumeText
);
// Returns: AIProfile with extracted info
```

### 3. Use Job Matching
```typescript
import { aiJobMatchingService } from './services/aiJobMatchingService';

// Get best-fit jobs for user
const matches = await aiJobMatchingService.getBestFitJobs(userId, 10);
// Returns: JobMatchScore[] with scores and analysis
```

### 4. Trigger Matching for New Job
```typescript
import { jobMatchingTriggerService } from './services/jobMatchingTriggerService';

// When new job posted
await jobMatchingTriggerService.onNewJobPosted(jobId);
// Automatically matches against all users and sends notifications
```

---

## 🧪 Test the API

```bash
# Test resume analysis
curl -X POST http://localhost:5000/api/ai/analyze-resume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user123",
    "resumeText": "10 years JavaScript, React expert, senior developer..."
  }'

# Test get best-fit jobs
curl http://localhost:5000/api/ai/best-fit-jobs/user123?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test trigger job matching (admin)
curl -X POST http://localhost:5000/api/ai/trigger-job-matching/job123 \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Test stats
curl http://localhost:5000/api/ai/matching-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🛠️ File Reference

| File | Purpose |
|------|---------|
| `config/openai.ts` | OpenAI setup + master prompts |
| `services/aiResumeAnalysisService.ts` | Extract skills from resume |
| `services/aiJobMatchingService.ts` | Score jobs for users |
| `services/jobMatchingTriggerService.ts` | Auto-match new jobs |
| `controllers/aiMatchingController.ts` | HTTP request handlers |
| `routes/aiMatching.ts` | API route definitions |
| `index.ts` | Express app (routes registered here) |

---

## 📝 Master Prompt Details

### RESUME_ANALYSIS_PROMPT Structure
```
Extract these 10 things from resume:
1. Technical skills (with years & proficiency)
2. Soft skills
3. Total experience years
4. Career level
5. Preferred roles
6. Preferred locations
7. Work mode preference
8. Preferred domains
9. Programming languages (with proficiency)
10. Certifications & summary

Return ONLY valid JSON (no markdown).
```

### JOB_MATCHING_PROMPT Structure
```
Compare this candidate profile against this job.

Generate:
1. Skills match score (0-100)
2. Role match score (0-100)
3. Experience match score (0-100)
4. Location match score (0-100)
5. Company fit score (0-100)

Plus analysis:
- Top reasons (array)
- Skill gaps (array)
- Strengths (array)
- Concerns (array)
- Next steps (array)
- Interview tips (array)
- Overall summary (string)
- Overall score (0-100)

Return ONLY valid JSON (no markdown).
```

---

## ⚡ Performance Tips

1. **Cache profiles** - 7-day cache built-in (same user won't be re-analyzed)
2. **Rate limit** - 500ms between job scores prevents OpenAI rate limits
3. **Batch processing** - `matchAllJobs()` runs in background
4. **Cleanup** - Auto-delete matches older than 30 days
5. **Monitoring** - Use `/api/ai/matching-stats` to check system load

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Rate limit exceeded" | Wait a few minutes, automatic retry happens 3x |
| "Invalid JSON response" | Check prompt formatting, resume encoding |
| No matches found | Check if jobs exist, user has resume, OpenAI key valid |
| High costs | Enable profile caching (already done), batch at night |
| Slow responses | Profile cache is working, first request takes 20-30s |

---

## Summary

**OpenAI is centralized in: `/config/openai.ts`**

**Two master prompts:**
1. **RESUME_ANALYSIS_PROMPT** → Extract profile from resume
2. **JOB_MATCHING_PROMPT** → Score jobs against profile

**Three core services:**
1. Resume analysis (extract skills)
2. Job matching (score jobs)
3. Job trigger (match new jobs to users)

**All integrated with Express API via routes/controllers**

Start using by hitting the endpoints! 🚀
