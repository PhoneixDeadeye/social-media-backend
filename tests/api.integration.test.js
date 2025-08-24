const request = require('supertest');
const app = require('../src/app');

describe('API Integration Tests', () => {
    let authToken;
    let userId;
    let postId;
    let commentId;
    let secondUserId;
    let secondAuthToken;

    beforeAll(async () => {
        // Clean up any existing test data
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    describe('Authentication Flow', () => {
        test('POST /api/auth/register - should register a new user', async () => {
            const userData = {
                username: `testuser${Date.now()}`,
                email: `test${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User registered successfully');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.user.email).toBe(userData.email);

            authToken = response.body.token;
            userId = response.body.user.id;
        });

        test('POST /api/auth/register - should fail with duplicate username', async () => {
            const userData = {
                username: `testuser${Date.now() - 1000}`,
                email: `test${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'Test User'
            };

            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(userData);

            // Second registration with same username
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('POST /api/auth/login - should login with valid credentials', async () => {
            const loginData = {
                username: `testuser${Date.now() - 2000}`,
                password: 'password123'
            };

            // First register
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: loginData.username,
                    email: `login${Date.now()}@example.com`,
                    password: loginData.password,
                    full_name: 'Login Test User'
                });

            // Then login
            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login successful');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
        });

        test('POST /api/auth/login - should fail with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistentuser',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Posts Management', () => {
        test('POST /api/posts - should create a new post', async () => {
            const postData = {
                content: 'This is a test post',
                comments_enabled: true
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Post created successfully');
            expect(response.body).toHaveProperty('post');
            expect(response.body.post.content).toBe(postData.content);
            expect(response.body.post.user_id).toBe(userId);

            postId = response.body.post.id;
        });

        test('GET /api/posts/search - should get posts via search', async () => {
            const response = await request(app)
                .get('/api/posts/search?q=test')
                .expect(200);

            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('GET /api/posts/my - should get user posts', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('GET /api/posts/search - should search posts', async () => {
            const response = await request(app)
                .get('/api/posts/search?q=test')
                .expect(200);

            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('PUT /api/posts/:id - should update post', async () => {
            const updateData = {
                content: 'Updated test post content'
            };

            const response = await request(app)
                .put(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Post updated successfully');
            expect(response.body.post.content).toBe(updateData.content);
        });
    });

    describe('Comments Management', () => {
        test('POST /api/comments - should create a comment', async () => {
            const commentData = {
                post_id: postId,
                content: 'This is a test comment'
            };

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authToken}`)
                .send(commentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('content', commentData.content);
            expect(response.body).toHaveProperty('post_id');

            commentId = response.body.id;
        });

        test('GET /api/comments/post/:postId - should get post comments', async () => {
            const response = await request(app)
                .get(`/api/comments/post/${postId}`)
                .expect(200);

            expect(response.body).toHaveProperty('comments');
            expect(Array.isArray(response.body.comments)).toBe(true);
        });
    });

    describe('Likes Management', () => {
        test('POST /api/likes - should like a post', async () => {
            const likeData = {
                post_id: postId
            };

            const response = await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${authToken}`)
                .send(likeData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('post_id', postId);
            expect(response.body).toHaveProperty('user_id');
        });

        test('GET /api/likes/post/:postId - should get post likes', async () => {
            const response = await request(app)
                .get(`/api/likes/post/${postId}`)
                .expect(200);

            expect(response.body).toHaveProperty('likes');
            expect(Array.isArray(response.body.likes)).toBe(true);
        });

        test('DELETE /api/likes/:postId - should unlike a post', async () => {
            const response = await request(app)
                .delete(`/api/likes/${postId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(204);
        });
    });

    describe('User Management', () => {
        beforeAll(async () => {
            // Create second user for follow tests
            const userData = {
                username: `testuser2${Date.now()}`,
                email: `test2${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'Test User 2'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            secondUserId = response.body.user.id;
            secondAuthToken = response.body.token;
        });

        test('GET /api/users/search - should search users', async () => {
            const response = await request(app)
                .get('/api/users/search?q=test')
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
        });

        test('POST /api/users/follow - should follow a user', async () => {
            const followData = {
                user_id: secondUserId
            };

            const response = await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${authToken}`)
                .send(followData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'User followed successfully');
        });

        test('GET /api/users/following - should get following list', async () => {
            const response = await request(app)
                .get('/api/users/following')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('following');
            expect(Array.isArray(response.body.following)).toBe(true);
        });

        test('GET /api/users/followers - should get followers list', async () => {
            const response = await request(app)
                .get('/api/users/followers')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('followers');
            expect(Array.isArray(response.body.followers)).toBe(true);
        });

        test('GET /api/users/stats - should get user stats', async () => {
            const response = await request(app)
                .get('/api/users/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('followerCount');
            expect(response.body).toHaveProperty('followingCount');
        });

        test('DELETE /api/users/unfollow/:userId - should unfollow a user', async () => {
            const response = await request(app)
                .delete(`/api/users/unfollow/${secondUserId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'User unfollowed successfully');
        });
    });

    describe('Error Handling', () => {
        test('should return 401 for protected routes without token', async () => {
            await request(app)
                .post('/api/posts')
                .send({ content: 'Test post' })
                .expect(401);
        });

        test('should return 404 for non-existent routes', async () => {
            await request(app)
                .get('/api/nonexistent')
                .expect(404);
        });

        test('should return 400 for invalid post data', async () => {
            await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}) // Empty data
                .expect(400);
        });
    });

    describe('Health Check', () => {
        test('GET /health - should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
});
