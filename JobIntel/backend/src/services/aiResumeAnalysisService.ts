import { logger } from '../utils/logger';
import { User } from '../models/User';
import AIMatchingSession from '../models/AIMatchingSession';
import { callOpenAI, RESUME_ANALYSIS_PROMPT } from '../config/openai';

export interface AIProfile {
  userId: string;
  extractedSkills: Array<{ skill: string; yearsOfExperience: number; proficiency: string }>;
  softSkills: string[];
  totalExperienceYears: number;
  careerLevel: string;
  preferredRoles: string[];
  preferredLocations: string[];
  workModePreference: string;
  programmingLanguages: Array<{ language: string; proficiency: string }>;
  certifications: string[];
  resumeSummary: string;
  salaryExpectation?: { min: number; max: number };
}

class AIResumeAnalysisService {
  async analyzeResume(userId: string, resumeText: string): Promise<AIProfile> {
    console.log(`[AI Resume] Analyzing resume for user: ${userId}`);

    try {
      const session = await AIMatchingSession.create({
        userId,
        type: 'resume_analysis',
        status: 'processing',
        inputData: { resumeLength: resumeText.length },
      });

      const response = await callOpenAI(resumeText, RESUME_ANALYSIS_PROMPT);

      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch {
        analysis = {};
      }

      const profile: AIProfile = {
        userId,
        extractedSkills: analysis.extractedSkills || [],
        softSkills: analysis.softSkills || [],
        totalExperienceYears: analysis.totalExperienceYears || 0,
        careerLevel: analysis.careerLevel || 'junior',
        preferredRoles: analysis.preferredRoles || [],
        preferredLocations: analysis.preferredLocations || [],
        workModePreference: analysis.workModePreference || 'hybrid',
        programmingLanguages: analysis.programmingLanguages || [],
        certifications: analysis.certifications || [],
        resumeSummary: analysis.resumeSummary || '',
        salaryExpectation: analysis.salaryExpectation,
      };

      await AIMatchingSession.findByIdAndUpdate(session._id, {
        status: 'completed',
        outputData: profile,
      });

      logger.info(`Resume analyzed successfully for user: ${userId}`);
      return profile;
    } catch (error: any) {
      logger.error('Resume analysis failed', { error: error.message });
      throw error;
    }
  }

  async ensureAIProfile(userId: string): Promise<AIProfile> {
    // Return a default profile
    return {
      userId,
      extractedSkills: [],
      softSkills: [],
      totalExperienceYears: 0,
      careerLevel: 'junior',
      preferredRoles: [],
      preferredLocations: [],
      workModePreference: 'hybrid',
      programmingLanguages: [],
      certifications: [],
      resumeSummary: '',
    };
  }
}

export const aiResumeAnalysisService = new AIResumeAnalysisService();
