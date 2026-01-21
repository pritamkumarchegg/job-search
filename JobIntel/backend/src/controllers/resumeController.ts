import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import ParsedResume from '../models/ParsedResume';
import { User } from '../models/User';
import JobMatch from '../models/JobMatch';
import { resumeParserService } from '../services/resumeParserService';
import { batchMatchingService } from '../services/phase3/batchMatchingService';
import { deleteResumeFile } from '../middleware/resumeUpload';
import type { Multer } from 'multer';

declare global {
  namespace Express {
    interface Multer {
      File: any;
    }
  }
}

interface AuthRequest extends Request {
  user?: { id: string; email: string };
  file?: any; // Multer.File
  body: any;
  query: any;
}

/**
 * POST /api/resume/upload
 * Upload and parse a resume file
 */
export const uploadResume = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    if (!userId) {
      console.error('[Resume Upload] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      console.error('[Resume Upload] No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log(`[Resume Upload] Started for user: ${userId}, file: ${req.file.filename}`);
    logger.info(`Resume upload started: ${req.file.filename}`, { userId });

    // Parse resume
    console.log(`[Resume Upload] Parsing resume file: ${req.file.path}`);
    const parsedData = await resumeParserService.parseResume(req.file.path);
    console.log(`[Resume Upload] Resume parsed successfully. Skills: ${parsedData.skills.length}, Technologies: ${parsedData.technologies.length}`);

    // Delete the uploaded file after parsing (we store the parsed data)
    deleteResumeFile(req.file.filename);

    // Save parsed resume to database
    const existingResume = await ParsedResume.findOne({ userId });

    // Transform parsed data to match schema
    const formattedWorkExperience = parsedData.workExperience.map((exp: any) => ({
      companyName: exp.company || 'Unknown Company',
      jobTitle: exp.role || 'Unknown Position',
      startDate: exp.startYear ? new Date(exp.startYear, 0, 1) : undefined,
      endDate: exp.endYear ? new Date(exp.endYear, 11, 31) : undefined,
      isCurrent: !exp.endYear,
      description: exp.duration,
    }));

    const formattedEducation = parsedData.education.map((edu: any) => ({
      institution: edu.institution || 'Unknown Institution',
      degree: edu.degree || 'Unknown Degree',
      graduationDate: edu.year ? new Date(edu.year, 5, 15) : undefined,
    }));

    let savedResume;
    if (existingResume) {
      // Update existing resume
      savedResume = await ParsedResume.findByIdAndUpdate(existingResume._id, {
        originalFileName: req.file.originalname,
        contact: {
          email: parsedData.email,
          phone: parsedData.phone,
          location: parsedData.location,
        },
        workExperience: formattedWorkExperience,
        education: formattedEducation,
        allSkills: parsedData.skills,
        skills: {
          programming: parsedData.technologies.filter((t: string) => 
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'].includes(t)
          ),
          frontend: parsedData.technologies.filter((t: string) => 
            ['React', 'Vue', 'Angular', 'Next.js'].includes(t)
          ),
          backend: parsedData.technologies.filter((t: string) => 
            ['Node.js', 'Express', 'Django', 'Flask', 'Spring', 'FastAPI'].includes(t)
          ),
          databases: parsedData.technologies.filter((t: string) => 
            ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'].includes(t)
          ),
          cloud: parsedData.technologies.filter((t: string) => 
            ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'].includes(t)
          ),
          tools: parsedData.technologies,
          soft: [],
        },
        extractedText: parsedData.text,
        qualityScore: parsedData.parsingQuality === 'high' ? 90 : parsedData.parsingQuality === 'medium' ? 70 : 50,
        completeness: Math.round((parsedData.skills.length / 50) * 100),
      }, { new: true });

      logger.info(`Resume updated for user: ${userId}`, { resumeId: savedResume._id });
    } else {
      // Create new resume
      const newResume = new ParsedResume({
        userId,
        originalFileName: req.file.originalname,
        contact: {
          email: parsedData.email,
          phone: parsedData.phone,
          location: parsedData.location,
        },
        workExperience: formattedWorkExperience,
        education: formattedEducation,
        allSkills: parsedData.technologies,
        skills: {
          programming: parsedData.technologies.filter((t: string) => 
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'].includes(t)
          ),
          frontend: parsedData.technologies.filter((t: string) => 
            ['React', 'Vue', 'Angular', 'Next.js'].includes(t)
          ),
          backend: parsedData.technologies.filter((t: string) => 
            ['Node.js', 'Express', 'Django', 'Flask', 'Spring', 'FastAPI'].includes(t)
          ),
          databases: parsedData.technologies.filter((t: string) => 
            ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'].includes(t)
          ),
          cloud: parsedData.technologies.filter((t: string) => 
            ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'].includes(t)
          ),
          tools: parsedData.technologies,
          soft: [],
        },
        extractedText: parsedData.text,
        qualityScore: parsedData.parsingQuality === 'high' ? 90 : parsedData.parsingQuality === 'medium' ? 70 : 50,
        completeness: Math.round((parsedData.skills.length / 50) * 100),
      });

      savedResume = await newResume.save();
      logger.info(`Resume created for user: ${userId}`, { resumeId: savedResume._id });
    }

    // Update user profile with skills
    // Use skills array (includes all soft + hard skills detected) instead of technologies
    console.log(`[Resume Upload] FULL parsedData.skills (${parsedData.skills.length} items):`, parsedData.skills);
    const skillsRatingMap = parsedData.skills.reduce((acc, skill) => {
      acc[skill] = 4; // Default rating: 4/5
      return acc;
    }, {} as Record<string, number>);

    console.log(`[Resume Upload] skillsRatingMap created with ${Object.keys(skillsRatingMap).length} keys:`, Object.keys(skillsRatingMap));

    const updateResult = await User.findByIdAndUpdate(userId, {
      skillsRating: skillsRatingMap,
      experienceYears: Math.min(parsedData.workExperience.length * 2, 20), // Rough estimate
      profileCompleteness: Math.round((parsedData.skills.length / 50) * 100),
    }, { new: true });

    console.log(`[Resume Upload] User updated. Checking database:`, {
      userId: updateResult?._id,
      savedSkillsRatingKeys: updateResult?.skillsRating ? Object.keys(updateResult.skillsRating).length : 0,
      savedSkillsRatingContent: updateResult?.skillsRating ? Object.keys(updateResult.skillsRating).slice(0, 5) : []
    });
    logger.info(`User profile updated with ${parsedData.skills.length} skills`, { userId });

    // Trigger automatic matching
    logger.info(`Triggering batch matching for user: ${userId}`);
    console.log(`[Resume Upload] Triggering job matching for user: ${userId}`);
    batchMatchingService.matchUserToAllJobs(userId, { minScore: 50 }).catch((error) => {
      logger.error(`Batch matching failed: ${error}`, { userId });
      console.error(`[Resume Upload] Batch matching error:`, error);
    });

    return res.status(200).json({
      message: 'Resume uploaded and parsed successfully',
      parsedResume: {
        _id: savedResume._id,
        userId: savedResume.userId,
        originalFileName: savedResume.originalFileName,
        skills: savedResume.allSkills || [],
        technologies: savedResume.skills?.tools || [],
        workExperience: savedResume.workExperience || [],
        education: savedResume.education || [],
        contact: savedResume.contact || {},
        qualityScore: savedResume.qualityScore || 0,
        completeness: savedResume.completeness || 0,
        uploadedAt: savedResume.updatedAt || new Date(),
      },
      parsing: {
        quality: parsedData.parsingQuality,
        skillsDetected: parsedData.skills.length,
        technologiesDetected: parsedData.technologies.length,
        experienceEntries: parsedData.workExperience.length,
        educationEntries: parsedData.education.length,
      },
      matchStatus: 'Matching in progress...',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`[Resume Upload] Error for user ${userId}:`, {
      message: errorMsg,
      stack: errorStack,
      file: req.file?.filename,
      path: req.file?.path,
    });
    logger.error(`Resume upload error: ${errorMsg}`, { userId: req.user?.id, error: errorStack });
    
    // Cleanup file on error
    if (req.file) {
      deleteResumeFile(req.file.filename);
    }

    return res.status(500).json({ 
      error: 'Failed to process resume',
      details: errorMsg,
    });
  }
};

/**
 * GET /api/resume
 * Get current user's parsed resume
 */
export const getResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resume = await ParsedResume.findOne({ userId });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    return res.status(200).json({ resume });
  } catch (error) {
    logger.error(`Error fetching resume: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch resume' });
  }
};

/**
 * DELETE /api/resume
 * Delete user's resume and ALL related data (CASCADE DELETE)
 * Deletes:
 *   - ParsedResume document
 *   - JobMatches for this user
 *   - Skills from User profile
 *   - Experience years from User profile
 *   - Profile completeness from User profile
 */
export const deleteResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.error('[Resume Delete] Unauthorized - no user ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`[Resume Delete] Starting cascade delete for user: ${userId}`);
    
    // Step 1: Find the resume to delete
    const resume = await ParsedResume.findOneAndDelete({ userId }) as any;

    if (!resume) {
      console.warn(`[Resume Delete] Resume not found for user: ${userId}`);
      return res.status(404).json({ error: 'Resume not found' });
    }

    console.log(`[Resume Delete] ParsedResume deleted: ${resume._id}`);

    // Step 2: Delete all JobMatches for this user (CASCADE)
    const matchDeleteResult = await JobMatch.deleteMany({ userId });
    console.log(`[Resume Delete] JobMatches deleted: ${matchDeleteResult.deletedCount}`);

    // Step 3: Clear skill-related fields from User profile (CASCADE)
    const userUpdateResult = await User.findByIdAndUpdate(
      userId,
      {
        // Clear all skill-related fields
        skillsRating: new Map(), // Empty skill ratings
        experienceYears: 0, // Reset experience
        profileCompleteness: 0, // Reset profile completion
        careerLevel: 'fresher', // Reset to default
        targetRoles: [], // Clear target roles
        targetLocations: ['India'], // Reset to default locations
        targetTechStack: [], // Clear tech stack preferences
        targetDomains: [], // Clear domain preferences
      },
      { new: true }
    );

    console.log(`[Resume Delete] User profile cleared for userId: ${userId}`);

    logger.info(`Resume and related data deleted for user: ${userId}`, {
      resumeId: resume._id,
      matchesDeleted: matchDeleteResult.deletedCount,
      userProfileCleared: true,
    });

    // Log the cascade delete summary
    console.log(`[Resume Delete] ✅ Cascade delete completed:`);
    console.log(`   - ParsedResume: 1 document deleted`);
    console.log(`   - JobMatches: ${matchDeleteResult.deletedCount} documents deleted`);
    console.log(`   - User Profile: Skills, experience, and preferences cleared`);

    return res.status(200).json({
      message: 'Resume and all related data deleted successfully',
      deletedData: {
        parsedResume: {
          id: resume._id,
          originalFileName: resume.originalFileName,
        },
        jobMatches: matchDeleteResult.deletedCount,
        userProfileCleaned: true,
        clearedFields: [
          'skillsRating',
          'experienceYears',
          'profileCompleteness',
          'careerLevel',
          'targetRoles',
          'targetLocations',
          'targetTechStack',
          'targetDomains',
        ],
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Resume Delete] Error for user ${req.user?.id}:`, errorMsg);
    logger.error(`Error deleting resume: ${errorMsg}`, { userId: req.user?.id });
    return res.status(500).json({ 
      error: 'Failed to delete resume',
      details: errorMsg,
    });
  }
};

