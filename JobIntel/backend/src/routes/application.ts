import { Router } from "express";
import { createApplication, listApplications, deleteApplication, updateApplication } from "../controllers/applicationController";

const router = Router();

router.post("/", createApplication);
router.get("/", listApplications);
router.patch("/:id", updateApplication);
router.delete("/:id", deleteApplication);

export default router;
