import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import JobMatch from '../models/JobMatch';
import { Job } from '../models/Job';
import { User } from '../models/User';
import ParsedResume from '../models/ParsedResume';
import { batchMatchingService } from '../services/phase3/batchMatchingService';
import { matchingEngine } from '../services/phase3/matchingEngine';
import Notification from '../models/Notification';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
  query: any;
  params: any;
  body: any;
}

/**
 * GET /api/matching/my-jobs
 * Get user's matched jobs with filtering and sorting
 */
export const getMatchedJobs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : 0;
    const matchType = req.query.matchType as string;
    const sortBy = (req.query.sortBy as string) || 'totalScore';

    logger.info(`Fetching matched jobs for user: ${userId}`, {
      limit,
      skip,
      minScore,
      matchType,
    });

    // Build query
    const query: any = { userId };
    if (minScore > 0) {
      query.totalScore = { $gte: minScore };
    }
    if (matchType) {
      query.matchType = matchType;
    }

    // Build sort
    const sort: any = {};
    if (sortBy === 'totalScore') {
      sort.totalScore = -1;
    } else if (sortBy === 'confidence') {
      sort.confidence = -1;
    } else if (sortBy === 'recent') {
      sort.createdAt = -1;
    }

    // Fetch matches with job details
    const matches = await JobMatch.find(query)
      .populate('jobId', 'title location meta applyUrl applyLink status source description')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await JobMatch.countDocuments(query);

    logger.info(`Returned ${matches.length} matched jobs for user`, { userId, total });

    return res.status(200).json({
      matches,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Error fetching matched jobs: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch matched jobs' });
  }
};

/**
 * GET /api/matching/my-jobs/:matchId
 * Get detailed match information with insights
 */
