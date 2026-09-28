import express from "express";

import {
  chatWithAI,
} from "../Controllers/aiControllers.js";

import authMiddleware from "../Middleware/authMiddleware.js";


const router = express.Router();


router.post(
  "/chat",
  authMiddleware,
  chatWithAI
);


export default router;