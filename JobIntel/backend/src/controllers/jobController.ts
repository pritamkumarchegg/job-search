import { Request, Response } from "express";
import { Job } from "../models/Job";
import { Company } from "../models/Company";
import { Revenue } from "../models/Revenue";
import SavedJob from "../models/SavedJob";
import { enqueueNotification } from "../queues/notificationQueue";
import { publishRealtime } from "../utils/realtime";

// AI Job Parser - Parse raw job text and extract structured data
export async function parseJobText(req: Request, res: Response) {
  try {
    console.log("parseJobText endpoint called");
    const { rawText } = req.body;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: "Please provide job text to parse" });
    }

    const lines = rawText.split("\n").map(line => line.trim());
    const fullText = rawText.toLowerCase();

    // Extract Company
    const companyMatch = rawText.match(/(?:Company|🏢)\s*[:\-]?\s*([^\n]+)/i);
    let company = companyMatch ? companyMatch[1].trim() : '';
    // Fallback: sometimes the first line is "Company – Role" or "Company - Role"
    if (!company) {
      const firstLine = lines[0] || '';
      const dashMatch = firstLine.match(/^([A-Z][A-Za-z0-9&\-.\s]{2,80})\s*[-–—:\|]/);
      if (dashMatch) company = dashMatch[1].trim();
    }
    if (!company) company = 'Company Name';

    // Extract Job Title
    const titleMatch = rawText.match(/(?:Role|Position|Job Title|👨‍💻)\s*[:\-]?\s*([^\n]+)/i);
    let title = titleMatch ? titleMatch[1].trim() : "Job Title";
    title = title.replace(/[🚀📍💰🎓🛠️👨‍💻🏢]/g, "").trim();

    // Extract Location
    const locationMatch = rawText.match(/(?:Location|📍|Based in)\s*[:\-]?\s*([^\n]+)/i);
    let location = locationMatch ? locationMatch[1].trim() : "Bangalore, India";
    location = location.replace(/[📍]/g, "").trim();

    const isRemote = fullText.includes("remote") || fullText.includes("work from home") || fullText.includes("wfh");

    // Extract Salary/Stipend
    const salaryMatch = rawText.match(/(?:Salary|Stipend|CTC|Pay|💰)\s*[:\-]?\s*([^\n]+)/i);
    let salaryText = salaryMatch ? salaryMatch[1].trim().replace(/[💰]/g, "").trim() : "";
    // Trim salaryText if other segments follow on same line (location, link etc.)
    salaryText = salaryText.split(/\b(Location|📍|https?:|🔗)/i)[0].trim();

    let salary = "";
    let stipend = "";

    // Treat explicit 'stipend' or monthly terms as stipend, otherwise treat amounts (₹, LPA, CTC) as salary
    const lowerSalary = salaryText.toLowerCase();
    if (lowerSalary.includes("stipend") || /per\s*(month|mo|pm|monthly)/i.test(salaryText)) {
      stipend = salaryText;
    } else if (salaryText) {
      salary = salaryText;
    }

    // Extract Tech Stack
    const TECH_KEYWORDS = [
      "React", "Vue", "Angular", "Node.js", "Python", "Java", "C++", "Go",
      "TypeScript", "JavaScript", "PHP", "Ruby", "Rust", "Kotlin", "Swift",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "MongoDB", "PostgreSQL",
      "MySQL", "Redis", "Elasticsearch", "GraphQL", "REST", "Django", "Flask",
      "Spring", "Express", "Next.js", "Gatsby", "WebSocket", "MQTT", "gRPC"
    ];

    const techStack: string[] = [];
    TECH_KEYWORDS.forEach(tech => {
      if (fullText.includes(tech.toLowerCase())) {
        techStack.push(tech);
      }
    });

    // Extract Experience
    const expMatch = rawText.match(/(?:Experience|🎖️|Experience Level)\s*[:\-]?\s*([^\n]+)/i);
    const experience = expMatch ? expMatch[1].trim().replace(/[🎖️]/g, "").trim() : "Not specified";

    // Extract Eligibility
    const eligMatch = rawText.match(/(?:Eligibility|Qualifications|Requirements|🎓)\s*[:\-]?\s*([^\n]+)/i);
    const eligibility = eligMatch ? eligMatch[1].trim().replace(/[🎓]/g, "").trim() : "Graduates";

    // Extract Batch info
    // Extract Batch info: try explicit phrases then fallback to any 4-digit year matches
    const batch: string[] = [];
    const batchMatch = rawText.match(/(?:Eligible Batch|BATCH|Batch|Year)\s*[:\-]?\s*(\d{4})(?:\s*[&,\-]\s*(\d{4}))?/i);
    if (batchMatch) {
      batch.push(batchMatch[1]);
      if (batchMatch[2]) batch.push(batchMatch[2]);
    } else {
      const years = Array.from(rawText.matchAll(/\b(20\d{2})\b/g)).map(m => m[1]);
      years.forEach(y => { if (!batch.includes(y)) batch.push(y); });
    }

    // Generate tags
    const tags: string[] = [];

    if (experience.toLowerCase().includes("fresher") || experience.toLowerCase().includes("0-1")) {
      tags.push("Fresher");
    }
    if (experience.toLowerCase().includes("junior") || experience.toLowerCase().includes("1-3")) {
      tags.push("Entry-level");
    }
    if (experience.toLowerCase().includes("senior")) {
      tags.push("Senior");
    }

    tags.push("Internship");

    if (isRemote) {
      tags.push("Remote");
    } else {
      tags.push("On-site");
    }

    // Auto-tag company name (useful for filtering/search)
    if (company && company !== 'Company Name') tags.push(company);

    // Add batch years as tags
    if (batch && batch.length > 0) {
      batch.forEach((b) => { if (b && !tags.includes(b)) tags.push(b); });
    }

    // Generate description from raw text (WITHOUT apply links)
    let descriptionText = rawText;
    // Remove all URLs from description
    descriptionText = descriptionText.replace(/(https?:\/\/[^\s)]+)/gi, '').trim();
    // Remove "Application Link:", "Apply Link:", etc.
    descriptionText = descriptionText.replace(/(?:Application\s+Link|Apply\s+Link|🔗)[:\-]?\s*/gi, '').trim();
    // Clean up extra whitespace
    descriptionText = descriptionText.replace(/\n\n+/g, '\n').trim();
    
    const description = descriptionText.substring(0, 500) + (descriptionText.length > 500 ? "..." : "");

    // extract possible application link(s)
    const urlRegex = /(https?:\/\/[^\s)]+)/gi;
    const urls = Array.from(rawText.matchAll(urlRegex)).map((m: any) => m[1]);
    const applyLink = urls.length > 0 ? (urls.find(u => /apply|jobs|ats|careers|applynow/i.test(u)) || urls[0]) : undefined;

    return res.json({
      title,
      company,
      description,
      location,
      isRemote,
      salary: salary || undefined,
      stipend: stipend || undefined,
      techStack: [...new Set(techStack)],
      tags: [...new Set(tags)],
      eligibility: eligibility || undefined,
      experience: experience || undefined,
      batch: batch.length > 0 ? batch : undefined,
      applyLink: applyLink || undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to parse job text", details: err });
  }
}
export async function createJob(req: Request, res: Response) {
  try {
    const { title, companyId, rawHtml, status, meta, description, location, isRemote, techStack, tags, eligibility, experience, batch, company, salary, stipend, rawText, applyLink } = req.body;
    
    // If company name is provided, create/get company
    let companyDocId = companyId;
    let companyName: string | undefined = undefined;
    if (company && !companyId) {
      const companyDoc = await Company.findOneAndUpdate(
        { name: company },
        { $set: { name: company } },
        { upsert: true, new: true }
      );
      companyDocId = companyDoc._id;
      companyName = companyDoc.name;
    } else if (company) {
      companyName = company;
    }

    // Parse batch years to numbers
    const eligibleBatches = batch ? batch.map((b: string) => parseInt(b)).filter((n: number) => !isNaN(n)) : [];

    const job = await Job.create({
      title,
      companyId: companyDocId,
      rawHtml: rawText || rawHtml,
      description,
      location,
      status: status || "draft",
      batch,
      eligibleBatches,
      meta: {
        ...meta,
        isRemote,
        techStack,
        tags,
        eligibility,
        experience,
        batch,
        salary,
        stipend,
        applyLink: applyLink || (meta && meta.applyLink) || undefined,
        company: companyName || (meta && meta.company) || undefined,
      },
    });

    // Create revenue record for job posting
    try {
      await Revenue.create({
        jobId: job._id,
        companyId: companyDocId,
        amount: 500, // Default ₹500 per job posting
        currency: 'INR',
        type: 'job_posting',
        status: 'completed',
        description: `Job posting: ${title}`,
        metadata: { jobTitle: title, postedDate: new Date() }
      });
    } catch (revenueErr) {
      console.error('Failed to create revenue record:', revenueErr);
    }

    // enqueue/send notification and publish realtime event for clients
    try {
      const payload = {
        type: 'job_published',
        jobId: job._id,
        title: job.title,
        company: job.meta?.company || company || '',
        postedAt: job.createdAt || new Date(),
        body: `New job posted: ${job.title} at ${job.meta?.company || company || ''}`,
      };
      // enqueue email/whatsapp/telegram etc
      await enqueueNotification(payload);
      // publish to realtime channel for SSE/clients
      publishRealtime('realtime:notifications', payload);
    } catch (notifErr) {
      console.warn('failed to publish job notification', notifErr?.message || notifErr);
    }

    return res.status(201).json(job);
  } catch (err) {
    return res.status(500).json({ error: "failed to create job", details: err });
  }
}

