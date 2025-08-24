const {
  createPost,
  getPostById,
  getPostsByUserId,
  deletePost,
  getFeedPosts,
  updatePost,
  searchPosts,
  getAllPosts,
} = require("../models/post.js");
const logger = require("../utils/logger");
const { createPostSchema } = require("../utils/validation");

/**
 * Create a new post
 */
const create = async (req, res) => {
  try {
    const { content, media_url, comments_enabled } = req.validatedData;
    const userId = req.user.id;

    const post = await createPost({
      user_id: userId,
      content,
      media_url,
      comments_enabled,
    });

    logger.verbose(`User ${userId} created post ${post.id}`);

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    logger.critical("Create post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get a single post by ID
 */
const getById = async (req, res) => {
  try {
    const { post_id } = req.params;

    // Validate that post_id is a number
    const postIdNum = parseInt(post_id);
    if (isNaN(postIdNum)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = await getPostById(postIdNum);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post });
  } catch (error) {
    logger.critical("Get post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get posts by a specific user
 */
const getUserPosts = async (req, res) => {
  try {
    const { user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await getPostsByUserId(parseInt(user_id), limit, offset);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    logger.critical("Get user posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get current user's posts
 */
const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await getPostsByUserId(userId, limit, offset);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    logger.critical("Get my posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete a post
 */
const remove = async (req, res) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;

    // First check if post exists and who owns it
    const existingPost = await getPostById(parseInt(post_id));
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    if (existingPost.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }

    const success = await deletePost(parseInt(post_id), userId);

    if (!success) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    logger.verbose(`User ${userId} deleted post ${post_id}`);

    res.status(204).send();
  } catch (error) {
    logger.critical("Delete post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get content feed for current user (posts from followed users) or all posts if not authenticated
 */
const getFeed = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let posts;
    
    if (req.user && req.user.id) {
      // If authenticated, get personalized feed
      posts = await getFeedPosts(req.user.id, limit, offset);
    } else {
      // If not authenticated, get all posts
      posts = await getAllPosts(limit, offset);
    }

    res.json({
      posts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    logger.critical("Get feed error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update a post
 */
const update = async (req, res) => {
  try {
    const { post_id } = req.params;
    const userId = req.user.id;
    const { content, media_url, comments_enabled } = req.body;

    // Validate input
    const { error } = createPostSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // First check if post exists and who owns it
    const existingPost = await getPostById(parseInt(post_id));
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    if (existingPost.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized to update this post" });
    }

    const updatedPost = await updatePost(parseInt(post_id), userId, {
      content,
      media_url,
      comments_enabled,
    });

    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    logger.verbose(`User ${userId} updated post ${post_id}`);
    res.json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    logger.critical("Update post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Search posts by content
 */
const search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!searchTerm || searchTerm.trim().length === 0) {
      // Return empty results for empty search
      return res.json({
        posts: [],
        searchTerm: '',
        pagination: {
          page,
          limit,
          hasMore: false,
        },
      });
    }

    // Require at least 2 characters for search
    if (searchTerm.trim().length < 2) {
      return res.status(400).json({ error: "Search term must be at least 2 characters" });
    }

    const posts = await searchPosts(searchTerm.trim(), limit, offset);

    res.json({
      posts,
      searchTerm,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    logger.critical("Search posts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  create,
  getById,
  getUserPosts,
  getMyPosts,
  remove,
  getFeed,
  update,
  search,
};
