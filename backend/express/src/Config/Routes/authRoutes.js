import express from "express";
import {
  register,
  login,
  logout,
  fetchUser
} from "../Controllers/authControllers.js";

const router = express.Router()

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// ============================================================
// ELIRA INTERNAL USER LOOKUP
// ============================================================

router.get(
  "/internal/users/:userId",
  fetchUser
);

export default router;