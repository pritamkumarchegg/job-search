import { logger } from '../../utils/logger';
import { Job } from '../../models/Job';
import { User } from '../../models/User';
import JobMatch from '../../models/JobMatch';
import { matchingEngine, UserProfile as EngineUserProfile } from './matchingEngine';
import { v4 as uuidv4 } from 'uuid';

interface MatchingStats {
  sessionId: string;
  userId: string;
  totalJobsProcessed: number;
  jobsMatched: number;
  jobsCreated: number;
  jobsUpdated: number;
  averageScore: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

class BatchMatchingService {
  /**
   * Match a single user to all active jobs in database
   */
  async matchUserToAllJobs(userId: string, options: { minScore?: number; limit?: number } = {}): Promise<MatchingStats> {
    const sessionId = uuidv4();
    const startTime = new Date();
    const minScore = options.minScore || 50;
    const limit = options.limit || 10000;

    const stats: MatchingStats = {
      sessionId,
      userId,
      totalJobsProcessed: 0,
      jobsMatched: 0,
      jobsCreated: 0,
      jobsUpdated: 0,
      averageScore: 0,
      errors: 0,
      startTime,
    };

    logger.info(`Starting batch matching for user: ${userId}`, { sessionId, minScore });
    console.log(`[BatchMatching] Starting batch matching for user: ${userId}, minScore: ${minScore}`);

    try {
      // Fetch user profile
      const user = (await User.findById(userId).lean()) as any;
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      console.log(`[BatchMatching] User found: ${userId}, skillsRating:`, Object.keys(user.skillsRating || {}));

      // Build user profile for matching engine
      const userProfile: EngineUserProfile = {
        targetRoles: user.targetRoles || [],
        targetLocations: user.targetLocations || ['India'],
        targetTechStack: user.targetTechStack || [],
        targetDomains: user.targetDomains || [],
        experienceYears: user.experienceYears || 0,
        careerLevel: user.careerLevel || 'junior',
        workModePreference: user.workModePreference || 'hybrid',
        skillsRating: user.skillsRating || {},
      };

      // Fetch all active jobs
      const jobs = await Job.find({ status: { $ne: 'archived' } })
        .limit(limit)
        .lean();

      stats.totalJobsProcessed = jobs.length;
      console.log(`[BatchMatching] Fetched ${jobs.length} active jobs for matching`);
      logger.info(`Fetched ${jobs.length} active jobs for matching`, { sessionId });

      // Match each job
      let totalScore = 0;
      const matches: any[] = [];

      for (const jobItem of jobs) {
        try {
          const job = jobItem as any;
          const jobData = {
            title: job.title,
            description: job.description || '',
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            techStack: Array.isArray(job.techStack) ? job.techStack : [],
            experienceRequired: job.experienceRequired,
            careerLevel: job.careerLevel,
            workMode: job.workMode,
            location: job.location,
            domain: job.domain,
            companyName: job.companyName,
          };

          const matchResult = matchingEngine.calculateMatch(userProfile, jobData);

          if (matchResult.totalScore >= minScore) {
            stats.jobsMatched++;
            totalScore += matchResult.totalScore;

            matches.push({
              userId,
              jobId: job._id,
              totalScore: matchResult.totalScore,
              skillScore: matchResult.skillScore,
              roleScore: matchResult.roleScore,
              levelScore: matchResult.levelScore,
              experienceScore: matchResult.experienceScore,
              locationScore: matchResult.locationScore,
              workModeScore: matchResult.workModeScore,
              matchReasons: matchResult.matchReasons,
              skillGaps: matchResult.skillGaps,
              breakdownSummary: matchResult.breakdown.join(' | '),
              matchedAt: new Date(),
            });
          }
        } catch (error) {
          stats.errors++;
          logger.error(`Error matching job: ${error}`, { jobId: jobItem._id, userId });
        }
      }

      // Bulk insert/update job matches
      if (matches.length > 0) {
        logger.info(`Bulk upserting ${matches.length} job matches`, { sessionId });
        console.log(`[BatchMatching] Upserting ${matches.length} job matches for user: ${userId}`);

        const bulkOps = matches.map((match) => ({
          updateOne: {
            filter: { userId: match.userId, jobId: match.jobId },
            update: { $set: match },
            upsert: true,
          },
        }));

        const result = await JobMatch.bulkWrite(bulkOps);
        stats.jobsCreated = result.upsertedCount;
        stats.jobsUpdated = result.modifiedCount;
        console.log(`[BatchMatching] Upsert complete. Created: ${result.upsertedCount}, Updated: ${result.modifiedCount}`);
      } else {
        console.log(`[BatchMatching] No matching jobs found for user: ${userId}`);
      }

      stats.averageScore = matches.length > 0 ? Math.round(totalScore / matches.length) : 0;
      stats.endTime = new Date();
      stats.durationMs = stats.endTime.getTime() - startTime.getTime();

      logger.info(`Batch matching complete for user: ${userId}`, {
        sessionId,
        ...stats,
        speedJobsPerSecond: Math.round((stats.totalJobsProcessed / (stats.durationMs || 1)) * 1000),
      });

      return stats;
    } catch (error) {
      stats.errors++;
      stats.endTime = new Date();
      stats.durationMs = stats.endTime.getTime() - startTime.getTime();

      logger.error(`Batch matching failed: ${error}`, { sessionId, userId });
      throw error;
    }
  }

