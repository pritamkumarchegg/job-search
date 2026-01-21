import OpenAI from 'openai';
import { logger } from '../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openaiConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
  maxTokens: 2000,
  temperature: 0.7,
};

/**
 * MASTER PROMPT FOR RESUME ANALYSIS
 * 
 * This prompt instructs OpenAI to analyze a resume and extract:
 * - Technical skills with proficiency levels
 * - Soft skills
 * - Years of experience
 * - Career level (fresher, junior, mid, senior, lead)
 * - Preferred roles and locations
 * - Work mode preferences
 * - Domain interests
 */
export const RESUME_ANALYSIS_PROMPT = `You are an expert recruiter and career coach analyzing professional resumes. 

Extract and analyze the following from the resume provided:

1. TECHNICAL SKILLS: List all programming languages, frameworks, tools, databases, platforms
2. SOFT SKILLS: Communication, leadership, teamwork, problem-solving, etc.
3. EXPERIENCE: 
   - Total years of experience
   - Years in current role
   - Career level (fresher/junior/mid/senior/lead)
4. ROLES: What job roles has the candidate held? What roles would they likely excel in?
5. LOCATIONS: What locations has the candidate worked from? What are preferred locations?
6. WORK MODE: Remote, hybrid, onsite preferences based on experience
7. DOMAINS: What industries/domains has the candidate worked in? What are interests?
8. LANGUAGES: Programming languages ranked by proficiency (expert/advanced/intermediate/beginner)
9. CERTIFICATIONS: Any relevant certifications or achievements
10. SUMMARY: 1-2 sentence professional summary

Important: Be precise and specific. If information is not in resume, mark as "not specified".

Return ONLY a valid JSON object with these exact fields:
{
  "extractedSkills": [
    { "skill": "React", "yearsOfExperience": 3, "proficiency": "advanced" },
    ...
  ],
  "softSkills": ["Communication", "Leadership", ...],
  "totalExperienceYears": 5,
  "careerLevel": "mid",
  "preferredRoles": ["Full Stack Developer", "Backend Engineer"],
  "preferredLocations": ["Bangalore", "Hyderabad", "India"],
  "workModePreference": "hybrid",
  "preferredDomains": ["SaaS", "FinTech"],
  "programmingLanguages": [
    { "language": "JavaScript", "proficiency": "expert" },
    ...
  ],
  "certifications": ["AWS Solutions Architect", ...],
  "resumeSummary": "Experienced full stack developer with 5 years...",
  "salaryExpectation": { "min": 500000, "max": 1500000 }
}`;

/**
 * MASTER PROMPT FOR JOB MATCHING
 * 
 * This prompt instructs OpenAI to:
 * - Analyze job requirements
 * - Compare with candidate profile
 * - Generate match score (0-100)
 * - Provide detailed reasoning
 * - Identify skill gaps and strengths
 */
export const JOB_MATCHING_PROMPT = `You are an expert recruiter matching candidates to jobs.

Analyze the following:

CANDIDATE PROFILE:
{candidate_profile}

JOB DESCRIPTION:
{job_description}

Provide a detailed matching analysis in JSON format:

{
  "totalScore": <0-100 number>,
  "skillsAlignment": <0-100 score for technical skills match>,
  "roleAlignment": <0-100 score for job title/role match>,
  "experienceAlignment": <0-100 score for experience level>,
  "locationAlignment": <0-100 score for location preference>,
  "companyFit": <0-100 score for cultural/domain fit>,
  
  "topReasons": [
    "Reason 1 why this is a good fit",
    "Reason 2",
    "Reason 3"
  ],
  
  "skillGaps": [
    "Skill 1 that candidate is missing",
    "Skill 2 that is required but candidate lacks"
  ],
  
  "strengths": [
    "Strength 1 relevant to this role",
    "Strength 2 candidate brings"
  ],
  
  "concerns": [
    "Concern 1 about the fit",
    "Concern 2 or blocker"
  ],
  
  "recommendedNextSteps": [
    "Action 1 candidate should take",
    "Action 2 to prepare for this role"
  ],
  
  "interviewTips": [
    "Tip 1 for interview preparation",
    "Tip 2 emphasizing strengths"
  ],
  
  "summary": "1-2 sentence overall assessment of fit"
}

IMPORTANT:
- Be thorough but realistic
- Consider experience level carefully
- Look at domain/industry fit
- Consider location and work preferences
- Provide ONLY valid JSON, no markdown, no explanations`;

/**
 * Call OpenAI API with retry logic
 */
export async function callOpenAI(
  userPrompt: string,
  systemPrompt: string = '',
  options: any = {}
): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        max_tokens: options.maxTokens || openaiConfig.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : openaiConfig.temperature,
        messages: [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          {
            role: 'user' as const,
            content: userPrompt,
          },
        ],
      });

      if (!response.choices[0]?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      logger.info('OpenAI API call successful', {
        model: openaiConfig.model,
        tokensUsed: response.usage?.total_tokens,
      });

      return response.choices[0].message.content;
    } catch (error: any) {
      lastError = error;
      const statusCode = error.status || 0;

      // Rate limit error - wait and retry
      if (statusCode === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000);
        logger.warn(`Rate limited by OpenAI. Waiting ${waitTime}ms before retry`, {
          attempt: attempt + 1,
          maxRetries,
        });
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Other errors
      logger.error(`OpenAI API error (attempt ${attempt + 1}/${maxRetries}):`, {
        error: error.message,
        statusCode,
      });

      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Failed to call OpenAI API after retries');
}

export default openai;
