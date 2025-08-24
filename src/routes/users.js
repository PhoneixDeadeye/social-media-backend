const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const {
  follow,
  unfollow,
  getMyFollowing,
  getMyFollowers,
  getStats,
  searchUsers,
} = require("../controllers/users");

const router = express.Router();

/**
 * User-related routes
 */

// POST /api/users/follow - Follow a user
router.post("/follow", authenticateToken, follow);

// DELETE /api/users/unfollow/:user_id - Unfollow a user
router.delete("/unfollow/:user_id", authenticateToken, unfollow);

// GET /api/users/following - Get users that current user follows
router.get("/following", authenticateToken, getMyFollowing);

// GET /api/users/followers - Get users that follow current user
router.get("/followers", authenticateToken, getMyFollowers);

// GET /api/users/stats - Get follow stats for current user
router.get("/stats", authenticateToken, getStats);

// GET /api/users/search - Find users by name
router.get("/search", searchUsers);

module.exports = router;
