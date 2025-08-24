const request = require('supertest');
const app = require('../src/app');

describe('All Routes Comprehensive Tests', () => {
    let authTokens = [];
    let userIds = [];
    let postIds = [];
    let commentIds = [];

    beforeAll(async () => {
        // Create multiple test users for comprehensive testing
        for (let i = 1; i <= 5; i++) {
            const userData = {
                username: `testuser${i}${Date.now()}`,
                email: `testuser${i}${Date.now()}@example.com`,
                password: 'password123',
                full_name: `Test User ${i}`
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            if (!response.body.token || !response.body.user) {
                console.error('Registration failed:', response.body);
                throw new Error('Registration failed');
            }

            authTokens[i-1] = response.body.token;
            userIds[i-1] = response.body.user.id;
        }
    });

    describe('Authentication Routes - Comprehensive', () => {
        test('POST /api/auth/register - all validation scenarios', async () => {
            // Test missing username
            let response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `test${Date.now()}@example.com`,
                    password: 'password123',
                    full_name: 'Test User'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Test missing email
            response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `test${Date.now()}`,
                    password: 'password123',
                    full_name: 'Test User'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Test missing password
            response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `test${Date.now()}`,
                    email: `test${Date.now()}@example.com`,
                    full_name: 'Test User'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Test weak password
            response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `test${Date.now()}`,
                    email: `test${Date.now()}@example.com`,
                    password: '123',
                    full_name: 'Test User'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Test invalid email format
            response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `test${Date.now()}`,
                    email: 'invalid-email',
                    password: 'password123',
                    full_name: 'Test User'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();
        });

        test('POST /api/auth/login - comprehensive login tests', async () => {
            // Create user for login tests
            const userData = {
                username: `logintest${Date.now()}`,
                email: `logintest${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'Login Test'
            };

            await request(app)
                .post('/api/auth/register')
                .send(userData);

            // Successful login
            let response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: userData.username,
                    password: userData.password
                })
                .expect(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toBeDefined();

            // Wrong password
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: userData.username,
                    password: 'wrongpassword'
                })
                .expect(401);
            expect(response.body.error).toBeDefined();

            // Non-existent user
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'password123'
                })
                .expect(401);
            expect(response.body.error).toBeDefined();

            // Missing username
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'password123'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Missing password
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: userData.username
                })
                .expect(400);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('Posts Routes - All Scenarios', () => {
        test('POST /api/posts - create posts with different configurations', async () => {
            // Create post with comments enabled
            let response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Post with comments enabled',
                    comments_enabled: true
                })
                .expect(201);
            
            postIds[0] = response.body.post.id;
            expect(response.body.post.comments_enabled).toBe(true);

            // Create post with comments disabled
            response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[1]}`)
                .send({
                    content: 'Post with comments disabled',
                    comments_enabled: false
                })
                .expect(201);
            
            postIds[1] = response.body.post.id;
            expect(response.body.post.comments_enabled).toBe(false);

            // Create post with minimal content
            response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[2]}`)
                .send({
                    content: 'a'
                })
                .expect(201);
            
            postIds[2] = response.body.post.id;

            // Create post with maximum content (assuming limit exists)
            const longContent = 'a'.repeat(1000);
            response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[3]}`)
                .send({
                    content: longContent
                })
                .expect(201);
            
            postIds[3] = response.body.post.id;

            // Test empty content
            response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: ''
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Test without authorization
            response = await request(app)
                .post('/api/posts')
                .send({
                    content: 'Unauthorized post'
                })
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/posts - retrieve posts with various filters', async () => {
            // Get all posts
            let response = await request(app)
                .get('/api/posts')
                .expect(200);
            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);

            // Get posts with pagination
            response = await request(app)
                .get('/api/posts?page=1&limit=10')
                .expect(200);
            expect(response.body.posts).toBeDefined();

            // Get posts with invalid pagination
            response = await request(app)
                .get('/api/posts?page=-1&limit=0')
                .expect(200);
            expect(response.body.posts).toBeDefined();
        });

        test('GET /api/posts/:id - get specific post scenarios', async () => {
            // Get existing post
            let response = await request(app)
                .get(`/api/posts/${postIds[0]}`)
                .expect(200);
            expect(response.body.post.id).toBe(postIds[0]);

            // Get non-existent post
            response = await request(app)
                .get('/api/posts/99999')
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Get post with invalid ID format
            response = await request(app)
                .get('/api/posts/invalid-id')
                .expect(404);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/posts/my - user posts with authorization', async () => {
            // Get own posts
            let response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(200);
            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);

            // Get posts without authorization
            response = await request(app)
                .get('/api/posts/my')
                .expect(401);
            expect(response.body.error).toBeDefined();

            // Get posts with invalid token
            response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/posts/search - search functionality', async () => {
            // Search with valid query
            let response = await request(app)
                .get('/api/posts/search?q=test')
                .expect(200);
            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);

            // Search with empty query
            response = await request(app)
                .get('/api/posts/search?q=')
                .expect(200);
            expect(response.body.posts).toBeDefined();

            // Search without query parameter
            response = await request(app)
                .get('/api/posts/search')
                .expect(200);
            expect(response.body.posts).toBeDefined();

            // Search with special characters (minimum 2 chars required)
            response = await request(app)
                .get('/api/posts/search?q=ab')
                .expect(200);
            expect(response.body.posts).toBeDefined();
        });

        test('PUT /api/posts/:id - update post scenarios', async () => {
            // Update own post
            let response = await request(app)
                .put(`/api/posts/${postIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Updated content for post'
                })
                .expect(200);
            expect(response.body.post.content).toBe('Updated content for post');

            // Try to update someone else's post
            response = await request(app)
                .put(`/api/posts/${postIds[1]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Trying to update others post'
                })
                .expect(403);
            expect(response.body.error).toBeDefined();

            // Update with empty content
            response = await request(app)
                .put(`/api/posts/${postIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: ''
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Update non-existent post
            response = await request(app)
                .put('/api/posts/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Updated content'
                })
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Update without authorization
            response = await request(app)
                .put(`/api/posts/${postIds[0]}`)
                .send({
                    content: 'Unauthorized update'
                })
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('DELETE /api/posts/:id - delete post scenarios', async () => {
            // Create post to delete
            let createResponse = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Post to be deleted'
                });

            // Delete own post
            let response = await request(app)
                .delete(`/api/posts/${createResponse.body.post.id}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(204);

            // Try to delete someone else's post
            response = await request(app)
                .delete(`/api/posts/${postIds[1]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(403);
            expect(response.body.error).toBeDefined();

            // Delete non-existent post
            response = await request(app)
                .delete('/api/posts/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Delete without authorization
            response = await request(app)
                .delete(`/api/posts/${postIds[2]}`)
                .expect(401);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('Comments Routes - Complete Testing', () => {
        test('POST /api/comments - create comments with all scenarios', async () => {
            // Create comment on post with comments enabled
            let response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authTokens[1]}`)
                .send({
                    post_id: postIds[0],
                    content: 'Test comment on enabled post'
                })
                .expect(201);
            
            commentIds[0] = response.body.id;
            expect(response.body.content).toBe('Test comment on enabled post');

            // Try to comment on post with comments disabled
            response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: postIds[1],
                    content: 'Test comment on disabled post'
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Create comment with empty content
            response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: postIds[0],
                    content: ''
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Comment on non-existent post
            response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: 99999,
                    content: 'Comment on non-existent post'
                })
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Comment without authorization
            response = await request(app)
                .post('/api/comments')
                .send({
                    post_id: postIds[0],
                    content: 'Unauthorized comment'
                })
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/comments/:postId - get comments scenarios', async () => {
            // Get comments for post with comments
            let response = await request(app)
                .get(`/api/comments/post/${postIds[0]}`)
                .expect(200);
            expect(response.body.comments).toBeDefined();
            expect(Array.isArray(response.body.comments)).toBe(true);
            expect(response.body.comments.length).toBeGreaterThan(0);

            // Get comments for post without comments
            response = await request(app)
                .get(`/api/comments/${postIds[2]}`)
                .expect(200);
            expect(response.body.comments).toBeDefined();
            expect(Array.isArray(response.body.comments)).toBe(true);

            // Get comments for non-existent post
            response = await request(app)
                .get('/api/comments/99999')
                .expect(404);
            expect(response.body.error).toBeDefined();
        });

        test('PUT /api/comments/:id - update comment scenarios', async () => {
            // Update own comment
            let response = await request(app)
                .put(`/api/comments/${commentIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[1]}`)
                .send({
                    content: 'Updated comment content'
                })
                .expect(200);
            expect(response.body.comment.content).toBe('Updated comment content');

            // Try to update someone else's comment
            response = await request(app)
                .put(`/api/comments/${commentIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Trying to update others comment'
                })
                .expect(403);
            expect(response.body.error).toBeDefined();

            // Update with empty content
            response = await request(app)
                .put(`/api/comments/${commentIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[1]}`)
                .send({
                    content: ''
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Update non-existent comment
            response = await request(app)
                .put('/api/comments/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    content: 'Updated content'
                })
                .expect(404);
            expect(response.body.error).toBeDefined();
        });

        test('DELETE /api/comments/:id - delete comment scenarios', async () => {
            // Create comment to delete
            let createResponse = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: postIds[0],
                    content: 'Comment to be deleted'
                });

            // Delete own comment
            let response = await request(app)
                .delete(`/api/comments/${createResponse.body.id}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(204);

            // Try to delete someone else's comment
            response = await request(app)
                .delete(`/api/comments/${commentIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(403);
            expect(response.body.error).toBeDefined();

            // Delete non-existent comment
            response = await request(app)
                .delete('/api/comments/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(404);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('Likes Routes - Comprehensive Testing', () => {
        test('POST /api/likes - like posts scenarios', async () => {
            // Like a post
            let response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: postIds[0]
                })
                .expect(201);
            expect(response.body.post_id).toBe(postIds[0]);

            // Try to like same post again
            response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: postIds[0]
                })
                .expect(409);
            expect(response.body.error).toBeDefined();

            // Like non-existent post
            response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    post_id: 99999
                })
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Like without authorization
            response = await request(app)
                .post('/api/likes')
                .send({
                    post_id: postIds[1]
                })
                .expect(401);
            expect(response.body.error).toBeDefined();

            // Like without post_id
            response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({})
                .expect(400);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/likes/:postId - get likes scenarios', async () => {
            // Get likes for post with likes
            let response = await request(app)
                .get(`/api/likes/post/${postIds[0]}`)
                .expect(200);
            expect(response.body.likes).toBeDefined();
            expect(Array.isArray(response.body.likes)).toBe(true);
            expect(response.body.likes.length).toBeGreaterThan(0);

            // Get likes for post without likes
            response = await request(app)
                .get(`/api/likes/${postIds[2]}`)
                .expect(200);
            expect(response.body.likes).toBeDefined();
            expect(Array.isArray(response.body.likes)).toBe(true);

            // Get likes for non-existent post
            response = await request(app)
                .get('/api/likes/99999')
                .expect(404);
            expect(response.body.error).toBeDefined();
        });

        test('DELETE /api/likes/:postId - unlike scenarios', async () => {
            // Unlike a liked post
            let response = await request(app)
                .delete(`/api/likes/${postIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(204);

            // Try to unlike already unliked post
            response = await request(app)
                .delete(`/api/likes/${postIds[0]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Unlike non-existent post
            response = await request(app)
                .delete('/api/likes/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Unlike without authorization
            response = await request(app)
                .delete(`/api/likes/${postIds[1]}`)
                .expect(401);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('Users/Follow Routes - Complete Testing', () => {
        test('POST /api/users/follow - follow scenarios', async () => {
            // Follow a user
            let response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    user_id: userIds[1]
                })
                .expect(201);
            expect(response.body.message).toBe('User followed successfully');

            // Try to follow same user again
            response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    user_id: userIds[1]
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Try to follow yourself
            response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    user_id: userIds[0]
                })
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Follow non-existent user
            response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .send({
                    user_id: 99999
                })
                .expect(404);
            expect(response.body.error).toBeDefined();

            // Follow without authorization
            response = await request(app)
                .post('/api/users/follow')
                .send({
                    user_id: userIds[2]
                })
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/users/following - get following list', async () => {
            // Get following list
            let response = await request(app)
                .get('/api/users/following')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(200);
            expect(response.body.following).toBeDefined();
            expect(Array.isArray(response.body.following)).toBe(true);

            // Get following without authorization
            response = await request(app)
                .get('/api/users/following')
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/users/followers - get followers list', async () => {
            // Get followers list
            let response = await request(app)
                .get('/api/users/followers')
                .set('Authorization', `Bearer ${authTokens[1]}`)
                .expect(200);
            expect(response.body.followers).toBeDefined();
            expect(Array.isArray(response.body.followers)).toBe(true);

            // Get followers without authorization
            response = await request(app)
                .get('/api/users/followers')
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/users/stats - get user statistics', async () => {
            // Get user stats
            let response = await request(app)
                .get('/api/users/stats')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(200);
            expect(response.body.followerCount).toBeDefined();
            expect(response.body.followingCount).toBeDefined();
            expect(typeof response.body.followerCount).toBe('number');
            expect(typeof response.body.followingCount).toBe('number');

            // Get stats without authorization
            response = await request(app)
                .get('/api/users/stats')
                .expect(401);
            expect(response.body.error).toBeDefined();
        });

        test('GET /api/users/search - search users', async () => {
            // Search users with query
            let response = await request(app)
                .get('/api/users/search?q=test')
                .expect(200);
            expect(response.body.users).toBeDefined();
            expect(Array.isArray(response.body.users)).toBe(true);

            // Search with empty query
            response = await request(app)
                .get('/api/users/search?q=')
                .expect(200);
            expect(response.body.users).toBeDefined();

            // Search without query
            response = await request(app)
                .get('/api/users/search')
                .expect(200);
            expect(response.body.users).toBeDefined();
        });

        test('DELETE /api/users/unfollow/:userId - unfollow scenarios', async () => {
            // Unfollow a followed user
            let response = await request(app)
                .delete(`/api/users/unfollow/${userIds[1]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(200);
            expect(response.body.message).toBe('User unfollowed successfully');

            // Try to unfollow already unfollowed user
            response = await request(app)
                .delete(`/api/users/unfollow/${userIds[1]}`)
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Unfollow non-existent user
            response = await request(app)
                .delete('/api/users/unfollow/99999')
                .set('Authorization', `Bearer ${authTokens[0]}`)
                .expect(400);
            expect(response.body.error).toBeDefined();

            // Unfollow without authorization
            response = await request(app)
                .delete(`/api/users/unfollow/${userIds[2]}`)
                .expect(401);
            expect(response.body.error).toBeDefined();
        });
    });

    describe('System Routes', () => {
        test('GET /health - health check', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('OK');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.uptime).toBeDefined();
        });

        test('GET / - root endpoint', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body.message).toBeDefined();
        });

        test('404 handling for invalid routes', async () => {
            const response = await request(app)
                .get('/api/invalid-route')
                .expect(404);

            expect(response.body.error).toBeDefined();
        });

        test('Method not allowed handling', async () => {
            const response = await request(app)
                .patch('/api/posts')
                .expect(404);
        });
    });
});
