// Users controller for handling user relationship operations
// This controller handles:
// - Following a user
// - Unfollowing a user
// - Getting users that the current user is following
// - Getting users that follow the current user
// - Getting follow counts for a user

const logger = require("../utils/logger");
const followModel = require("../models/follow");
const { findUsersByName, getUserProfile } = require("../models/user");

/**
 * Follow a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const follow = async (req, res) => {
  try {
    const { user_id } = req.body;
    const follower_id = req.user.id;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    if (user_id === follower_id) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const follow = await followModel.followUser(follower_id, user_id);
    
    if (!follow) {
      return res.status(400).json({ error: "Already following this user" });
    }

    logger.verbose(`User ${follower_id} followed user ${user_id}`);
    res.status(201).json({ message: "User followed successfully" });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: "User not found" });
    }
    logger.critical("Error following user:", error);
    res.status(500).json({ error: "Failed to follow user" });
  }
};

/**
 * Unfollow a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const unfollow = async (req, res) => {
  try {
    const { user_id } = req.params;
    const follower_id = req.user.id;

    const success = await followModel.unfollowUser(follower_id, user_id);
    
    if (!success) {
      return res.status(400).json({ error: "Follow relationship not found" });
    }

    logger.verbose(`User ${follower_id} unfollowed user ${user_id}`);
    res.status(200).json({ message: "User unfollowed successfully" });
  } catch (error) {
    logger.critical("Error unfollowing user:", error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
};

/**
 * Get users that current user is following
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMyFollowing = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const following = await followModel.getFollowing(user_id);
    
    res.json({
      following,
      count: following.length,
    });
  } catch (error) {
    logger.critical("Error getting following:", error);
    res.status(500).json({ error: "Failed to get following list" });
  }
};

/**
 * Get users that follow current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMyFollowers = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const followers = await followModel.getFollowers(user_id);
    
    res.json({
      followers,
      count: followers.length,
    });
  } catch (error) {
    logger.critical("Error getting followers:", error);
    res.status(500).json({ error: "Failed to get followers list" });
  }
};

/**
 * Get follow stats for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStats = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const stats = await followModel.getFollowCounts(user_id);
    
    // Convert to camelCase for consistency with GraphQL
    res.json({
      followerCount: stats.followers_count,
      followingCount: stats.following_count
    });
  } catch (error) {
    logger.critical("Error getting follow stats:", error);
    res.status(500).json({ error: "Failed to get follow stats" });
  }
};

/**
 * Search users by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchUsers = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!searchTerm || searchTerm.trim().length === 0) {
      // Return empty results for empty search
      return res.json({
        users: [],
        searchTerm: '',
        count: 0,
        limit,
        offset,
      });
    }

    if (searchTerm.trim().length < 2) {
      return res.status(400).json({ error: "Search term must be at least 2 characters" });
    }

    const users = await findUsersByName(searchTerm.trim(), limit, offset);

    res.json({
      users,
      searchTerm,
      count: users.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.critical("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
};

module.exports = {
  follow,
  unfollow,
  getMyFollowing,
  getMyFollowers,
  getStats,
  searchUsers,
};
