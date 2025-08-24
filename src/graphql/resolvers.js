/**
 * GraphQL Resolvers
 * Implements all GraphQL operations using existing controllers and models
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Post, Comment, Like, Follow } = require('../models');
const { schedulePost, cancelScheduledPost, getScheduledPosts } = require('../utils/jobQueue');
const { testRedisConnection } = require('../utils/redis');
const { query } = require('../utils/database');
const { critical: logError, verbose } = require('../utils/logger');

const resolvers = {
  // Custom scalar for DateTime
  DateTime: {
    serialize: (value) => value.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value),
  },

  Query: {
    // Authentication
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await User.findById(user.userId);
    },

    // Users
    searchUsers: async (_, { query, limit = 10, offset = 0 }) => {
      return await User.search(query, limit, offset);
    },

    user: async (_, { id, username }) => {
      if (id) {
        return await User.findById(id);
      } else if (username) {
        return await User.findByUsername(username);
      } else {
        throw new Error('Either id or username must be provided');
      }
    },

    followers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Follow.getFollowers(user.userId);
    },

    following: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Follow.getFollowing(user.userId);
    },

    userStats: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const stats = await Follow.getStats(user.userId);
      const postsCount = await Post.countByUser(user.userId);
      return {
        followersCount: stats.followersCount,
        followingCount: stats.followingCount,
        postsCount
      };
    },

    // Posts
    posts: async (_, { limit = 10, offset = 0 }) => {
      return await Post.getAll(limit, offset);
    },

    post: async (_, { id }) => {
      if (!id || id === 'undefined') {
        throw new Error('Post ID is required');
      }
      return await Post.findById(id);
    },

    myPosts: async (_, { limit = 10, offset = 0 }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Post.getByUser(user.userId, limit, offset);
    },

    userPosts: async (_, { userId, limit = 10, offset = 0 }) => {
      return await Post.getByUser(userId, limit, offset);
    },

    feed: async (_, { limit = 10, offset = 0 }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Post.getFeed(user.userId, limit, offset);
    },

    searchPosts: async (_, { query, limit = 10, offset = 0 }) => {
      return await Post.search(query, limit, offset);
    },

    // Comments
    postComments: async (_, { postId, limit = 10, offset = 0 }) => {
      return await Comment.getByPost(postId, limit, offset);
    },

    // Likes
    postLikes: async (_, { postId, limit = 10, offset = 0 }) => {
      return await Like.getByPost(postId, limit, offset);
    },

    userLikes: async (_, { userId, limit = 10, offset = 0 }) => {
      return await Like.getByUser(userId, limit, offset);
    },

    // Scheduled posts
    scheduledPosts: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await getScheduledPosts(user.userId);
    },

    // System
    health: async () => {
      try {
        // Test database connection
        const testQuery = await query('SELECT 1');
        const dbStatus = testQuery ? 'connected' : 'disconnected';
        
        // Test Redis connection
        const { testRedisConnection } = require('../utils/redis');
        let redisStatus = 'disconnected';
        try {
          const isRedisConnected = await testRedisConnection();
          redisStatus = isRedisConnected ? 'connected' : 'disconnected';
        } catch (error) {
          redisStatus = 'disconnected';
        }
        
        return {
          status: 'OK',
          timestamp: new Date(),
          database: dbStatus,
          redis: redisStatus
        };
      } catch (error) {
        return {
          status: 'ERROR',
          timestamp: new Date(),
          database: 'disconnected',
          redis: 'unknown'
        };
      }
    },
  },

  Mutation: {
    // Authentication
    register: async (_, { input }) => {
      const { username, email, password, fullName } = input;
      
      // Check if user exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const userData = {
        username,
        email,
        password: hashedPassword,
        full_name: fullName
      };

      const user = await User.create(userData);

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return { token, user };
    },

    login: async (_, { input }) => {
      const { email, password } = input;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return { token, user };
    },

    // Posts
    createPost: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Post.create(input, user.userId);
    },

    updatePost: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const post = await Post.findById(id);
      if (!post) throw new Error('Post not found');
      if (post.userId !== user.userId) throw new Error('Not authorized');
      
      return await Post.update(id, input, user.userId);
    },

    deletePost: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const post = await Post.findById(id);
      if (!post) throw new Error('Post not found');
      if (post.userId !== user.userId) throw new Error('Not authorized');
      
      await Post.delete(id, user.userId);
      return true;
    },

    // Comments
    createComment: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Comment.create(input, user.userId);
    },

    updateComment: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const comment = await Comment.findById(id);
      if (!comment) throw new Error('Comment not found');
      if (comment.userId !== user.userId) throw new Error('Not authorized');
      
      return await Comment.update(id, input, user.userId);
    },

    deleteComment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const comment = await Comment.findById(id);
      if (!comment) throw new Error('Comment not found');
      if (comment.userId !== user.userId) throw new Error('Not authorized');
      
      await Comment.delete(id, user.userId);
      return true;
    },

    // Likes
    likePost: async (_, { postId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await Like.create({ postId }, user.userId);
    },

    unlikePost: async (_, { postId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Like.delete(postId, user.userId);
      return true;
    },

    // Follow system
    followUser: async (_, { userId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (userId === user.userId) throw new Error('Cannot follow yourself');
      
      await Follow.create({ followingId: userId }, user.userId);
      return true;
    },

    unfollowUser: async (_, { userId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Follow.delete(userId, user.userId);
      return true;
    },

    // Scheduled posts
    schedulePost: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { content, scheduledTime } = input;
      const scheduledDate = new Date(scheduledTime);
      
      if (scheduledDate <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      
      const result = await schedulePost({ content }, user.userId, scheduledDate);
      
      return {
        jobId: result.jobId,
        postData: { content },
        scheduledTime: scheduledDate,
        status: result.status,
        createdAt: new Date()
      };
    },

    cancelScheduledPost: async (_, { jobId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Verify the job belongs to the user
      const userJobs = await getScheduledPosts(user.userId);
      const userJob = userJobs.find(job => job.jobId === jobId);
      
      if (!userJob) {
        throw new Error('Scheduled post not found or does not belong to you');
      }
      
      await cancelScheduledPost(jobId);
      return true;
    },
  },

  // Field resolvers
  User: {
    fullName: (parent) => parent.full_name || parent.fullName,
    
    posts: async (parent) => {
      return await Post.getByUser(parent.id);
    },
    
    followers: async (parent) => {
      return await Follow.getFollowers(parent.id);
    },
    
    following: async (parent) => {
      return await Follow.getFollowing(parent.id);
    },
    
    followersCount: async (parent) => {
      const stats = await Follow.getStats(parent.id);
      return stats.followersCount || 0;
    },
    
    followingCount: async (parent) => {
      const stats = await Follow.getStats(parent.id);
      return stats.followingCount || 0;
    },
    
    postsCount: async (parent) => {
      const count = await Post.countByUser(parent.id);
      return count || 0;
    },
    
    isFollowing: async (parent, __, { user }) => {
      if (!user || user.id === parent.id) return false;
      return await Follow.isFollowing(user.id, parent.id);
    },
  },

  UserStats: {
    followersCount: async (parent) => {
      return parent.followersCount || 0;
    },
    
    followingCount: async (parent) => {
      return parent.followingCount || 0;
    },
    
    postsCount: async (parent) => {
      return parent.postsCount || 0;
    },
  },

  User: {
    fullName: (parent) => parent.full_name || parent.fullName,
    createdAt: (parent) => {
      const date = parent.created_at || parent.createdAt;
      return date ? new Date(date) : null;
    },
    followersCount: async (parent) => {
      const stats = await Follow.getStats(parent.id);
      return stats.followersCount || 0;
    },
    followingCount: async (parent) => {
      const stats = await Follow.getStats(parent.id);
      return stats.followingCount || 0;
    },
    postsCount: async (parent) => {
      return await Post.countByUser(parent.id);
    },
  },

  Post: {
    author: async (parent) => {
      // Handle both user_id and userId field names
      const userId = parent.user_id || parent.userId;
      if (!userId) return null;
      return await User.findById(userId);
    },
    
    createdAt: (parent) => {
      // Handle both created_at and createdAt field names
      const date = parent.created_at || parent.createdAt;
      return date ? new Date(date) : null;
    },
    
    updatedAt: (parent) => {
      // Handle both updated_at and updatedAt field names  
      const date = parent.updated_at || parent.updatedAt;
      return date ? new Date(date) : null;
    },
    
    comments: async (parent) => {
      return await Comment.getByPost(parent.id);
    },
    
    likes: async (parent) => {
      return await Like.getByPost(parent.id);
    },
    
    likesCount: async (parent) => {
      return await Like.countByPost(parent.id);
    },
    
    commentsCount: async (parent) => {
      return await Comment.countByPost(parent.id);
    },
    
    isLiked: async (parent, __, { user }) => {
      if (!user) return false;
      return await Like.isLiked(user.id, parent.id);
    },
  },

  Comment: {
    post: async (parent) => {
      return await Post.findById(parent.postId);
    },
    
    author: async (parent) => {
      return await User.findById(parent.userId);
    },
  },

  Like: {
    post: async (parent) => {
      return await Post.findById(parent.postId);
    },
    
    user: async (parent) => {
      return await User.findById(parent.userId);
    },
  },
};

module.exports = resolvers;
