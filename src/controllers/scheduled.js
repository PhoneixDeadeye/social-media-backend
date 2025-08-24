/**
 * Scheduled Posts Controller
 * Handles scheduling, canceling, and managing scheduled posts
 */

const { schedulePost, cancelScheduledPost, getScheduledPosts, getQueueStats } = require('../utils/jobQueue');
const { createPostSchema } = require('../utils/validation');
const { critical: logError, verbose } = require('../utils/logger');

/**
 * Schedule a post to be published later
 * POST /api/posts/schedule
 */
const scheduleNewPost = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, scheduledTime } = req.body;
        
        // Validate the post content
        const { error } = createPostSchema.validate({ content });
        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details[0].message
            });
        }
        
        // Validate scheduled time
        if (!scheduledTime) {
            return res.status(400).json({
                error: 'Scheduled time is required'
            });
        }
        
        const scheduledDate = new Date(scheduledTime);
        const now = new Date();
        
        if (scheduledDate <= now) {
            return res.status(400).json({
                error: 'Scheduled time must be in the future'
            });
        }
        
        // Maximum scheduling time (e.g., 1 year from now)
        const maxScheduleTime = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        if (scheduledDate > maxScheduleTime) {
            return res.status(400).json({
                error: 'Cannot schedule posts more than 1 year in advance'
            });
        }
        
        const postData = {
            content,
            // Add any other post fields here (media, etc.)
        };
        
        const result = await schedulePost(postData, userId, scheduledDate);
        
        verbose('Post scheduled by user:', { userId, scheduledTime: scheduledDate });
        
        res.status(201).json({
            message: 'Post scheduled successfully',
            data: {
                jobId: result.jobId,
                scheduledTime: scheduledDate,
                status: result.status,
                postData
            }
        });
        
    } catch (err) {
        logError('Error scheduling post:', err);
        res.status(500).json({
            error: 'Failed to schedule post',
            message: err.message
        });
    }
};

/**
 * Get all scheduled posts for the authenticated user
 * GET /api/posts/scheduled
 */
const getUserScheduledPosts = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const scheduledPosts = await getScheduledPosts(userId);
        
        res.json({
            message: 'Scheduled posts retrieved successfully',
            data: scheduledPosts,
            count: scheduledPosts.length
        });
        
    } catch (err) {
        logError('Error getting scheduled posts:', err);
        res.status(500).json({
            error: 'Failed to retrieve scheduled posts',
            message: err.message
        });
    }
};

/**
 * Cancel a scheduled post
 * DELETE /api/posts/scheduled/:jobId
 */
const cancelScheduledPostById = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;
        
        if (!jobId) {
            return res.status(400).json({
                error: 'Job ID is required'
            });
        }
        
        // First, verify that this job belongs to the user
        const userScheduledPosts = await getScheduledPosts(userId);
        const userJob = userScheduledPosts.find(job => job.jobId === jobId);
        
        if (!userJob) {
            return res.status(404).json({
                error: 'Scheduled post not found or does not belong to you'
            });
        }
        
        const result = await cancelScheduledPost(jobId);
        
        verbose('Scheduled post cancelled by user:', { userId, jobId });
        
        res.json({
            message: 'Scheduled post cancelled successfully',
            data: result
        });
        
    } catch (err) {
        logError('Error cancelling scheduled post:', err);
        res.status(500).json({
            error: 'Failed to cancel scheduled post',
            message: err.message
        });
    }
};

/**
 * Get queue statistics (admin endpoint)
 * GET /api/admin/queue/stats
 */
const getScheduleQueueStats = async (req, res) => {
    try {
        const stats = await getQueueStats();
        
        res.json({
            message: 'Queue statistics retrieved successfully',
            data: stats
        });
        
    } catch (err) {
        logError('Error getting queue stats:', err);
        res.status(500).json({
            error: 'Failed to retrieve queue statistics',
            message: err.message
        });
    }
};

module.exports = {
    scheduleNewPost,
    getUserScheduledPosts,
    cancelScheduledPostById,
    getScheduleQueueStats
};
