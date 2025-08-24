const request = require('supertest');
const app = require('../src/app');

describe('Edge Cases and Stress Tests', () => {
    let testTokens = [];
    let testUserIds = [];
    let testPostIds = [];

    beforeAll(async () => {
        // Create test users for edge case testing
        for (let i = 1; i <= 3; i++) {
            const userData = {
                username: `edgeuser${i}${Date.now()}`,
                email: `edgeuser${i}_${Date.now()}@example.com`,
                password: 'password123',
                full_name: `Edge Test User ${i}`
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            if (response.status !== 201) {
                console.log('Registration failed:', response.status, response.body);
                throw new Error(`Registration failed: ${response.status} ${JSON.stringify(response.body)}`);
            }

            testTokens[i-1] = response.body.token;
            testUserIds[i-1] = response.body.user.id;
        }

        // Create test posts
        for (let i = 0; i < 3; i++) {
            const postData = {
                content: `Edge test post ${i + 1} - ${Date.now()}`,
                comments_enabled: true
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[i]}`)
                .send(postData);

            testPostIds[i] = response.body.post.id;
        }
    });

    describe('Input Validation Edge Cases', () => {
        test('should handle extremely long usernames', async () => {
            const longUsername = 'a'.repeat(1000);
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: longUsername,
                    email: `long${Date.now()}@example.com`,
                    password: 'password123',
                    full_name: 'Long Username Test'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('should handle special characters in usernames', async () => {
            const specialUsername = 'user@#$%^&*()';
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: specialUsername,
                    email: `special${Date.now()}@example.com`,
                    password: 'password123',
                    full_name: 'Special Character Test'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('should handle extremely long email addresses', async () => {
            const longEmail = 'a'.repeat(500) + '@example.com';
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: `longmail${Date.now()}`,
                    email: longEmail,
                    password: 'password123',
                    full_name: 'Long Email Test'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('should handle extremely long post content', async () => {
            const longContent = 'a'.repeat(10000);
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({
                    content: longContent
                });

            // Should either accept it or return 400 based on limits
            expect([200, 201, 400]).toContain(response.status);
        });

        test('should handle special characters in post content', async () => {
            const specialContent = '!@#$%^&*()_+{}|:"<>?[];\'\\,./`~';
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({
                    content: specialContent
                })
                .expect(201);

            expect(response.body.post.content).toBe(specialContent);
        });

        test('should handle Unicode characters in content', async () => {
            const unicodeContent = '你好世界 🚀 🌟 ❤️ 🎉 👍';
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({
                    content: unicodeContent
                })
                .expect(201);

            expect(response.body.post.content).toBe(unicodeContent);
        });

        test('should handle SQL injection attempts in search', async () => {
            const sqlInjection = "'; DROP TABLE posts; --";
            const response = await request(app)
                .get(`/api/posts/search?q=${encodeURIComponent(sqlInjection)}`)
                .expect(200);

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('should handle XSS attempts in content', async () => {
            const xssContent = '<script>alert("XSS")</script>';
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({
                    content: xssContent
                })
                .expect(201);

            // Content should be stored as-is (sanitization should happen on display)
            expect(response.body.post.content).toBe(xssContent);
        });
    });

    describe('Authentication Edge Cases', () => {
        test('should handle malformed JWT tokens', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', 'Bearer malformed.jwt.token')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        test('should handle empty authorization header', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', '')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        test('should handle authorization header without Bearer prefix', async () => {
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', testTokens[0])
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        test('should handle expired tokens gracefully', async () => {
            // This would require a token that's actually expired
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
            const response = await request(app)
                .get('/api/posts/my')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Database Edge Cases', () => {
        test('should handle non-existent resource IDs gracefully', async () => {
            const responses = await Promise.all([
                request(app).get('/api/posts/999999999'),
                request(app).get('/api/comments/999999999'),
                request(app).get('/api/likes/999999999'),
                request(app).delete('/api/users/unfollow/999999999').set('Authorization', `Bearer ${testTokens[0]}`)
            ]);

            responses.forEach(response => {
                expect([400, 404]).toContain(response.status);
                expect(response.body.error).toBeDefined();
            });
        });

        test('should handle negative ID values', async () => {
            const responses = await Promise.all([
                request(app).get('/api/posts/-1'),
                request(app).get('/api/comments/-1'),
                request(app).get('/api/likes/-1')
            ]);

            responses.forEach(response => {
                expect([400, 404]).toContain(response.status);
            });
        });

        test('should handle string IDs where numbers expected', async () => {
            const responses = await Promise.all([
                request(app).get('/api/posts/abc'),
                request(app).get('/api/comments/xyz'),
                request(app).get('/api/likes/test')
            ]);

            responses.forEach(response => {
                expect([400, 404]).toContain(response.status);
            });
        });
    });

    describe('Concurrent Operations', () => {
        test('should handle simultaneous likes on same post', async () => {
            const likePromises = testTokens.map(token =>
                request(app)
                    .post('/api/likes')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ post_id: testPostIds[0] })
            );

            const responses = await Promise.all(likePromises);
            
            // All should succeed as they're from different users
            responses.forEach(response => {
                expect([200, 201]).toContain(response.status);
            });
        });

        test('should handle simultaneous follows of same user', async () => {
            const followPromises = [testTokens[0], testTokens[1]].map(token =>
                request(app)
                    .post('/api/users/follow')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ user_id: testUserIds[2] })
            );

            const responses = await Promise.all(followPromises);
            
            // Both should succeed as they're different users following
            responses.forEach(response => {
                expect([200, 201]).toContain(response.status);
            });
        });

        test('should handle simultaneous comments on same post', async () => {
            const commentPromises = testTokens.map((token, index) =>
                request(app)
                    .post('/api/comments')
                    .set('Authorization', `Bearer ${token}`)
                    .send({ 
                        post_id: testPostIds[0], 
                        content: `Concurrent comment ${index + 1}` 
                    })
            );

            const responses = await Promise.all(commentPromises);
            
            // All should succeed
            responses.forEach(response => {
                expect([200, 201]).toContain(response.status);
            });
        });
    });

    describe('Rate Limiting Simulation', () => {
        test('should handle rapid requests from same user', async () => {
            const rapidRequests = Array(10).fill().map(() =>
                request(app)
                    .get('/api/posts')
                    .set('Authorization', `Bearer ${testTokens[0]}`)
            );

            const responses = await Promise.all(rapidRequests);
            
            // All should succeed (unless rate limiting is implemented)
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        test('should handle rapid post creation attempts', async () => {
            const rapidPosts = Array(5).fill().map((_, index) =>
                request(app)
                    .post('/api/posts')
                    .set('Authorization', `Bearer ${testTokens[0]}`)
                    .send({ content: `Rapid post ${index + 1}` })
            );

            const responses = await Promise.all(rapidPosts);
            
            // Should handle gracefully
            responses.forEach(response => {
                expect([200, 201, 429]).toContain(response.status);
            });
        });
    });

    describe('Memory and Performance Edge Cases', () => {
        test('should handle large result sets efficiently', async () => {
            const start = Date.now();
            
            const response = await request(app)
                .get('/api/posts')
                .expect(200);

            const duration = Date.now() - start;
            
            expect(response.body.posts).toBeDefined();
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should handle complex search queries', async () => {
            const complexQueries = [
                'test AND post',
                'test OR post',
                '"exact phrase search"',
                'test* wildcard',
                'test post comment like'
            ];

            const responses = await Promise.all(
                complexQueries.map(query =>
                    request(app).get(`/api/posts/search?q=${encodeURIComponent(query)}`)
                )
            );

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.posts).toBeDefined();
            });
        });
    });

    describe('Network and Timeout Edge Cases', () => {
        test('should handle incomplete requests gracefully', async () => {
            // Test with incomplete JSON
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .set('Content-Type', 'application/json')
                .send('{"content":"incomplete')
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        test('should handle wrong content type', async () => {
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .set('Content-Type', 'text/plain')
                .send('content=test post')
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    describe('Boundary Value Testing', () => {
        test('should handle minimum valid inputs', async () => {
            // Minimum valid post content
            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({ content: 'a' })
                .expect(201);

            expect(response.body.post.content).toBe('a');
        });

        test('should handle maximum pagination values', async () => {
            const response = await request(app)
                .get('/api/posts?page=1000&limit=1000')
                .expect(200);

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('should handle zero and negative pagination values', async () => {
            const responses = await Promise.all([
                request(app).get('/api/posts?page=0&limit=0'),
                request(app).get('/api/posts?page=-1&limit=-1')
            ]);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.posts).toBeDefined();
            });
        });
    });

    describe('Data Consistency Tests', () => {
        test('should maintain referential integrity on cascading deletes', async () => {
            // Create post with comments and likes
            const postResponse = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({ content: 'Post for deletion test' });

            const postId = postResponse.body.post.id;

            // Add comment and like
            await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${testTokens[1]}`)
                .send({ post_id: postId, content: 'Comment on post to delete' });

            await request(app)
                .post('/api/likes')
                .set('Authorization', `Bearer ${testTokens[2]}`)
                .send({ post_id: postId });

            // Delete the post
            await request(app)
                .delete(`/api/posts/${postId}`)
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .expect(204);

            // Verify comments and likes are handled appropriately
            const commentsResponse = await request(app)
                .get(`/api/comments/${postId}`);
            
            const likesResponse = await request(app)
                .get(`/api/likes/${postId}`);

            // Should return 404 or empty arrays
            expect([200, 404]).toContain(commentsResponse.status);
            expect([200, 404]).toContain(likesResponse.status);
        });

        test('should handle follow/unfollow consistency', async () => {
            // Follow user
            await request(app)
                .post('/api/users/follow')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .send({ user_id: testUserIds[1] });

            // Check stats
            const statsResponse = await request(app)
                .get('/api/users/stats')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .expect(200);

            const followingCountBefore = statsResponse.body.followingCount;

            // Unfollow user
            await request(app)
                .delete(`/api/users/unfollow/${testUserIds[1]}`)
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .expect(200);

            // Check stats again
            const statsAfterResponse = await request(app)
                .get('/api/users/stats')
                .set('Authorization', `Bearer ${testTokens[0]}`)
                .expect(200);

            const followingCountAfter = statsAfterResponse.body.followingCount;

            expect(followingCountAfter).toBe(followingCountBefore - 1);
        });
    });
});