  /**
   * Match all users to newly scraped jobs
   */
  async matchAllUsersToNewJobs(jobIds?: string[], limit: number = 1000): Promise<{
    sessionId: string;
    usersMatched: number;
    totalMatches: number;
    averageScore: number;
    durationSeconds: number;
  }> {
    const sessionId = uuidv4();
    const startTime = new Date();

    logger.info(`Starting batch matching for all users`, { sessionId, jobCount: jobIds?.length });

    try {
      // Fetch all users
      const users = await User.find({ isActive: true }).select('_id').limit(limit).lean();

      logger.info(`Found ${users.length} active users to match`, { sessionId });

      let totalMatches = 0;
      let totalScore = 0;

      for (const user of users) {
        try {
          const stats = await this.matchUserToAllJobs(user._id as any, {
            limit: jobIds ? undefined : 10000,
          });

          totalMatches += stats.jobsMatched;
          totalScore += stats.averageScore * stats.jobsMatched;
        } catch (error) {
          logger.error(`Error matching user ${user._id}: ${error}`, { sessionId });
        }
      }

      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const averageScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;

      logger.info(`Batch matching for all users complete`, {
        sessionId,
        usersMatched: users.length,
        totalMatches,
        averageScore,
        durationSeconds,
        matchesPerSecond: Math.round(totalMatches / Math.max(1, durationSeconds)),
      });

      return {
        sessionId,
        usersMatched: users.length,
        totalMatches,
        averageScore,
        durationSeconds,
      };
    } catch (error) {
      logger.error(`Batch matching for all users failed: ${error}`, { sessionId });
      throw error;
    }
  }

  /**
   * Get top matches for a user
   */
  async getUserTopMatches(
    userId: string,
    options: { limit?: number; minScore?: number } = {}
  ): Promise<any[]> {
    try {
      const limit = options.limit || 50;
      const minScore = options.minScore || 50;

      const matches = await JobMatch.find({ userId, totalScore: { $gte: minScore } })
        .populate('jobId', 'title companyName location salary domain techStack workMode')
        .sort({ totalScore: -1 })
        .limit(limit)
        .lean();

      return matches;
    } catch (error) {
      logger.error(`Error fetching user matches: ${error}`, { userId });
      throw error;
    }
  }

  /**
   * Get matching statistics for a user
   */
  async getUserMatchingStats(userId: string): Promise<{
    totalMatches: number;
    averageScore: number;
    topScore: number;
    scoreDistribution: Record<string, number>;
    topDomains: Array<{ domain: string; count: number }>;
    topTechStacks: Array<{ tech: string; count: number }>;
  }> {
    try {
      const matches = await JobMatch.aggregate([
        { $match: { userId: userId as any } },
        {
          $facet: {
            stats: [
              {
                $group: {
                  _id: null,
                  totalMatches: { $sum: 1 },
                  averageScore: { $avg: '$totalScore' },
                  topScore: { $max: '$totalScore' },
                },
              },
            ],
            distribution: [
              {
                $bucket: {
                  groupBy: '$totalScore',
                  boundaries: [0, 25, 50, 75, 100],
                  default: 'other',
                  output: {
                    count: { $sum: 1 },
                  },
                },
              },
            ],
          },
        },
      ]);

      const stats = matches[0].stats[0] || { totalMatches: 0, averageScore: 0, topScore: 0 };
      const distribution: Record<string, number> = {};

      matches[0].distribution.forEach((d: any) => {
        distribution[`${d._id}`] = d.count;
      });

      return {
        totalMatches: stats.totalMatches,
        averageScore: Math.round(stats.averageScore),
        topScore: stats.topScore,
        scoreDistribution: distribution,
        topDomains: [],
        topTechStacks: [],
      };
    } catch (error) {
      logger.error(`Error calculating matching stats: ${error}`, { userId });
      throw error;
    }
  }
}

export const batchMatchingService = new BatchMatchingService();

export async function initBatchMatching(): Promise<void> {
  logger.info('Batch Matching Service initialized');
}