export const getMatchDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const match = (await JobMatch.findById(matchId)
      .populate('jobId')
      .populate('userId', 'skillsRating experienceYears location')
      .lean()) as any;

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify ownership
    if (match.userId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Mark as viewed if not already
    if (match.status === 'matched') {
      await JobMatch.findByIdAndUpdate(matchId, {
        status: 'viewed',
        viewedAt: new Date(),
      });
    }

    logger.info(`Viewed match details: ${matchId}`, { userId });

    return res.status(200).json({
      match: {
        ...match,
        insights: {
          whyMatched: generateWhyMatched(match),
          skillGaps: match.breakdown.skillsMissing,
          nextSteps: generateNextSteps(match),
          jobTitle: match.jobId.title,
          company: match.jobId.meta?.rawData?.employer_name || 'Unknown',
        },
      },
    });
  } catch (error) {
    logger.error(`Error fetching match details: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch match details' });
  }
};

/**
 * GET /api/matching/statistics
 * Get user's matching statistics
 */
export const getMatchingStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await batchMatchingService.getUserMatchingStats(userId);

    logger.info(`Fetched matching stats for user: ${userId}`, stats);

    return res.status(200).json(stats);
  } catch (error) {
    logger.error(`Error fetching matching stats: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

/**
 * POST /api/matching/trigger-match
 * Manually trigger matching for user (e.g., after resume upload)
 */
export const triggerMatching = async (req: AuthRequest, res: Response) => {
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

    logger.info(`Triggering matching for user: ${userId}`);

    // Trigger batch matching
    const stats = await batchMatchingService.matchUserToAllJobs(userId, {
      minScore: 50,
    });

    logger.info(`Matching completed for user: ${userId}`, stats);

    // Get top matches and send notifications for 60%+ scores
    const topMatches = await JobMatch.find({ userId, totalScore: { $gte: 60 } })
      .populate('jobId', 'title')
      .sort({ totalScore: -1 })
      .limit(10)
      .lean();

    // Send notifications for new high-score matches
    for (const match of topMatches) {
      const existing = await Notification.findOne({
        userId,
        type: 'job_match',
        relatedJobId: (match as any).jobId._id,
      });

      if (!existing) {
        await Notification.create({
          userId,
          type: 'job_match',
          title: `Great Match Found: ${(match as any).jobId.title}`,
          message: `This job matches ${(match as any).totalScore}% of your profile`,
          relatedJobId: (match as any).jobId._id,
          relatedMatchId: match._id,
          priority: (match as any).totalScore >= 80 ? 'high' : 'normal',
          read: false,
        });

        logger.info(`Created notification for high-score match`, {
          userId,
          matchId: match._id,
          score: (match as any).totalScore,
        });
      }
    }

    return res.status(200).json({
      message: 'Matching triggered successfully',
      stats,
      newMatches: topMatches.length,
    });
  } catch (error) {
    logger.error(`Error triggering matching: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to trigger matching' });
  }
};

/**
 * PUT /api/matching/my-jobs/:matchId/status
 * Update match status (viewed, applied, rejected)
 */
export const updateMatchStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { matchId } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['matched', 'viewed', 'applied', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const match = await JobMatch.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify ownership
    if (match.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update status
    const updateData: any = { status };
    if (status === 'viewed') {
      updateData.viewedAt = new Date();
    } else if (status === 'applied') {
      updateData.appliedAt = new Date();
    }

    const updated = await JobMatch.findByIdAndUpdate(matchId, updateData, {
      new: true,
    }).populate('jobId');

    logger.info(`Updated match status`, { matchId, userId, status });

    return res.status(200).json({ match: updated });
  } catch (error) {
    logger.error(`Error updating match status: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to update status' });
  }
};

/**
 * GET /api/matching/recommendations
 * Get AI-powered recommendations based on top matches
 */
export const getRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get top matches
    const topMatches = await JobMatch.find({ userId, totalScore: { $gte: 70 } })
      .populate('jobId', 'title meta')
      .sort({ totalScore: -1 })
      .limit(20)
      .lean();

    // Get skills needed
    const skillsNeeded: { [key: string]: number } = {};
    topMatches.forEach((match: any) => {
      match.breakdown.skillsMissing?.forEach((skill: string) => {
        skillsNeeded[skill] = (skillsNeeded[skill] || 0) + 1;
      });
    });

    const topSkillsNeeded = Object.entries(skillsNeeded)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, frequency: count }));

    logger.info(`Generated recommendations for user: ${userId}`, {
      topMatches: topMatches.length,
      skillsToLearn: topSkillsNeeded.length,
    });

    return res.status(200).json({
      recommendations: {
        topMatches: topMatches.slice(0, 5),
        skillsToLearn: topSkillsNeeded,
        advice: generateAdvice(topMatches, topSkillsNeeded),
      },
    });
  } catch (error) {
    logger.error(`Error generating recommendations: ${error}`, { userId: req.user?.id });
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

/**
 * Helper function: Generate "why matched" explanation
 */
function generateWhyMatched(match: any): string {
  const reasons = [];

  if (match.scores.skill > 0) {
    reasons.push(`${match.scores.skill}/40 points for skill match`);
  }
  if (match.scores.role > 0) {
    reasons.push(`${match.scores.role}/20 points for role alignment`);
  }
  if (match.scores.level > 0) {
    reasons.push(`${match.scores.level}/15 points for experience level`);
  }
  if (match.breakdown.skillsMatched?.length > 0) {
    reasons.push(`You have ${match.breakdown.skillsMatched.length} matching skills`);
  }

  return reasons.join(', ') || 'Profile aligns with job requirements';
}

/**
 * Helper function: Generate next steps
 */
function generateNextSteps(match: any): string[] {
  const steps = [];

  if (match.breakdown.skillsMissing?.length > 0) {
    steps.push(`Learn ${match.breakdown.skillsMissing.slice(0, 2).join(', ')}`);
  }

  if (match.totalScore < 80) {
    steps.push('Improve your profile to increase match score');
  }

  if (match.confidence < 75) {
    steps.push('Add more details to your resume for better accuracy');
  }

  steps.push('Apply to this job when ready');

  return steps;
}

/**
 * Helper function: Generate personalized advice
 */
function generateAdvice(matches: any[], skillsToLearn: any[]): string {
  if (matches.length === 0) {
    return 'Upload your resume to get job recommendations based on your skills and experience.';
  }

  if (skillsToLearn.length > 0) {
    return `Focus on learning ${skillsToLearn[0].skill} to unlock more job opportunities. It appears in ${skillsToLearn[0].frequency} of your top matching roles.`;
  }

  return `You have ${matches.length} great job matches! Review them and start applying to increase your chances.`;
}
