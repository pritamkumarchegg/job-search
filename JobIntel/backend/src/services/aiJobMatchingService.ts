import { logger } from '../utils/logger';
import { Job } from '../models/Job';
import JobMatch from '../models/JobMatch';
import { User } from '../models/User';
import AIMatchingSession from '../models/AIMatchingSession';
import { aiResumeAnalysisService, AIProfile } from './aiResumeAnalysisService';
import { getAdminSetting } from '../utils/adminSettingsHelper';

export interface JobMatchScore {
  jobId: string | any;
  title?: string;
  company?: string;
  location?: string;
  workMode?: string;
  matchScore: number;
  skills?: { matched: string[]; missing: string[] };
  analysis?: string;
  matchedAt?: Date;
}

class AIJobMatchingService {
  async getBestFitJobs(userId: string, limit: number = 10): Promise<JobMatchScore[]> {
    console.log(`[AIMatching] Getting best-fit jobs for user: ${userId}`);

    try {
      const matches = await JobMatch.find({ userId })
        .sort({ totalScore: -1 })
        .limit(limit)
        .populate('jobId', 'title meta employmentType location')
        .lean();

      return this.mapMatchesToJobs(matches);
    } catch (error: any) {
      logger.error('Get best-fit jobs failed', { error: error.message });
      return [];
    }
  }

