const express = require("express");
const upvoteController = require("../controllers/upvote.controller");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/:id/upvote", auth, upvoteController.toggleUpvote);

module.exports = router;
