const express = require("express");
const { validateRequest, createPostSchema } = require("../utils/validation");
const {
	create,
	getById,
	getUserPosts,
	getMyPosts,
	remove,
	getFeed,
	update,
	search,
} = require("../controllers/posts");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Import scheduled posts routes
const scheduledRoutes = require('./scheduled');

const router = express.Router();

/**
 * Posts routes
 */

// Include scheduled posts routes FIRST (before dynamic routes)
router.use('/', scheduledRoutes);

// POST /api/posts - Create a new post
router.post("/", authenticateToken, validateRequest(createPostSchema), create);

// GET /api/posts/my - Get current user's posts
router.get("/my", authenticateToken, getMyPosts);

// GET /api/posts/feed - Get posts from followed users
router.get("/feed", authenticateToken, getFeed);

// GET /api/posts/search - Search posts by content
router.get("/search", search);

// GET /api/posts - Get all posts (public feed)
router.get("/", optionalAuth, getFeed);

// GET /api/posts/user/:user_id - Get posts by a specific user
router.get("/user/:user_id", optionalAuth, getUserPosts);

// PUT /api/posts/:post_id - Update a post
router.put("/:post_id", authenticateToken, update);

// DELETE /api/posts/:post_id - Delete a post
router.delete("/:post_id", authenticateToken, remove);

// GET /api/posts/:post_id - Get a single post by ID (LAST to avoid conflicts)
router.get("/:post_id", optionalAuth, getById);

module.exports = router;