// Get job by id
export async function getJob(req: Request, res: Response) {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "not found" });
    
    // Debug logging
    console.log('🔍 [getJob] Job retrieved:', {
      jobId: job._id,
      title: job.title,
      metaCompany: job.meta?.company,
      allMeta: job.meta,
      applyUrl: job.applyUrl,
      description: (job.description || '').substring(0, 100),
      source: job.source,
    });
    
    return res.json(job);
  } catch (err) {
    console.error('❌ [getJob] Error:', err);
    return res.status(500).json({ error: "failed to get job", details: err });
  }
}

// Update job
export async function updateJob(req: Request, res: Response) {
  try {
    const updates = req.body;
    
    // Parse batch years to numbers if batch is provided
    if (updates.batch) {
      updates.eligibleBatches = updates.batch.map((b: string) => parseInt(b)).filter((n: number) => !isNaN(n));
    }
    
    const job = await Job.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).lean();
    if (!job) return res.status(404).json({ error: "not found" });

    // publish realtime event on significant updates
    try {
      const payload = {
        type: 'job_updated',
        jobId: job._id,
        title: job.title,
        company: job.meta?.company || '',
        status: job.status,
        postedAt: job.postedAt || job.createdAt,
      };
      await enqueueNotification(payload);
      publishRealtime('realtime:notifications', payload);
    } catch (err) {
      console.warn('failed to publish job update notification', err?.message || err);
    }
    return res.json(job);
  } catch (err) {
    return res.status(500).json({ error: "failed to update job", details: err });
  }
}

