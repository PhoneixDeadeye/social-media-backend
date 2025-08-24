// Comments controller for handling comment operations
// This controller handles:
// - Creating comments on posts
// - Editing user's own comments
// - Deleting user's own comments
// - Getting comments for a post
// - Pagination for comments

const logger = require("../utils/logger");
const commentModel = require("../models/comment");
const { validateComment } = require("../utils/validation");

/**
 * Create a new comment on a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createComment = async (req, res) => {
  try {
    const { post_id, content } = req.body;
    const user_id = req.user.id; // From auth middleware

    // Validate input
    const { error } = validateComment({ content });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if comments are enabled for this post
    const { getPostById } = require("../models/post");
    const post = await getPostById(post_id);
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    if (!post.comments_enabled) {
      return res.status(400).json({ error: "Comments are disabled for this post" });
    }

    const comment = await commentModel.createComment({
      post_id,
      user_id,
      content,
    });

    logger.verbose(`Comment created: ${comment.id} by user ${user_id}`);
    res.status(201).json(comment);
  } catch (error) {
    logger.critical("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
};

/**
 * Update a comment (only by comment owner)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;

    // Validate input
    const { error } = validateComment({ content });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if comment exists and belongs to user
    const existingComment = await commentModel.getCommentById(comment_id);
    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (existingComment.user_id !== user_id) {
      return res.status(403).json({ error: "Not authorized to update this comment" });
    }

    const updatedComment = await commentModel.updateComment(comment_id, content);
    logger.verbose(`Comment updated: ${comment_id} by user ${user_id}`);
    res.json({
      message: "Comment updated successfully",
      comment: updatedComment
    });
  } catch (error) {
    logger.critical("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
};

/**
 * Delete a comment (only by comment owner)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteComment = async (req, res) => {
  try {
    const { comment_id } = req.params;
    const user_id = req.user.id;

    // Check if comment exists and belongs to user
    const existingComment = await commentModel.getCommentById(comment_id);
    if (!existingComment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (existingComment.user_id !== user_id) {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }

    const deleted = await commentModel.deleteComment(comment_id);
    if (deleted) {
      logger.verbose(`Comment deleted: ${comment_id} by user ${user_id}`);
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Comment not found" });
    }
  } catch (error) {
    logger.critical("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

/**
 * Get comments for a post with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPostComments = async (req, res) => {
  try {
    const { post_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

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

    const comments = await commentModel.getPostComments(postIdNum);
    
    // Apply pagination
    const paginatedComments = comments.slice(offset, offset + limit);
    
    res.json({
      comments: paginatedComments,
      total: comments.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.critical("Error getting post comments:", error);
    res.status(500).json({ error: "Failed to get comments" });
  }
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
};
