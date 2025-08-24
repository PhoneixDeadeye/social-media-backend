const { query } = require("../utils/database");

/**
 * Follow model for managing user relationships
 */

/**
 * Follow a user
 * @param {number} follower_id - ID of user doing the following
 * @param {number} followed_id - ID of user being followed
 * @returns {Promise<Object|null>} Created follow relationship or null if already exists or user not found
 */
const followUser = async (follower_id, followed_id) => {
  try {
    // First check if the user being followed exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [followed_id]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    const result = await query(
      `INSERT INTO follows (follower_id, following_id, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, follower_id, following_id, created_at`,
      [follower_id, followed_id]
    );
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (already following)
    if (error.code === '23505') {
      return null;
    }
    // Handle user not found
    if (error.message === 'User not found') {
      throw error;
    }
    throw error;
  }
};

/**
 * Unfollow a user
 * @param {number} follower_id - ID of user doing the unfollowing
 * @param {number} followed_id - ID of user being unfollowed
 * @returns {Promise<boolean>} True if unfollow successful
 */
const unfollowUser = async (follower_id, followed_id) => {
  const result = await query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [follower_id, followed_id]
  );
  return result.rowCount > 0;
};

/**
 * Get users that a user is following
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} Array of followed users
 */
const getFollowing = async (user_id) => {
  const result = await query(
    `SELECT f.id, f.following_id, f.created_at,
            u.username, u.full_name
     FROM follows f
     JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

/**
 * Get users that follow a user
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} Array of followers
 */
const getFollowers = async (user_id) => {
  const result = await query(
    `SELECT f.id, f.follower_id, f.created_at,
            u.username, u.full_name
     FROM follows f
     JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

/**
 * Get follow counts for a user
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} Object with follower and following counts
 */
const getFollowCounts = async (user_id) => {
  const followerResult = await query(
    `SELECT COUNT(*) FROM follows WHERE following_id = $1`,
    [user_id]
  );
  const followingResult = await query(
    `SELECT COUNT(*) FROM follows WHERE follower_id = $1`,
    [user_id]
  );
  
  return {
    followers_count: parseInt(followerResult.rows[0].count, 10),
    following_count: parseInt(followingResult.rows[0].count, 10),
  };
};

/**
 * Check if user is following another user
 * @param {number} followerId - Follower user ID
 * @param {number} followingId - Following user ID
 * @returns {Promise<boolean>} True if following
 */
const isFollowing = async (followerId, followingId) => {
  const result = await query(
    `SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  return result.rows.length > 0;
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  getFollowCounts,
  isFollowing,
};
