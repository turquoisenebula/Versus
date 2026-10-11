const express = require("express");
const { z } = require("zod");
const debateController = require("../controllers/debate.controller");
const argumentRoutes = require("./argument.routes");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const validate = require("../middleware/validate");
const categories = require("../utils/debateCategories");

const router = express.Router();

const createDebateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Title must be at least 10 characters")
    .max(150, "Title must be at most 150 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
  category: z.enum(categories, {
    errorMap: () => ({ message: "Category is not supported" }),
  }),
  endsAt: z
    .string()
    .datetime({ offset: true, message: "End time must be a valid ISO date" })
    .transform((endsAt) => new Date(endsAt))
    .refine((endsAt) => endsAt.getTime() > Date.now(), {
      message: "End time must be in the future",
    })
    .refine(
      (endsAt) => endsAt.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000,
      { message: "End time must be within 30 days" }
    ),
});

const listDebatesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().min(1).optional(),
  category: z.enum(categories).optional(),
  status: z.enum(["open", "closed"]).optional(),
  sort: z.enum(["newest", "ending-soon", "most-votes"]).default("newest"),
});

router.get(
  "/",
  optionalAuth,
  validate(listDebatesSchema, "query"),
  debateController.listDebates
);
router.use("/:id/arguments", argumentRoutes);
router.get("/:id", optionalAuth, debateController.getDebateById);
router.post("/", auth, validate(createDebateSchema), debateController.createDebate);

module.exports = router;
