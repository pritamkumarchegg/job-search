import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

/**
 * Get audit logs with filtering and pagination
 * GET /api/jsearch/audit
 */
export async function getAuditLogs(req: AuthRequest, res: Response) {
  try {
    const {
      action,
      actor,
      status,
      limit = 100,
      offset = 0,
      start_date,
      end_date,
      search,
    } = req.query;

    // Build query
    const query: any = {};

    if (action) {
      query.action = action;
    }

    if (actor) {
      query.actor = new RegExp(actor as string, 'i'); // Case-insensitive search
    }

    if (status) {
      query.status = status;
    }

    // Date range filtering
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) {
        query.createdAt.$gte = new Date(start_date as string);
      }
      if (end_date) {
        query.createdAt.$lte = new Date(end_date as string);
      }
    }

    // Text search in meta data
    if (search) {
      query.$or = [
        { action: new RegExp(search as string, 'i') },
        { actor: new RegExp(search as string, 'i') },
        { 'meta.sessionId': search },
        { 'meta.jobId': search },
        { errorMessage: new RegExp(search as string, 'i') },
      ];
    }

    // Execute query with pagination
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .lean();

    // Get total count
    const total = await AuditLog.countDocuments(query);

    logger.info(`Retrieved ${logs.length} audit logs`, {
      actor: req.user?.email,
      filters: { action, actor, status },
    });

    return res.json({
      logs,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (err: any) {
    logger.error('Error fetching audit logs', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get detailed audit log entry
 * GET /api/jsearch/audit/:logId
 */
export async function getAuditLogDetail(req: AuthRequest, res: Response) {
  try {
    const { logId } = req.params;

    if (!logId) {
      return res.status(400).json({ error: 'logId parameter is required' });
    }

    const log = await AuditLog.findById(logId);

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    logger.info(`Retrieved audit log detail: ${logId}`, {
      actor: req.user?.email,
    });

    return res.json({ log });
  } catch (err: any) {
    logger.error('Error fetching audit log detail', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get audit statistics and summary
 * GET /api/jsearch/audit/stats
 */
export async function getAuditStats(req: AuthRequest, res: Response) {
  try {
    const { start_date, end_date, group_by = 'action' } = req.query;

    // Build date range filter
    const dateFilter: any = {};
    if (start_date) {
      dateFilter.$gte = new Date(start_date as string);
    }
    if (end_date) {
      dateFilter.$lte = new Date(end_date as string);
    }

    const matchStage: any = dateFilter && Object.keys(dateFilter).length > 0
      ? { $match: { createdAt: dateFilter } }
      : { $match: {} };

    // Get total actions
    const totalStats = await AuditLog.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    // Get action breakdown
    const actionBreakdown = await AuditLog.aggregate([
      matchStage,
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          status: {
            $push: '$status',
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get actor breakdown
    const actorBreakdown = await AuditLog.aggregate([
      matchStage,
      {
        $group: {
          _id: '$actor',
          count: { $sum: 1 },
          lastAction: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get hourly timeline
    const timeline = await AuditLog.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    logger.info('Retrieved audit statistics', {
      actor: req.user?.email,
      period: { start: start_date, end: end_date },
    });

    return res.json({
      stats: totalStats[0] || {
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        avgDuration: 0,
      },
      actions: actionBreakdown,
      actors: actorBreakdown,
      timeline,
      period: {
        start: start_date || 'all time',
        end: end_date || 'now',
      },
    });
  } catch (err: any) {
    logger.error('Error fetching audit statistics', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Export audit logs to CSV
 * GET /api/jsearch/audit/export/csv
 */
export async function exportAuditLogsCSV(req: AuthRequest, res: Response) {
  try {
    const { action, actor, status, start_date, end_date } = req.query;

    // Build query
    const query: any = {};
    if (action) query.action = action;
    if (actor) query.actor = new RegExp(actor as string, 'i');
    if (status) query.status = status;

    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date as string);
      if (end_date) query.createdAt.$lte = new Date(end_date as string);
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).lean();

    // Convert to CSV
    const csv = convertLogsToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="audit-logs.csv"'
    );

    logger.info(`Exported ${logs.length} audit logs to CSV`, {
      actor: req.user?.email,
    });

    return res.send(csv);
  } catch (err: any) {
    logger.error('Error exporting audit logs', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Create audit log entry
 * Used internally by other endpoints
 */
export async function createAuditLog(
  actor: string,
  action: string,
  meta?: any,
  ipAddress?: string,
  userAgent?: string,
  status: 'success' | 'failed' | 'pending' = 'success',
  errorMessage?: string,
  duration?: number
) {
  try {
    const auditLog = await AuditLog.create({
      actor,
      action,
      meta,
      ipAddress,
      userAgent,
      status,
      errorMessage,
      duration,
    });

    return auditLog;
  } catch (err: any) {
    logger.error('Error creating audit log', err);
    throw err;
  }
}

/**
 * Helper function to convert logs to CSV format
 */
function convertLogsToCSV(logs: any[]): string {
  if (logs.length === 0) {
    return 'No audit logs found';
  }

  // CSV headers
  const headers = [
    'Timestamp',
    'Actor',
    'Action',
    'Status',
    'Duration (ms)',
    'Error Message',
    'Metadata',
  ];

  // Convert rows
  const rows = logs.map((log) => [
    log.createdAt ? new Date(log.createdAt).toISOString() : '',
    log.actor || '',
    log.action || '',
    log.status || '',
    log.duration || '',
    log.errorMessage || '',
    JSON.stringify(log.meta || {}),
  ]);

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) =>
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(',')
    ),
  ].join('\n');

  return csv;
}