  async getBestFitJobsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 50,
    minScore?: number
  ): Promise<{ jobs: JobMatchScore[]; pagination: any }> {
    // Use admin-set minimum score if not provided
    if (minScore === undefined) {
      minScore = await getAdminSetting('ai_minimum_score', 70);
    }
    
    console.log(`[AIMatching] Getting best-fit jobs paginated - User: ${userId}, Page: ${page}, Limit: ${limit}, MinScore: ${minScore}%`);

    try {
      const skip = (page - 1) * limit;

      // Get ONLY jobs with score >= minimum threshold
      const total = await JobMatch.countDocuments({ userId, totalScore: { $gte: minScore } });

      // Get paginated filtered results
      const matches = await JobMatch.find({ userId, totalScore: { $gte: minScore } })
        .sort({ totalScore: -1 })
        .skip(skip)
        .limit(limit)
        .populate('jobId', 'title meta employmentType location')
        .lean();

      const jobs = this.mapMatchesToJobs(matches);

      console.log(`[AIMatching] Found ${total} jobs with score >= ${minScore}%`);

      return {
        jobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMatches: total,
          matchesPerPage: limit,
          minScore,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error: any) {
      logger.error('Get best-fit jobs paginated failed', { error: error.message });
      return { jobs: [], pagination: {} };
    }
  }

  private mapMatchesToJobs(matches: any[]): JobMatchScore[] {
    return matches.map((m: any) => {
      const jobData = m.jobId || {};

      // Extract company name from various possible locations
      const company =
        jobData.meta?.rawData?.employer_name ||
        jobData.meta?.company ||
        jobData.meta?.employer_name ||
        'Unknown Company';

      // Clean up title (remove "Role:" prefix if present)
      let title = jobData.title || `Job ${m.jobId}`;
      if (title.startsWith('Role: ')) {
        title = title.substring(6); // Remove "Role: " prefix
      }

      // Clean up location (remove "Location:" prefix if present)
      let location = jobData.location || 'Location not specified';
      if (location.startsWith('Location: ')) {
        location = location.substring(10); // Remove "Location: " prefix
      }

      return {
        jobId: jobData._id || m.jobId,
        title,
        company,
        location,
        workMode: jobData.employmentType || 'Not specified',
        matchScore: m.totalScore || 0,
        skills: { matched: [], missing: [] },
        analysis: 'Match found',
        matchedAt: m.createdAt,
      };
    });
  }

  async scoreJobMatch(userId: string, job: any, aiProfile: AIProfile): Promise<JobMatchScore> {
    return {
      jobId: job._id || job.id,
      title: job.title,
      matchScore: 75,
      skills: { matched: [], missing: [] },
      analysis: 'Match placeholder',
      matchedAt: new Date(),
    };
  }

  async getMatchDetails(userId: string, jobId: string): Promise<JobMatchScore | null> {
    const match = await JobMatch.findOne({ userId, jobId }).lean();
    if (!match) return null;

    return {
      jobId: match.jobId,
      title: 'Job',
      matchScore: match.totalScore || 0,
      skills: { matched: [], missing: [] },
      analysis: 'Details',
      matchedAt: match.createdAt,
    };
  }

  async getUserMatches(userId: string, limit: number = 50): Promise<JobMatchScore[]> {
    const matches = await JobMatch.find({ userId }).sort({ totalScore: -1 }).limit(limit).lean();

    return matches.map((m: any) => ({
      jobId: m.jobId,
      title: 'Job',
      matchScore: m.totalScore || 0,
      matchedAt: m.createdAt,
    }));
  }

  async matchAllUsers(jobId: string): Promise<{ success: number; failed: number }> {
    console.log(`[AIMatching] Batch matching job ${jobId}`);
    const job = await Job.findById(jobId).lean();
    if (!job) throw new Error(`Job not found: ${jobId}`);

    return { success: 0, failed: 0 };
  }

  async triggerUserMatching(userId: string): Promise<{ matchesCreated: number; totalJobs: number }> {
    console.log(`[AIMatching] Triggering matching for user: ${userId}`);
    
    try {
      // Get user profile
      const user = await User.findById(userId).lean();
      if (!user) throw new Error(`User not found: ${userId}`);

      // Convert userId to ObjectId for database queries
      const userObjectId = new (require('mongoose').Types.ObjectId)(userId);

      // Use a simple default profile for now
      const userProfile = {
        userId,
        extractedSkills: [],
        softSkills: [],
        totalExperienceYears: 0,
        careerLevel: 'Entry',
        preferredRoles: ['Software Engineer'],
        preferredLocations: ['India'],
        workModePreference: 'Any',
        programmingLanguages: [],
        certifications: [],
        resumeSummary: '',
      };

      // Get all jobs
      const jobs = await Job.find().lean();
      console.log(`[AIMatching] Found ${jobs.length} total jobs to match`);

      let created = 0;

      // Match each job
      for (const job of jobs) {
        try {
          // Score the job
          const score = await this.scoreJobWithAI(job, userProfile);
          console.log(`[AIMatching] Job ${job._id} (${job.title}) scored: ${score}`);

          // Create match record with score >= 0
          if (score >= 0) {
            await JobMatch.create({
              userId: userObjectId,
              jobId: job._id,
              totalScore: score,
              createdAt: new Date(),
            });
            created++;
            if (created % 50 === 0) console.log(`[AIMatching] Created ${created} matches so far...`);
          }
        } catch (err: any) {
          console.error(`[AIMatching] Failed to match job ${job._id}:`, err.message);
        }
      }

      console.log(`[AIMatching] Created ${created} job matches for user ${userId}`);
      return { matchesCreated: created, totalJobs: jobs.length };
    } catch (error: any) {
      logger.error('Trigger user matching failed', { error: error.message });
      throw error;
    }
  }

  private async scoreJobWithAI(job: any, userProfile: any): Promise<number> {
    // ✅ NORMALIZED SCORING FOR ENTRY-LEVEL/FRESHER PROFILES (60-80% RANGE)
    // Goal: Distribute scores across 60-80% for better differentiation
    let score = 0; // Start from 0, will normalize to 60-80 range

    // Skills match - generous for entry-level
    const jobRequirements = job.requirements || [];
    const userSkills = userProfile.extractedSkills?.map((s: any) => s.skill) || [];
    
    // For freshers with no skills, give universal tech skill match
    let skillMatches = 0;
    if (userSkills.length === 0) {
      // Fresher with no skills: check if job is tech-oriented
      const techKeywords = ['python', 'javascript', 'java', 'c++', 'typescript', 'sql', 'html', 'css', 'node', 'react', 'angular', 'vue', 'database', 'api', 'backend', 'frontend'];
      const jobText = (job.title + ' ' + (job.description || '') + ' ' + (jobRequirements.join(' '))).toLowerCase();
      const techMatches = techKeywords.filter(keyword => jobText.includes(keyword)).length;
      skillMatches = Math.min(3, techMatches); // Max 3 skill matches
    } else {
      // User has skills: match them
      skillMatches = userSkills.filter((skill: string) =>
        jobRequirements.some((req: string) => req?.toLowerCase().includes(skill.toLowerCase()))
      ).length;
    }
    
    // Add skill bonus (normalized: 0-6 points max)
    const careerLevel = userProfile.careerLevel || 'Entry';
    const isEntry = careerLevel.toLowerCase().includes('entry') || careerLevel.toLowerCase().includes('fresher');
    const skillBonus = isEntry 
      ? Math.min(6, skillMatches * 2)  // Fresher: max +6
      : Math.min(8, skillMatches * 2.5); // Experienced: max +8
    score += skillBonus;

    // Role match - VERY FLEXIBLE for freshers (normalized: 0-5 points max)
    const jobTitle = (job.title || '').toLowerCase();
    const preferredRoles = userProfile.preferredRoles || ['Software Engineer', 'Developer', 'Engineer'];
    const roleKeywords = ['software', 'engineer', 'developer', 'programmer', 'technical', 'analyst', 'associate', 'trainee', 'junior', 'entry'];
    
    let roleBonus = 0;
    if (preferredRoles.some((role: string) => jobTitle.includes(role.toLowerCase()))) {
      roleBonus = isEntry ? 5 : 5;  // Fresher/experienced both get +5
    } else if (roleKeywords.some((keyword: string) => jobTitle.includes(keyword))) {
      roleBonus = isEntry ? 3 : 4;   // Fresher gets +3 for general tech roles
    } else if (isEntry) {
      roleBonus = 2; // Fresher gets +2 for ANY job (open to opportunities)
    }
    score += roleBonus;

    // Location match (normalized: 0-4 points max)
    const jobLocation = (job.location || '').toLowerCase();
    const preferredLocations = userProfile.preferredLocations || ['India', 'Any', 'Remote'];
    let locationBonus = 0;
    if (preferredLocations.some((loc: string) => 
      jobLocation.includes(loc.toLowerCase()) || loc === 'Any' || jobLocation.includes('remote') || jobLocation.includes('work from home')
    )) {
      locationBonus = 4;
    } else if (isEntry) {
      locationBonus = 2; // Fresher gets partial credit for any location (flexible)
    }
    score += locationBonus;

    // Employment type preference (normalized: 0-3 points max)
    const employmentType = (job.employmentType || '').toLowerCase();
    if (employmentType.includes('full') || employmentType.includes('contract') || employmentType.includes('internship')) {
      score += isEntry ? 3 : 2;  // Fresher gets more boost for full-time/contract/internship
    }

    // Experience level match - bonus if job targets juniors/freshers (normalized: 0-2 points max)
    const jobText = (job.title + ' ' + (job.description || '')).toLowerCase();
    if (jobText.includes('fresher') || jobText.includes('junior') || jobText.includes('entry') || jobText.includes('trainee') || jobText.includes('graduate')) {
      score += 2; // Extra boost for entry-level targeted jobs
    }

    // Normalize to 60-80% range
    // Max possible score: 6 + 5 + 4 + 3 + 2 = 20 points
    // Map 0-20 points to 60-80% range
    const maxScore = 20;
    const normalizedScore = 60 + (score / maxScore) * 20; // Maps 0-20 to 60-80

    return Math.min(80, Math.max(60, normalizedScore)); // Ensure score is between 60-80
  }
}

export const aiJobMatchingService = new AIJobMatchingService();
