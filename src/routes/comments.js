const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
} = require("../controllers/comments");

const router = express.Router();

/**
 * Comments routes
 */

// POST /api/comments - Create a comment on a post
router.post("/", authenticateToken, createComment);

// PUT /api/comments/:comment_id - Update a comment
router.put("/:comment_id", authenticateToken, updateComment);

// DELETE /api/comments/:comment_id - Delete a comment
router.delete("/:comment_id", authenticateToken, deleteComment);

// GET /api/comments/post/:post_id - Get comments for a post
router.get("/post/:post_id", getPostComments);

// GET /api/comments/:post_id - Get comments for a post (alternative route)
router.get("/:post_id", getPostComments);

module.exports = router;
