const { query } = require("../utils/database");

/**
 * Like model for managing post likes
 */

/**
 * Like a post (insert if not exists)
 * @param {number} post_id
 * @param {number} user_id
 * @returns {Promise<Object|null>} Created like or null if already exists
 */
const likePost = async (post_id, user_id) => {
  try {
    const result = await query(
      `INSERT INTO likes (post_id, user_id, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, post_id, user_id, created_at`,
      [post_id, user_id]
    );
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation (already liked)
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
};

/**
 * Unlike a post (remove like)
 * @param {number} post_id
 * @param {number} user_id
 * @returns {Promise<boolean>} True if unlike successful
 */
const unlikePost = async (post_id, user_id) => {
  const result = await query(
    `DELETE FROM likes WHERE post_id = $1 AND user_id = $2`,
    [post_id, user_id]
  );
  return result.rowCount > 0;
};

/**
 * Get all likes for a post
 * @param {number} post_id
 * @returns {Promise<Array>} Array of likes with user info
 */
const getPostLikes = async (post_id) => {
  const result = await query(
    `SELECT l.id, l.post_id, l.user_id, l.created_at,
            u.username, u.full_name
     FROM likes l
     JOIN users u ON l.user_id = u.id
     WHERE l.post_id = $1
     ORDER BY l.created_at DESC`,
    [post_id]
  );
  return result.rows;
};

/**
 * Get posts liked by a user
 * @param {number} user_id
 * @returns {Promise<Array>} Array of liked posts
 */
const getUserLikes = async (user_id) => {
  const result = await query(
    `SELECT l.id, l.post_id, l.user_id, l.created_at,
            p.content, p.media_url, p.created_at as post_created_at
     FROM likes l
     JOIN posts p ON l.post_id = p.id
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

/**
 * Check if user has liked a post
 * @param {number} post_id
 * @param {number} user_id
 * @returns {Promise<boolean>} True if user has liked the post
 */
const hasUserLikedPost = async (post_id, user_id) => {
  const result = await query(
    `SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2`,
    [post_id, user_id]
  );
  return result.rows.length > 0;
};

/**
 * Count likes by post
 * @param {number} postId - Post ID
 * @returns {Promise<number>} Number of likes
 */
const countLikesByPost = async (postId) => {
  const result = await query(
    `SELECT COUNT(*) as count FROM likes WHERE post_id = $1`,
    [postId]
  );
  
  return parseInt(result.rows[0].count);
};

module.exports = {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
  hasUserLikedPost,
  countLikesByPost,
};
