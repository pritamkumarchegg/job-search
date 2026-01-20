import { Router } from "express";
import { createJob, getJob, listJobs, ingestJob, updateJob, deleteJob, parseJobText, saveJob, unsaveJob, getSavedJobs, getJobsCount } from "../controllers/jobController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`Job Route: ${req.method} ${req.path}`);
  next();
});

router.post("/parse", parseJobText);
router.post("/", createJob);
router.get("/", listJobs);
router.get("/count", getJobsCount);
router.get("/stats/count", getJobsCount);
router.get("/:id", getJob);
router.patch("/:id", updateJob);
router.delete("/:id", deleteJob);
router.post("/ingest", ingestJob);

// Save/Unsave job endpoints (require authentication)
router.post("/:id/save", authenticateToken, saveJob);
router.post("/:id/unsave", authenticateToken, unsaveJob);
router.get("/user/:userId/saved", authenticateToken, getSavedJobs);

export default router;
