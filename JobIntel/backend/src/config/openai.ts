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
 * MASTER PROMPT FOR JOB PARSING (Admin AI Parser)
 * 
 * This prompt instructs OpenAI to parse raw job text and extract:
 * - Job title, company, location
 * - Experience requirements
 * - Tech stack/skills
 * - Apply link (SEPARATE from description)
 * - Job description (WITHOUT the apply link)
 */
export const JOB_PARSING_PROMPT = `You are an expert job parser. Extract structured job information from the provided text.

IMPORTANT: Extract the application/apply link as a SEPARATE field. DO NOT include the link in the description.

Return ONLY a valid JSON object with these exact fields:
{
  "jobTitle": "The job title",
  "company": "Company name",
  "location": "Job location (city, country)",
  "salaryRange": "Salary or 'Not specified'",
  "experienceLevel": "Fresher/0-1 years/Junior/Mid-level/Senior or similar",
  "experienceYears": "Number of years required",
  "employmentType": "Full-time, Part-time, Contract, Internship, etc.",
  "techStack": ["Technology1", "Technology2", ...],
  "requirements": ["Requirement1", "Requirement2", ...],
  "applyUrl": "https://example.com/apply (ONLY the URL, extracted separately)",
  "description": "Full job description WITHOUT the apply link URL"
}

CRITICAL RULES:
1. Extract apply link to applyUrl field only
2. Do NOT include "Application Link:" or URLs in the description
3. Clean up the description - remove newlines, extra spaces
4. Be precise with tech stack
5. Return ONLY valid JSON`;

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