// Delete job
export async function deleteJob(req: Request, res: Response) {
  try {
    const job = await Job.findByIdAndDelete(req.params.id).lean();
    if (!job) return res.status(404).json({ error: "not found" });

    try {
      const payload = { type: 'job_deleted', jobId: job._id, title: job.title };
      await enqueueNotification(payload);
      publishRealtime('realtime:notifications', payload);
    } catch (err) {
      console.warn('failed to publish job delete notification', err?.message || err);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to delete job", details: err });
  }
}

// List jobs (simple)
export async function listJobs(req: Request, res: Response) {
  try {
    const q: any = {};
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    // allow 'all' to mean no status filter
    if (status && status !== 'all') q.status = status;

    // support client-side limit param, with sane defaults and caps
    const requestedLimit = parseInt((req.query.limit as string) || '0', 10) || 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 5000) : 1000;

    console.log('🔍 [listJobs] Query initiated:', {
      queryParams: req.query,
      mongoQuery: q,
      limit,
      status,
      requestedLimit,
    });

    // Get total count before filtering for reference
    const totalCount = await Job.estimatedDocumentCount();
    
    // Basic query - newest first
    const jobs = await Job.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    
    console.log('✅ [listJobs] Query completed:', {
      totalJobsInDB: totalCount,
      queryApplied: q,
      jobsReturned: jobs.length,
      limit,
      firstJobId: jobs[0]?._id,
      lastJobId: jobs[jobs.length - 1]?._id,
      jobSources: Array.from(new Set(jobs.map((j: any) => j.source || 'unknown'))),
      jobStatuses: Array.from(new Set(jobs.map((j: any) => j.status || 'unknown'))),
    });

    return res.json(jobs);
  } catch (err) {
    console.error('❌ [listJobs] Error:', err);
    return res.status(500).json({ error: "failed to list jobs", details: err });
  }
}

