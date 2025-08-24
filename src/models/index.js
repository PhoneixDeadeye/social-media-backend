/**
 * Model Wrappers for GraphQL
 * Provides a unified interface for all models
 */

const UserModel = require('./user');
const PostModel = require('./post');
const CommentModel = require('./comment');
const LikeModel = require('./like');
const FollowModel = require('./follow');

// User wrapper
const User = {
  findById: UserModel.getUserById,
  findByUsername: UserModel.findByUsername,
  findByEmail: UserModel.findByEmail,
  create: UserModel.createUser,
  search: UserModel.search,
};

// Post wrapper
const Post = {
  create: (data, userId) => PostModel.createPost({ ...data, user_id: userId }),
  findById: PostModel.getPostById,
  getByUser: (userId, limit, offset) => PostModel.getPostsByUserId(userId, limit, offset),
  getFeed: PostModel.getFeedPosts,
  update: (id, data, userId) => PostModel.updatePost(id, data, userId),
  delete: PostModel.deletePost,
  search: PostModel.searchPosts,
  getAll: PostModel.getAllPosts,
  countByUser: PostModel.countPostsByUser,
};

// Comment wrapper
const Comment = {
  create: (data, userId) => CommentModel.createComment({ ...data, user_id: userId }),
  findById: CommentModel.getCommentById,
  getByPost: (postId, limit, offset) => CommentModel.getPostComments(postId, limit, offset),
  update: (id, data, userId) => CommentModel.updateComment(id, data, userId),
  delete: CommentModel.deleteComment,
  countByPost: CommentModel.countCommentsByPost,
};

// Like wrapper
const Like = {
  create: (data, userId) => LikeModel.likePost(data.postId || data.post_id, userId),
  getByPost: (postId, limit, offset) => LikeModel.getPostLikes(postId, limit, offset),
  getByUser: (userId, limit, offset) => LikeModel.getUserLikes(userId, limit, offset),
  delete: LikeModel.unlikePost,
  countByPost: LikeModel.countLikesByPost,
  isLiked: LikeModel.hasUserLikedPost,
};

// Follow wrapper
const Follow = {
  create: (data, userId) => FollowModel.followUser(userId, data.followingId || data.following_id),
  getFollowers: FollowModel.getFollowers,
  getFollowing: FollowModel.getFollowing,
  getStats: async (userId) => {
    const stats = await FollowModel.getFollowCounts(userId);
    return {
      followersCount: stats.followers_count,
      followingCount: stats.following_count,
    };
  },
  delete: FollowModel.unfollowUser,
  isFollowing: FollowModel.isFollowing,
};

module.exports = {
  User,
  Post,
  Comment,
  Like,
  Follow,
};
