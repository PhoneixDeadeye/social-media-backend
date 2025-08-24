const { query } = require("../utils/database");
const bcrypt = require("bcryptjs");

/**
 * User model for database operations
 */

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async ({ username, email, password, full_name }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (username, email, password_hash, full_name, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, username, email, full_name, created_at`,
    [username, email, hashedPassword, full_name],
  );

  return result.rows[0];
};

/**
 * Find user by username
 * @param {string} username - Username to search for
 * @returns {Promise<Object|null>} User object or null
 */
const getUserByUsername = async (username) => {
  const result = await query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);

  return result.rows[0] || null;
};

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const getUserById = async (id) => {
  const result = await query(
    "SELECT id, username, email, full_name, created_at FROM users WHERE id = $1",
    [id],
  );

  return result.rows[0] || null;
};

/**
 * Find user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User object or null
 */
const findByUsername = async (username) => {
  const result = await query(
    "SELECT id, username, email, full_name, created_at FROM users WHERE username = $1",
    [username],
  );

  return result.rows[0] || null;
};

/**
 * Verify user password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} Password match result
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Find users by (partial) name, with optional pagination
 * @param {string} name - Partial name to search for
 * @param {number} [limit=10] - Max results
 * @param {number} [offset=0] - Offset for pagination
 * @returns {Promise<Array>} Array of user objects
 */
const findUsersByName = async (name, limit = 10, offset = 0) => {
  const result = await query(
    `SELECT id, username, email, full_name, created_at
     FROM users
     WHERE full_name ILIKE $1 OR username ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${name}%`, limit, offset]
  );
  return result.rows;
};

/**
 * Get user profile with follower/following counts
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Profile object or null
 */
const getUserProfile = async (userId) => {
  // Basic user info
  const userRes = await query(
    `SELECT id, username, email, full_name, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!userRes.rows[0]) return null;

  // Follower/following counts (if follows table exists)
  let followerCount = 0, followingCount = 0;
  try {
    const followerRes = await query(
      `SELECT COUNT(*) FROM follows WHERE following_id = $1`,
      [userId]
    );
    const followingRes = await query(
      `SELECT COUNT(*) FROM follows WHERE follower_id = $1`,
      [userId]
    );
    followerCount = parseInt(followerRes.rows[0].count, 10);
    followingCount = parseInt(followingRes.rows[0].count, 10);
  } catch (e) {
    // Table may not exist yet; ignore for now
  }

  return {
    ...userRes.rows[0],
    followerCount,
    followingCount,
  };
};

/**
 * Find user by email
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} User object or null
 */
const findByEmail = async (email) => {
  const result = await query(
    "SELECT id, username, email, full_name, created_at FROM users WHERE email = $1",
    [email],
  );

  return result.rows[0] || null;
};

/**
 * Search users by username or full name
 * @param {string} searchTerm - Search term
 * @param {number} limit - Number of results to return
 * @param {number} offset - Number of results to skip
 * @returns {Promise<Array>} Array of users
 */
const search = async (searchTerm, limit = 10, offset = 0) => {
  const result = await query(
    `SELECT id, username, email, full_name, created_at
     FROM users
     WHERE full_name ILIKE $1 OR username ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${searchTerm}%`, limit, offset],
  );

  return result.rows;
};

// TODO: Implement updateUserProfile function for profile updates

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  findByUsername,
  verifyPassword,
  findUsersByName,
  getUserProfile,
  findByEmail,
  search,
};