/**
 * GET /api/resume/matches
 * Get top job matches for user based on resume
 */
export const getResumeMatches = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : 50;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has parsed resume
    const resume = await ParsedResume.findOne({ userId });
    if (!resume) {
      return res.status(400).json({ error: 'Please upload a resume first' });
    }

    // Get top matches
    const matches = await batchMatchingService.getUserTopMatches(userId, { limit, minScore });

    return res.status(200).json({
      matches,
      count: matches.length,
      averageScore: matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.totalScore, 0) / matches.length) : 0,
    });
  } catch (error) {
    logger.error(`Error fetching resume matches: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

/**
 * GET /api/resume/stats
 * Get resume parsing and matching statistics
 */
export const getResumeStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const resume = await ParsedResume.findOne({ userId });

    if (!resume) {
      return res.status(404).json({ error: 'No resume found' });
    }

    const matchStats = await batchMatchingService.getUserMatchingStats(userId);

    return res.status(200).json({
      resume: {
        uploadedAt: resume.createdAt,
        parsingQuality: resume.qualityScore,
        skills: resume.skills,
        technologies: resume.allSkills,
        workExperienceCount: resume.workExperience?.length || 0,
        educationCount: resume.education?.length || 0,
      },
      matching: matchStats,
    });
  } catch (error) {
    logger.error(`Error fetching resume stats: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * POST /api/resume/re-match
 * Trigger re-matching for user based on current resume and jobs
 */
export const reMatchResume = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has resume
    const resume = await ParsedResume.findOne({ userId });
    if (!resume) {
      return res.status(400).json({ error: 'Please upload a resume first' });
    }

    // Trigger matching
    const stats = await batchMatchingService.matchUserToAllJobs(userId, { minScore: 50 });

    logger.info(`Re-matching triggered for user: ${userId}`, { ...stats });

    return res.status(200).json({
      message: 'Re-matching triggered successfully',
      stats,
    });
  } catch (error) {
    logger.error(`Error re-matching resume: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to trigger re-matching' });
  }
};
