import { Request, Response } from "express";
import { Application } from "../models/Application";
import { publishRealtime } from "../utils/realtime";

export async function createApplication(req: Request, res: Response) {
  try {
    const payload = req.body;
    const a = await Application.create(payload);
    try {
      const ev = {
        type: 'application_created',
        applicationId: a._id,
        jobId: a.jobId,
        userId: a.userId,
        createdAt: a.createdAt || new Date(),
      };
      publishRealtime('realtime:applications', ev);
    } catch (e) {
      console.warn('failed to publish application realtime event', e?.message || e);
    }
    return res.status(201).json(a);
  } catch (err) {
    return res.status(500).json({ error: "failed to create application", details: err });
  }
}

export async function listApplications(req: Request, res: Response) {
  try {
    const q: any = {};
    if (req.query.jobId) q.jobId = req.query.jobId;
    if (req.query.userId) q.userId = req.query.userId;
    const items = await Application.find(q).limit(100).lean();
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: "failed to list applications", details: err });
  }
}

export async function updateApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Allow updating status and notes
    const allowed = ['status', 'notes', 'appliedAt'];
    const payload: any = {};
    for (const key of allowed) {
      if (key in updates) payload[key] = updates[key];
    }

    const app = await Application.findByIdAndUpdate(id, payload, { new: true }).lean();
    if (!app) return res.status(404).json({ error: 'Application not found' });

    try {
      publishRealtime('realtime:applications', {
        type: 'application_updated',
        applicationId: app._id,
        jobId: app.jobId,
        userId: app.userId,
        status: app.status,
      });
    } catch (e) {
      console.warn('failed to publish application update event', e?.message || e);
    }

    return res.json(app);
  } catch (err) {
    return res.status(500).json({ error: "failed to update application", details: err });
  }
}

export async function deleteApplication(req: Request, res: Response) {
  try {
    const app = await Application.findByIdAndDelete(req.params.id).lean();
    if (!app) return res.status(404).json({ error: 'not found' });
    try {
      publishRealtime('realtime:applications', { type: 'application_deleted', applicationId: app._id, jobId: app.jobId, userId: app.userId });
    } catch (e) {
      console.warn('failed to publish application delete event', e?.message || e);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'failed to delete application', details: err });
  }
}