// Return total jobs count
export async function getJobsCount(req: Request, res: Response) {
  try {
    const count = await Job.estimatedDocumentCount();
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: "failed to get jobs count", details: err });
  }
}

// Simple ingestion endpoint: accept url/rawHtml and create company/job
export async function ingestJob(req: Request, res: Response) {
  try {
    const { url, rawHtml, company } = req.body;

    // naive parser stub: extract title from rawHtml <title> or from payload
    let title = req.body.title;
    if (!title && rawHtml) {
      const m = /<title>([^<]+)<\/title>/i.exec(rawHtml);
      if (m) title = m[1].trim();
    }

    // upsert company
    let companyDoc = null;
    if (company && company.name) {
      companyDoc = await Company.findOneAndUpdate({ name: company.name }, { $set: company }, { upsert: true, new: true });
    }

    const job = await Job.create({ title: title || "Untitled Job", companyId: companyDoc?._id, rawHtml: rawHtml || "", meta: { sourceUrl: url } });
    return res.status(201).json(job);
  } catch (err) {
    return res.status(500).json({ error: "ingest failed", details: err });
  }
}

// Save a job for the user
export async function saveJob(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id;
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if already saved
    const existing = await SavedJob.findOne({ userId, jobId });
    if (existing) {
      return res.status(400).json({ error: "Job already saved" });
    }

    // Create saved job record
    const savedJob = await SavedJob.create({ userId, jobId });

    return res.status(201).json({ success: true, savedJob });
  } catch (err: any) {
    console.error("saveJob error", err);
    return res.status(500).json({ error: err?.message || "failed to save job" });
  }
}

// Unsave a job for the user
export async function unsaveJob(req: Request, res: Response) {
  try {
    const userId = (req as any).user?._id;
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Delete the saved job record
    const result = await SavedJob.findOneAndDelete({ userId, jobId });

    if (!result) {
      return res.status(404).json({ error: "Saved job not found" });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("unsaveJob error", err);
    return res.status(500).json({ error: err?.message || "failed to unsave job" });
  }
}

// Get saved jobs for the user
export async function getSavedJobs(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    const authUserId = (req as any).user?._id;

    if (!authUserId || authUserId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get all saved jobs with job details
    const savedJobs = await SavedJob.find({ userId })
      .populate("jobId")
      .sort({ savedAt: -1 });

    // Extract just the job details for the response
    const jobs = savedJobs.map((saved) => ({
      _id: saved._id,
      ...saved.jobId,
      savedAt: saved.savedAt,
    }));

    return res.json(jobs);
  } catch (err: any) {
    console.error("getSavedJobs error", err);
    return res.status(500).json({ error: err?.message || "failed to get saved jobs" });
  }
}
