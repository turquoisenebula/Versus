const express = require("express");
const { z } = require("zod");
const voteController = require("../controllers/vote.controller");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router({ mergeParams: true });

const voteBodySchema = z.object({
  choice: z.enum(["for", "against", "neutral"]),
});

router.put("/", auth, validate(voteBodySchema), voteController.castVote);
router.delete("/", auth, voteController.removeVote);
router.get("/me", auth, voteController.getMyVote);

module.exports = router;
