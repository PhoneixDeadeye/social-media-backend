// Likes controller for handling like operations
// This controller handles:
// - Liking posts
// - Unliking posts
// - Getting likes for a post
// - Getting posts liked by a user

const logger = require("../utils/logger");
const likeModel = require("../models/like");

/**
 * Like a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const likePost = async (req, res) => {
  try {
    const { post_id } = req.body;
    const user_id = req.user.id; // From auth middleware

    if (!post_id) {
      return res.status(400).json({ error: "post_id is required" });
    }

    // Check if post exists
    const { getPostById } = require("../models/post");
    const post = await getPostById(post_id);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const like = await likeModel.likePost(post_id, user_id);
    
    if (!like) {
      return res.status(409).json({ error: "Post already liked" });
    }

    logger.verbose(`Post ${post_id} liked by user ${user_id}`);
    res.status(201).json(like);
  } catch (error) {
    logger.critical("Error liking post:", error);
    res.status(500).json({ error: "Failed to like post" });
  }
};

/**
 * Unlike a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unlikePost = async (req, res) => {
  try {
    const { post_id } = req.params;
    const user_id = req.user.id;

    // Validate that post_id is a number
    const postIdNum = parseInt(post_id);
    if (isNaN(postIdNum)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const success = await likeModel.unlikePost(postIdNum, user_id);
    
    if (!success) {
      return res.status(400).json({ error: "Like not found" });
    }

    logger.verbose(`Post ${postIdNum} unliked by user ${user_id}`);
    res.status(204).send();
  } catch (error) {
    logger.critical("Error unliking post:", error);
    res.status(500).json({ error: "Failed to unlike post" });
  }
};

/**
 * Get likes for a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPostLikes = async (req, res) => {
  try {
    const { post_id } = req.params;
    
    // Validate that post_id is a number
    const postIdNum = parseInt(post_id);
    if (isNaN(postIdNum)) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Check if post exists
    const { getPostById } = require("../models/post");
    const post = await getPostById(postIdNum);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    const likes = await likeModel.getPostLikes(postIdNum);
    
    res.json({
      likes,
      count: likes.length,
    });
  } catch (error) {
    logger.critical("Error getting post likes:", error);
    res.status(500).json({ error: "Failed to get likes" });
  }
};

/**
 * Get posts liked by a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserLikes = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Validate that user_id is a number
    const userIdNum = parseInt(user_id);
    if (isNaN(userIdNum)) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const likedPosts = await likeModel.getUserLikes(userIdNum);
    
    res.json({
      likedPosts,
      count: likedPosts.length,
    });
  } catch (error) {
    logger.critical("Error getting user likes:", error);
    res.status(500).json({ error: "Failed to get user likes" });
  }
};

module.exports = {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
};
