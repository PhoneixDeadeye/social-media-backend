/**
 * Scheduled Posts Routes
 * Routes for managing scheduled content posting
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    scheduleNewPost,
    getUserScheduledPosts,
    cancelScheduledPostById,
    getScheduleQueueStats
} = require('../controllers/scheduled');

/**
 * @route POST /api/posts/schedule
 * @desc Schedule a post to be published later
 * @access Private
 * @body {string} content - Post content
 * @body {string} scheduledTime - ISO date string for when to publish
 */
router.post('/schedule', authenticateToken, scheduleNewPost);

/**
 * @route GET /api/posts/scheduled
 * @desc Get all scheduled posts for the authenticated user
 * @access Private
 */
router.get('/scheduled', authenticateToken, getUserScheduledPosts);

/**
 * @route DELETE /api/posts/scheduled/:jobId
 * @desc Cancel a scheduled post
 * @access Private
 * @param {string} jobId - The job ID of the scheduled post
 */
router.delete('/scheduled/:jobId', authenticateToken, cancelScheduledPostById);

/**
 * @route GET /api/admin/queue/stats
 * @desc Get queue statistics (admin only)
 * @access Private (Admin)
 */
router.get('/admin/queue/stats', authenticateToken, getScheduleQueueStats);

module.exports = router;
