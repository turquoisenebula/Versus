const express = require("express");
const { z } = require("zod");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const userController = require("../controllers/user.controller");

const router = express.Router();

const profileUpdateSchema = z
  .object({
    bio: z.string().trim().max(300).optional(),
    avatar: z
      .string()
      .max(500)
      .refine((avatar) => {
        if (avatar === "") {
          return true;
        }
        try {
          const url = new URL(avatar);
          return (
            (url.protocol === "http:" || url.protocol === "https:") &&
            Boolean(url.hostname)
          );
        } catch {
          return false;
        }
      }, "Avatar must be a valid HTTP or HTTPS URL or an empty string")
      .optional(),
  })
  .strict();

const userDebatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(["created", "argued", "all"]).default("all"),
});

router.put(
  "/me",
  auth,
  validate(profileUpdateSchema),
  userController.updateMyProfile
);
router.get(
  "/:username/debates",
  validate(userDebatesQuerySchema, "query"),
  userController.getUserDebates
);
router.get("/:username", userController.getPublicProfile);

module.exports = router;
