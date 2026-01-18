import express from "express";
import { validateGradeRepRequest } from "../grading/validators.js";
import { gradeRep } from "../grading/gradeRep.js";

export const gradingRoutes = express.Router();

gradingRoutes.post("/gradeRep", async (req, res) => {
  const check = validateGradeRepRequest(req.body);
  if (!check.ok) return res.status(400).json({ error: check.message });

  const result = await gradeRep(req.body); // SLOT inside
  return res.json(result);
});
