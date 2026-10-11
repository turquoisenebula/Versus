const express = require("express");
const { z } = require("zod");
const argumentController = require("../controllers/argument.controller");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const validate = require("../middleware/validate");

const router = express.Router({ mergeParams: true });

const createArgumentSchema = z.object({
  side: z.enum(["for", "against"]),
  text: z
    .string()
    .trim()
    .min(20, "Argument must be at least 20 characters")
    .max(1500, "Argument must be at most 1500 characters"),
});

const listArgumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  side: z.enum(["for", "against"]).optional(),
  sort: z.enum(["newest", "oldest", "top"]).default("newest"),
});

router.get(
  "/",
  optionalAuth,
  validate(listArgumentsSchema, "query"),
  argumentController.listArguments
);
router.post(
  "/",
  auth,
  validate(createArgumentSchema),
  argumentController.createArgument
);

module.exports = router;
