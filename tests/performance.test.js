const request = require('supertest');
const app = require('../src/app');

describe('Performance and Load Tests', () => {
    let loadTestTokens = [];
    let loadTestUserIds = [];
    let loadTestPostIds = [];

    beforeAll(async () => {
        // Create multiple users for load testing
        for (let i = 1; i <= 10; i++) {
            const userData = {
                username: `loaduser${i}${Date.now()}`,
                email: `loaduser${i}_${Date.now()}@example.com`,
                password: 'password123',
                full_name: `Load Test User ${i}`
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBeDefined();

            loadTestTokens[i-1] = response.body.token;
            loadTestUserIds[i-1] = response.body.user.id;
        }

        // Create posts for testing
        for (let i = 0; i < 5; i++) {
            const postData = {
                content: `Load test post ${i + 1} - ${Date.now()}`,
                comments_enabled: true
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${loadTestTokens[i]}`)
                .send(postData);

            loadTestPostIds[i] = response.body.post.id;
        }
    });

    describe('Bulk Operations Performance', () => {
        test('should handle bulk user registration efficiently', async () => {
            const startTime = Date.now();
            const registrationPromises = [];

            for (let i = 1; i <= 20; i++) {
                const userData = {
                    username: `bulkuser${i}${Date.now()}`,
                    email: `bulkuser${i}_${Date.now()}@example.com`,
                    password: 'password123',
                    full_name: `Bulk User ${i}`
                };

                registrationPromises.push(
                    request(app)
                        .post('/api/auth/register')
                        .send(userData)
                );
            }

            const responses = await Promise.all(registrationPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // All registrations should succeed
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body.token).toBeDefined();
            });

            // Should complete within reasonable time
            expect(duration).toBeLessThan(10000); // 10 seconds
            console.log(`Bulk registration of 20 users took: ${duration}ms`);
        });

        test('should handle bulk post creation efficiently', async () => {
            const startTime = Date.now();
            const postPromises = [];

            for (let i = 1; i <= 50; i++) {
                const postData = {
                    content: `Bulk post ${i} created for performance testing`,
                    comments_enabled: i % 2 === 0
                };

                postPromises.push(
                    request(app)
                        .post('/api/posts')
                        .set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                        .send(postData)
                );
            }

            const responses = await Promise.all(postPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // All posts should be created successfully
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body.post).toBeDefined();
            });

            expect(duration).toBeLessThan(15000); // 15 seconds
            console.log(`Bulk creation of 50 posts took: ${duration}ms`);
        });

        test('should handle bulk comment creation efficiently', async () => {
            const startTime = Date.now();
            const commentPromises = [];

            for (let i = 1; i <= 30; i++) {
                const commentData = {
                    post_id: loadTestPostIds[i % loadTestPostIds.length],
                    content: `Bulk comment ${i} for performance testing`
                };

                commentPromises.push(
                    request(app)
                        .post('/api/comments')
                        .set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                        .send(commentData)
                );
            }

            const responses = await Promise.all(commentPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Most comments should succeed (some might fail due to disabled comments)
            const successfulComments = responses.filter(r => r.status === 201);
            expect(successfulComments.length).toBeGreaterThan(15);

            expect(duration).toBeLessThan(12000); // 12 seconds
            console.log(`Bulk creation of 30 comments took: ${duration}ms`);
        });

        test('should handle bulk like operations efficiently', async () => {
            const startTime = Date.now();
            const likePromises = [];

            // Each user likes each post
            for (let userIndex = 0; userIndex < loadTestTokens.length; userIndex++) {
                for (let postIndex = 0; postIndex < loadTestPostIds.length; postIndex++) {
                    likePromises.push(
                        request(app)
                            .post('/api/likes')
                            .set('Authorization', `Bearer ${loadTestTokens[userIndex]}`)
                            .send({ post_id: loadTestPostIds[postIndex] })
                    );
                }
            }

            const responses = await Promise.all(likePromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Most likes should succeed
            const successfulLikes = responses.filter(r => r.status === 201);
            expect(successfulLikes.length).toBeGreaterThan(30);

            expect(duration).toBeLessThan(20000); // 20 seconds
            console.log(`Bulk like operations (${likePromises.length} requests) took: ${duration}ms`);
        });
    });

    describe('Database Query Performance', () => {
        test('should handle large result set queries efficiently', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get('/api/posts')
                .expect(200);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.body.posts).toBeDefined();
            expect(Array.isArray(response.body.posts)).toBe(true);
            expect(duration).toBeLessThan(3000); // 3 seconds

            console.log(`Large posts query took: ${duration}ms, returned ${response.body.posts.length} posts`);
        });

        test('should handle complex search queries efficiently', async () => {
            const searchQueries = [
                'test',
                'performance',
                'bulk',
                'user',
                'post comment like'
            ];

            const startTime = Date.now();

            const searchPromises = searchQueries.map(query =>
                request(app)
                    .get(`/api/posts/search?q=${encodeURIComponent(query)}`)
            );

            const responses = await Promise.all(searchPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.posts).toBeDefined();
            });

            expect(duration).toBeLessThan(5000); // 5 seconds
            console.log(`Complex search queries (${searchQueries.length}) took: ${duration}ms`);
        });

        test('should handle user statistics queries efficiently', async () => {
            const startTime = Date.now();

            const statsPromises = loadTestTokens.map(token =>
                request(app)
                    .get('/api/users/stats')
                    .set('Authorization', `Bearer ${token}`)
            );

            const responses = await Promise.all(statsPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.followerCount).toBeDefined();
                expect(response.body.followingCount).toBeDefined();
            });

            expect(duration).toBeLessThan(8000); // 8 seconds
            console.log(`User stats queries (${loadTestTokens.length}) took: ${duration}ms`);
        });
    });

    describe('Concurrent Access Patterns', () => {
        test('should handle simultaneous read operations', async () => {
            const startTime = Date.now();
            const readPromises = [];

            // Simulate 50 concurrent read operations
            for (let i = 0; i < 50; i++) {
                readPromises.push(
                    request(app).get('/api/posts'),
                    request(app).get(`/api/posts/${loadTestPostIds[i % loadTestPostIds.length]}`),
                    request(app).get(`/api/comments/${loadTestPostIds[i % loadTestPostIds.length]}`)
                );
            }

            const responses = await Promise.all(readPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Most reads should succeed
            const successfulReads = responses.filter(r => r.status === 200);
            expect(successfulReads.length).toBeGreaterThan(140); // Expect most to succeed

            expect(duration).toBeLessThan(15000); // 15 seconds
            console.log(`${readPromises.length} concurrent read operations took: ${duration}ms`);
        });

        test('should handle mixed read/write operations', async () => {
            const startTime = Date.now();
            const mixedPromises = [];

            for (let i = 0; i < 20; i++) {
                // Add read operations
                mixedPromises.push(
                    request(app).get('/api/posts'),
                    request(app).get(`/api/users/stats`).set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                );

                // Add write operations
                mixedPromises.push(
                    request(app)
                        .post('/api/posts')
                        .set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                        .send({ content: `Mixed operation post ${i}` })
                );

                if (i < loadTestPostIds.length) {
                    mixedPromises.push(
                        request(app)
                            .post('/api/comments')
                            .set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                            .send({ 
                                post_id: loadTestPostIds[i], 
                                content: `Mixed operation comment ${i}` 
                            })
                    );
                }
            }

            const responses = await Promise.all(mixedPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Most operations should succeed
            const successfulOps = responses.filter(r => [200, 201].includes(r.status));
            expect(successfulOps.length).toBeGreaterThan(mixedPromises.length * 0.8); // 80% success rate

            expect(duration).toBeLessThan(25000); // 25 seconds
            console.log(`${mixedPromises.length} mixed read/write operations took: ${duration}ms`);
        });
    });

    describe('Memory Usage and Resource Management', () => {
        test('should handle large payload operations', async () => {
            const largeContent = 'a'.repeat(5000); // 5KB content
            const startTime = Date.now();

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${loadTestTokens[0]}`)
                .send({ content: largeContent });

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should either succeed or fail gracefully
            expect([200, 201, 400]).toContain(response.status);
            expect(duration).toBeLessThan(5000); // 5 seconds

            console.log(`Large payload operation took: ${duration}ms`);
        });

        test('should handle rapid sequential operations', async () => {
            const startTime = Date.now();
            const operations = [];

            // Perform 100 rapid sequential operations
            for (let i = 0; i < 100; i++) {
                operations.push(
                    request(app)
                        .get('/health')
                );
            }

            const responses = await Promise.all(operations);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // All health checks should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });

            expect(duration).toBeLessThan(10000); // 10 seconds
            console.log(`100 rapid health checks took: ${duration}ms`);
        });
    });

    describe('API Response Time Benchmarks', () => {
        test('should maintain acceptable response times for auth operations', async () => {
            const authOperations = [
                {
                    name: 'registration',
                    operation: () => request(app)
                        .post('/api/auth/register')
                        .send({
                            username: `benchuser${Date.now()}`,
                            email: `bench_${Date.now()}@example.com`,
                            password: 'password123',
                            full_name: 'Benchmark User'
                        })
                },
                {
                    name: 'login',
                    operation: () => request(app)
                        .post('/api/auth/login')
                        .send({
                            username: `loaduser1${Date.now() - 100000}`,
                            password: 'password123'
                        })
                }
            ];

            for (const { name, operation } of authOperations) {
                const startTime = Date.now();
                const response = await operation();
                const duration = Date.now() - startTime;

                expect([200, 201, 401]).toContain(response.status);
                expect(duration).toBeLessThan(2000); // 2 seconds
                console.log(`${name} operation took: ${duration}ms`);
            }
        });

        test('should maintain acceptable response times for CRUD operations', async () => {
            const crudOperations = [
                {
                    name: 'create_post',
                    operation: () => request(app)
                        .post('/api/posts')
                        .set('Authorization', `Bearer ${loadTestTokens[0]}`)
                        .send({ content: 'Benchmark post' })
                },
                {
                    name: 'read_posts',
                    operation: () => request(app).get('/api/posts')
                },
                {
                    name: 'read_user_posts',
                    operation: () => request(app)
                        .get('/api/posts/my')
                        .set('Authorization', `Bearer ${loadTestTokens[0]}`)
                },
                {
                    name: 'search_posts',
                    operation: () => request(app).get('/api/posts/search?q=test')
                }
            ];

            for (const { name, operation } of crudOperations) {
                const startTime = Date.now();
                const response = await operation();
                const duration = Date.now() - startTime;

                expect([200, 201]).toContain(response.status);
                expect(duration).toBeLessThan(3000); // 3 seconds
                console.log(`${name} operation took: ${duration}ms`);
            }
        });
    });

    describe('Stress Testing', () => {
        test('should handle sustained load over time', async () => {
            const startTime = Date.now();
            const operations = [];
            const batchSize = 10;
            const numberOfBatches = 5;

            for (let batch = 0; batch < numberOfBatches; batch++) {
                const batchOperations = [];
                
                for (let i = 0; i < batchSize; i++) {
                    batchOperations.push(
                        request(app)
                            .post('/api/posts')
                            .set('Authorization', `Bearer ${loadTestTokens[i % loadTestTokens.length]}`)
                            .send({ content: `Stress test post batch ${batch} item ${i}` })
                    );
                }

                const batchStartTime = Date.now();
                const batchResponses = await Promise.all(batchOperations);
                const batchDuration = Date.now() - batchStartTime;

                console.log(`Batch ${batch + 1} took: ${batchDuration}ms`);

                // Most operations in each batch should succeed
                const successfulOps = batchResponses.filter(r => r.status === 201);
                expect(successfulOps.length).toBeGreaterThan(batchSize * 0.7); // 70% success rate

                // Small delay between batches to simulate real usage
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const totalDuration = Date.now() - startTime;
            expect(totalDuration).toBeLessThan(60000); // 1 minute total
            console.log(`Stress test of ${numberOfBatches * batchSize} operations took: ${totalDuration}ms`);
        });
    });
});
