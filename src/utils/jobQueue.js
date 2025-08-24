/**
 * Job Queue Manager for Scheduled Posts
 * Uses Bull with Redis for reliable job scheduling
 * Falls back to in-memory scheduling for development/testing
 */

const Queue = require('bull');
const { verbose, critical: logError } = require('./logger');

let scheduledPostsQueue;
let isRedisAvailable = false;

// In-memory storage for fallback
const inMemoryJobs = new Map();
let jobIdCounter = 1;

// Test Redis connection
const testRedisConnection = async () => {
    try {
        const testQueue = new Queue('test', {
            redis: {
                port: process.env.REDIS_PORT || 6379,
                host: process.env.REDIS_HOST || 'localhost',
            },
        });
        
        await testQueue.add('test', {});
        await testQueue.close();
        return true;
    } catch (err) {
        return false;
    }
};

// Initialize queue
const initializeQueue = async () => {
    try {
        isRedisAvailable = await testRedisConnection();
        
        if (isRedisAvailable) {
            scheduledPostsQueue = new Queue('scheduled posts', {
                redis: {
                    port: process.env.REDIS_PORT || 6379,
                    host: process.env.REDIS_HOST || 'localhost',
                },
                defaultJobOptions: {
                    removeOnComplete: 10,
                    removeOnFail: 50,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            });

            // Process scheduled posts when they're due
            scheduledPostsQueue.process('createPost', async (job) => {
                const { postData, userId } = job.data;
                
                try {
                    verbose('Processing scheduled post:', { postData, userId, jobId: job.id });
                    
                    const Post = require('../models/post');
                    const result = await Post.createPost({ ...postData, user_id: userId });
                    
                    verbose('Scheduled post created successfully:', { postId: result.id, jobId: job.id });
                    
                    return { success: true, postId: result.id, message: 'Scheduled post published successfully' };
                    
                } catch (err) {
                    logError('Failed to create scheduled post:', err);
                    throw err;
                }
            });

            verbose('Bull queue initialized with Redis');
        } else {
            verbose('Redis not available, using in-memory scheduling');
        }
    } catch (err) {
        logError('Failed to initialize job queue:', err);
        isRedisAvailable = false;
        verbose('Falling back to in-memory scheduling');
    }
};

// Initialize on module load
initializeQueue();

/**
 * Schedule a post to be published at a specific time
 * @param {Object} postData - The post data (content, media, etc.)
 * @param {number} userId - The ID of the user creating the post
 * @param {Date} scheduledTime - When the post should be published
 * @returns {Promise<Object>} Job information
 */
const schedulePost = async (postData, userId, scheduledTime) => {
    try {
        const delay = new Date(scheduledTime) - new Date();
        
        if (delay <= 0) {
            throw new Error('Scheduled time must be in the future');
        }
        
        if (isRedisAvailable && scheduledPostsQueue) {
            // Use Bull queue with Redis
            const job = await scheduledPostsQueue.add(
                'createPost',
                { postData, userId },
                {
                    delay,
                    jobId: `scheduled-post-${userId}-${Date.now()}`,
                }
            );
            
            verbose('Post scheduled with Redis:', {
                jobId: job.id,
                userId,
                scheduledTime,
                delay: `${Math.round(delay / 1000)} seconds`
            });
            
            return {
                jobId: job.id,
                scheduledTime,
                status: 'scheduled',
                message: 'Post scheduled successfully'
            };
        } else {
            // Use in-memory fallback
            const jobId = `memory-job-${jobIdCounter++}`;
            const jobData = {
                id: jobId,
                postData,
                userId,
                scheduledTime,
                status: 'scheduled',
                createdAt: new Date()
            };
            
            inMemoryJobs.set(jobId, jobData);
            
            // Set timeout to execute the job
            setTimeout(async () => {
                try {
                    verbose('Processing in-memory scheduled post:', { jobId, userId });
                    const Post = require('../models/post');
                    await Post.createPost({ ...postData, user_id: userId });
                    inMemoryJobs.delete(jobId);
                    verbose('In-memory scheduled post created successfully:', { jobId });
                } catch (err) {
                    logError('Failed to create in-memory scheduled post:', err);
                    const job = inMemoryJobs.get(jobId);
                    if (job) {
                        job.status = 'failed';
                        job.error = err.message;
                    }
                }
            }, delay);
            
            verbose('Post scheduled in-memory:', {
                jobId,
                userId,
                scheduledTime,
                delay: `${Math.round(delay / 1000)} seconds`
            });
            
            return {
                jobId,
                scheduledTime,
                status: 'scheduled',
                message: 'Post scheduled successfully (in-memory)'
            };
        }
        
    } catch (err) {
        logError('Failed to schedule post:', err);
        throw err;
    }
};

/**
 * Cancel a scheduled post
 * @param {string} jobId - The job ID to cancel
 * @returns {Promise<Object>} Cancellation result
 */
const cancelScheduledPost = async (jobId) => {
    try {
        if (isRedisAvailable && scheduledPostsQueue && !jobId.startsWith('memory-job-')) {
            // Use Bull queue
            const job = await scheduledPostsQueue.getJob(jobId);
            
            if (!job) {
                throw new Error('Scheduled post not found');
            }
            
            await job.remove();
            
            verbose('Redis scheduled post cancelled:', { jobId });
            
            return {
                jobId,
                status: 'cancelled',
                message: 'Scheduled post cancelled successfully'
            };
        } else {
            // Use in-memory fallback
            if (!inMemoryJobs.has(jobId)) {
                throw new Error('Scheduled post not found');
            }
            
            inMemoryJobs.delete(jobId);
            
            verbose('In-memory scheduled post cancelled:', { jobId });
            
            return {
                jobId,
                status: 'cancelled',
                message: 'Scheduled post cancelled successfully (in-memory)'
            };
        }
        
    } catch (err) {
        logError('Failed to cancel scheduled post:', err);
        throw err;
    }
};

/**
 * Get scheduled posts for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} List of scheduled posts
 */
const getScheduledPosts = async (userId) => {
    try {
        if (isRedisAvailable && scheduledPostsQueue) {
            // Use Bull queue
            const jobs = await scheduledPostsQueue.getJobs(['delayed', 'waiting']);
            
            const userJobs = jobs
                .filter(job => job.data.userId === userId)
                .map(job => ({
                    jobId: job.id,
                    postData: job.data.postData,
                    scheduledTime: new Date(job.processedOn + job.opts.delay),
                    status: job.opts.delay > 0 ? 'scheduled' : 'processing',
                    createdAt: new Date(job.timestamp)
                }));
            
            return userJobs;
        } else {
            // Use in-memory fallback
            const userJobs = Array.from(inMemoryJobs.values())
                .filter(job => job.userId === userId)
                .map(job => ({
                    jobId: job.id,
                    postData: job.postData,
                    scheduledTime: job.scheduledTime,
                    status: job.status,
                    createdAt: job.createdAt
                }));
            
            return userJobs;
        }
        
    } catch (err) {
        logError('Failed to get scheduled posts:', err);
        throw err;
    }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
const getQueueStats = async () => {
    try {
        if (isRedisAvailable && scheduledPostsQueue) {
            // Use Bull queue
            const waiting = await scheduledPostsQueue.getWaiting();
            const active = await scheduledPostsQueue.getActive();
            const completed = await scheduledPostsQueue.getCompleted();
            const failed = await scheduledPostsQueue.getFailed();
            const delayed = await scheduledPostsQueue.getDelayed();
            
            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                total: waiting.length + active.length + completed.length + failed.length + delayed.length,
                type: 'redis'
            };
        } else {
            // Use in-memory fallback
            const jobs = Array.from(inMemoryJobs.values());
            const scheduled = jobs.filter(job => job.status === 'scheduled').length;
            const failed = jobs.filter(job => job.status === 'failed').length;
            
            return {
                waiting: 0,
                active: 0,
                completed: 0,
                failed,
                delayed: scheduled,
                total: jobs.length,
                type: 'in-memory'
            };
        }
        
    } catch (err) {
        logError('Failed to get queue stats:', err);
        throw err;
    }
};

module.exports = {
    scheduledPostsQueue,
    schedulePost,
    cancelScheduledPost,
    getScheduledPosts,
    getQueueStats,
    isRedisAvailable: () => isRedisAvailable
};
