const request = require('supertest');
const app = require('../src/app');

describe('Complete Endpoint Tests', () => {
    let token1, token2;
    let user1Id, user2Id;
    let postId1, postId2;
    let commentId1, commentId2;

    beforeAll(async () => {
        // Create test users
        const user1 = {
            username: `user1${Date.now()}`,
            email: `user1${Date.now()}@example.com`,
            password: 'password123',
            full_name: 'User One'
        };

        const user2 = {
            username: `user2${Date.now()}`,
            email: `user2${Date.now()}@example.com`,
            password: 'password123',
            full_name: 'User Two'
        };

        const res1 = await request(app).post('/api/auth/register').send(user1);
        const res2 = await request(app).post('/api/auth/register').send(user2);

        token1 = res1.body.token;
        token2 = res2.body.token;
        user1Id = res1.body.user.id;
        user2Id = res2.body.user.id;
    });

    describe('Authentication Endpoints', () => {
        test('POST /api/auth/register - valid registration', async () => {
            const userData = {
                username: `newuser${Date.now()}`,
                email: `newuser${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'New User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.token).toBeDefined();
        });

        test('POST /api/auth/register - invalid email format', async () => {
            const userData = {
                username: `invaliduser${Date.now()}`,
                email: 'invalid-email',
                password: 'password123',
                full_name: 'Invalid User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('POST /api/auth/register - short password', async () => {
            const userData = {
                username: `shortpass${Date.now()}`,
                email: `shortpass${Date.now()}@example.com`,
                password: '123',
                full_name: 'Short Pass User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('POST /api/auth/login - successful login', async () => {
            const loginData = {
                username: `loginuser${Date.now()}`,
                password: 'password123'
            };

            // Register first
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: loginData.username,
                    email: `login${Date.now()}@example.com`,
                    password: loginData.password,
                    full_name: 'Login User'
                });

            // Then login
            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.message).toBe('Login successful');
            expect(response.body.token).toBeDefined();
        });

        test('POST /api/auth/login - wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: `user1${Date.now() - 10000}`,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Posts Endpoints', () => {
        test('POST /api/posts - create post with all fields', async () => {
            const postData = {
                content: 'This is a comprehensive test post with detailed content',
                comments_enabled: true
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token1}`)
                .send(postData)
                .expect(201);

            expect(response.body.message).toBe('Post created successfully');
            expect(response.body.post.content).toBe(postData.content);
            expect(response.body.post.user_id).toBe(user1Id);
            postId1 = response.body.post.id;
        });

        test('POST /api/posts - create post without comments', async () => {
            const postData = {
                content: 'This post has comments disabled',
                comments_enabled: false
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token2}`)
                .send(postData)
                .expect(201);

            expect(response.body.post.comments_enabled).toBe(false);
            postId2 = response.body.post.id;
        });

        test('POST /api/posts - empty content should fail', async () => {
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token1}`)
                .send({ content: '' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('GET /api/posts/search - get posts with pagination', async () => {
            const response = await request(app)
                .get('/api/posts/search?q=test')
                .expect(200);

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
            expect(response.body.posts.length).toBeGreaterThan(0);
        });

        test('GET /api/posts/:id - get specific post', async () => {
            const response = await request(app)
                .get(`/api/posts/${postId1}`)
                .expect(200);

            expect(response.body.post.id).toBe(postId1);
            expect(response.body.post.content).toBeDefined();
        });

        test('GET /api/posts/my - get user posts', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('GET /api/posts/search - search posts', async () => {
            const response = await request(app)
                .get('/api/posts/search?q=test')
                .expect(200);

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('PUT /api/posts/:id - update own post', async () => {
            const updateData = {
                content: 'Updated post content with new information'
            };

            const response = await request(app)
                .put(`/api/posts/${postId1}`)
                .set('Authorization', `Bearer ${token1}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Post updated successfully');
            expect(response.body.post.content).toBe(updateData.content);
        });

        test('PUT /api/posts/:id - cannot update others post', async () => {
            const updateData = {
                content: 'Trying to update someone elses post'
            };

            const response = await request(app)
                .put(`/api/posts/${postId2}`)
                .set('Authorization', `Bearer ${token1}`)
                .send(updateData)
                .expect(403);

            expect(response.body.error).toBeDefined();
        });

        test('DELETE /api/posts/:id - delete own post', async () => {
            // Create a post to delete
            const postData = {
                content: 'Post to be deleted'
            };

            const createResponse = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token1}`)
                .send(postData);

            const deleteResponse = await request(app)
                .delete(`/api/posts/${createResponse.body.post.id}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(204);
        });
    });

    describe('Comments Endpoints', () => {
        test('POST /api/comments - create comment', async () => {
            const commentData = {
                post_id: postId1,
                content: 'This is a test comment on the post'
            };

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${token2}`)
                .send(commentData)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.content).toBe(commentData.content);
            commentId1 = response.body.id;
        });

        test('POST /api/comments - comment on post with comments disabled', async () => {
            const commentData = {
                post_id: postId2,
                content: 'Trying to comment on disabled post'
            };

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${token1}`)
                .send(commentData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('GET /api/comments/post/:postId - get post comments', async () => {
            const response = await request(app)
                .get(`/api/comments/post/${postId1}`)
                .expect(200);

            expect(response.body.comments).toBeDefined();
            expect(Array.isArray(response.body.comments)).toBe(true);
            expect(response.body.comments.length).toBeGreaterThan(0);
        });

        test('PUT /api/comments/:id - update own comment', async () => {
            const updateData = {
                content: 'Updated comment content'
            };

            const response = await request(app)
                .put(`/api/comments/${commentId1}`)
                .set('Authorization', `Bearer ${token2}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Comment updated successfully');
            expect(response.body.comment.content).toBe(updateData.content);
        });

        test('DELETE /api/comments/:id - delete own comment', async () => {
            // Create a comment to delete
            const commentData = {
                post_id: postId1,
                content: 'Comment to be deleted'
            };

            const createResponse = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${token1}`)
                .send(commentData);

            const deleteResponse = await request(app)
                .delete(`/api/comments/${createResponse.body.id}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(204);
        });
    });

    describe('Likes Endpoints', () => {
        test('POST /api/likes - like a post', async () => {
            const likeData = {
                post_id: postId1
            };

            const response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${token1}`)
                .send(likeData)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.post_id).toBe(postId1);
        });

        test('POST /api/likes - cannot like same post twice', async () => {
            const likeData = {
                post_id: postId1
            };

            const response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${token1}`)
                .send(likeData)
                .expect(409);

            expect(response.body.error).toBeDefined();
        });

        test('GET /api/likes/post/:postId - get post likes', async () => {
            const response = await request(app)
                .get(`/api/likes/post/${postId1}`)
                .expect(200);

            expect(response.body.likes).toBeDefined();
            expect(Array.isArray(response.body.likes)).toBe(true);
            expect(response.body.likes.length).toBeGreaterThan(0);
        });

        test('DELETE /api/likes/:postId - unlike a post', async () => {
            const response = await request(app)
                .delete(`/api/likes/${postId1}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(204);
        });

        test('DELETE /api/likes/:postId - cannot unlike not liked post', async () => {
            const response = await request(app)
                .delete(`/api/likes/${postId1}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Users/Follow Endpoints', () => {
        test('POST /api/users/follow - follow a user', async () => {
            const followData = {
                user_id: user2Id
            };

            const response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${token1}`)
                .send(followData)
                .expect(201);

            expect(response.body.message).toBe('User followed successfully');
        });

        test('POST /api/users/follow - cannot follow same user twice', async () => {
            const followData = {
                user_id: user2Id
            };

            const response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${token1}`)
                .send(followData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('POST /api/users/follow - cannot follow yourself', async () => {
            const followData = {
                user_id: user1Id
            };

            const response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${token1}`)
                .send(followData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('GET /api/users/following - get following list', async () => {
            const response = await request(app)
                .get('/api/users/following')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response.body.following).toBeDefined();
            expect(Array.isArray(response.body.following)).toBe(true);
            expect(response.body.following.length).toBeGreaterThan(0);
        });

        test('GET /api/users/followers - get followers list', async () => {
            const response = await request(app)
                .get('/api/users/followers')
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            expect(response.body.followers).toBeDefined();
            expect(Array.isArray(response.body.followers)).toBe(true);
            expect(response.body.followers.length).toBeGreaterThan(0);
        });

        test('GET /api/users/stats - get user statistics', async () => {
            const response = await request(app)
                .get('/api/users/stats')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response.body.followerCount).toBeDefined();
            expect(response.body.followingCount).toBeDefined();
            expect(typeof response.body.followerCount).toBe('number');
            expect(typeof response.body.followingCount).toBe('number');
        });

        test('GET /api/users/search - search users', async () => {
            const response = await request(app)
                .get('/api/users/search?q=user')
                .expect(200);

            expect(response.body.users).toBeDefined();
            expect(Array.isArray(response.body.users)).toBe(true);
        });

        test('DELETE /api/users/unfollow/:userId - unfollow user', async () => {
            const response = await request(app)
                .delete(`/api/users/unfollow/${user2Id}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            expect(response.body.message).toBe('User unfollowed successfully');
        });

        test('DELETE /api/users/unfollow/:userId - cannot unfollow not followed user', async () => {
            const response = await request(app)
                .delete(`/api/users/unfollow/${user2Id}`)
                .set('Authorization', `Bearer ${token1}`)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle non-existent post ID', async () => {
            const response = await request(app)
                .get('/api/posts/99999')
                .expect(404);

            expect(response.body.error).toBeDefined();
        });

        test('should handle non-existent user ID for follow', async () => {
            const followData = {
                user_id: 99999
            };

            const response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${token1}`)
                .send(followData)
                .expect(404);

            expect(response.body.error).toBeDefined();
        });

        test('should handle invalid authorization token', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        test('should handle missing authorization header', async () => {
            const response = await request(app)
                .post('/api/posts')
                .send({ content: 'Test post' })
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        test('should handle malformed request data', async () => {
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token1}`)
                .send({ invalid_field: 'value' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Health and Status', () => {
        test('GET /health - health check endpoint', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('OK');
            expect(response.body.timestamp).toBeDefined();
        });

        test('GET / - root endpoint', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body.message).toBeDefined();
        });

        test('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent-endpoint')
                .expect(404);

            expect(response.body.error).toBeDefined();
        });
    });
});
