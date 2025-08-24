const { query } = require("../utils/database");

/**
 * Comment model for managing post comments
 * TODO: Implement this model for the comment functionality
 */

/**
 * Create a new comment on a post
 * @param {Object} data - { post_id, user_id, content }
 * @returns {Promise<Object>} Created comment
 */
const createComment = async ({ post_id, user_id, content }) => {
	const result = await query(
		`INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW())
		 RETURNING id, post_id, user_id, content, created_at, updated_at`,
		[post_id, user_id, content]
	);
	return result.rows[0];
};

/**
 * Update a comment's content
 * @param {number} comment_id
 * @param {string} content
 * @returns {Promise<Object|null>} Updated comment or null
 */
const updateComment = async (comment_id, content) => {
	const result = await query(
		`UPDATE comments SET content = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING id, post_id, user_id, content, created_at, updated_at`,
		[content, comment_id]
	);
	return result.rows[0] || null;
};

/**
 * Delete a comment by ID
 * @param {number} comment_id
 * @returns {Promise<boolean>} True if deleted
 */
const deleteComment = async (comment_id) => {
	const result = await query(
		`DELETE FROM comments WHERE id = $1`,
		[comment_id]
	);
	return result.rowCount > 0;
};

/**
 * Get all comments for a post
 * @param {number} post_id
 * @returns {Promise<Array>} Array of comments
 */
const getPostComments = async (post_id) => {
	const result = await query(
		`SELECT id, post_id, user_id, content, created_at, updated_at
		 FROM comments WHERE post_id = $1
		 ORDER BY created_at ASC`,
		[post_id]
	);
	return result.rows;
};

/**
 * Get a comment by ID
 * @param {number} comment_id
 * @returns {Promise<Object|null>} Comment or null
 */
const getCommentById = async (comment_id) => {
	const result = await query(
		`SELECT id, post_id, user_id, content, created_at, updated_at
		 FROM comments WHERE id = $1`,
		[comment_id]
	);
	return result.rows[0] || null;
};

/**
 * Count comments by post
 * @param {number} postId - Post ID
 * @returns {Promise<number>} Number of comments
 */
const countCommentsByPost = async (postId) => {
	const result = await query(
		`SELECT COUNT(*) as count FROM comments WHERE post_id = $1`,
		[postId]
	);
	
	return parseInt(result.rows[0].count);
};

module.exports = {
	createComment,
	updateComment,
	deleteComment,
	getPostComments,
	getCommentById,
	countCommentsByPost,
};
