const express = require("express");
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { z } = require("zod");

const router = express.Router();

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may contain only letters, numbers, and underscores")
    .transform((username) => username.toLowerCase()),
  email: z
    .string()
    .trim()
    .email("Email must be a valid email address")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email must be a valid email address")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

router.post(
  "/register",
  rateLimiter,
  validate(registerSchema),
  authController.register
);
router.post("/login", rateLimiter, validate(loginSchema), authController.login);
router.get("/me", auth, authController.me);

module.exports = router;
