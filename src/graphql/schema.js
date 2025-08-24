/**
 * GraphQL Schema Definitions
 * Complete GraphQL implementation for all API endpoints
 */

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalar types
  scalar DateTime

  # User type
  type User {
    id: ID!
    username: String!
    email: String!
    fullName: String
    createdAt: DateTime!
    # Stats
    followersCount: Int
    followingCount: Int
    postsCount: Int
    # Relationships
    posts: [Post!]!
    followers: [User!]!
    following: [User!]!
    isFollowing: Boolean
  }

  # Post type
  type Post {
    id: ID!
    content: String!
    userId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    # Relationships
    author: User!
    comments: [Comment!]!
    likes: [Like!]!
    # Computed fields
    likesCount: Int!
    commentsCount: Int!
    isLiked: Boolean
  }

  # Comment type
  type Comment {
    id: ID!
    content: String!
    postId: ID!
    userId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    # Relationships
    post: Post!
    author: User!
  }

  # Like type
  type Like {
    id: ID!
    postId: ID!
    userId: ID!
    createdAt: DateTime!
    # Relationships
    post: Post!
    user: User!
  }

  # Authentication types
  type AuthPayload {
    token: String!
    user: User!
  }

  # Scheduled post type
  type ScheduledPost {
    jobId: String!
    postData: ScheduledPostData!
    scheduledTime: DateTime!
    status: String!
    createdAt: DateTime!
  }

  type ScheduledPostData {
    content: String!
  }

  # Input types
  input RegisterInput {
    username: String!
    email: String!
    password: String!
    fullName: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreatePostInput {
    content: String!
  }

  input UpdatePostInput {
    content: String!
  }

  input CreateCommentInput {
    content: String!
    postId: ID!
  }

  input UpdateCommentInput {
    content: String!
  }

  input SchedulePostInput {
    content: String!
    scheduledTime: DateTime!
  }

  # Query type
  type Query {
    # Authentication
    me: User

    # Users
    searchUsers(query: String!, limit: Int = 10, offset: Int = 0): [User!]!
    user(id: ID, username: String): User
    followers: [User!]!
    following: [User!]!
    userStats: UserStats!

    # Posts
    posts(limit: Int = 10, offset: Int = 0): [Post!]!
    post(id: ID!): Post
    myPosts(limit: Int = 10, offset: Int = 0): [Post!]!
    userPosts(userId: ID!, limit: Int = 10, offset: Int = 0): [Post!]!
    feed(limit: Int = 10, offset: Int = 0): [Post!]!
    searchPosts(query: String!, limit: Int = 10, offset: Int = 0): [Post!]!

    # Comments
    postComments(postId: ID!, limit: Int = 10, offset: Int = 0): [Comment!]!

    # Likes
    postLikes(postId: ID!, limit: Int = 10, offset: Int = 0): [Like!]!
    userLikes(userId: ID!, limit: Int = 10, offset: Int = 0): [Like!]!

    # Scheduled posts
    scheduledPosts: [ScheduledPost!]!

    # System
    health: HealthStatus!
  }

  # Mutation type
  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Posts
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!

    # Comments
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!

    # Likes
    likePost(postId: ID!): Like!
    unlikePost(postId: ID!): Boolean!

    # Follow system
    followUser(userId: ID!): Boolean!
    unfollowUser(userId: ID!): Boolean!

    # Scheduled posts
    schedulePost(input: SchedulePostInput!): ScheduledPost!
    cancelScheduledPost(jobId: String!): Boolean!
  }

  # Additional types
  type UserStats {
    followersCount: Int!
    followingCount: Int!
    postsCount: Int!
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    database: String!
    redis: String!
  }
`;

module.exports = typeDefs;
