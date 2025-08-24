/**
 * Comprehensive Test for Bonus Features
 * Tests scheduled posts and GraphQL endpoints
 */

const request = require('supertest');
const app = require('../src/app');

describe('🎯 BONUS FEATURES TESTING', () => {
  let authToken;
  let userId;
  let scheduledJobId;
  let testUsername;

  beforeAll(async () => {
    // Register a test user with unique username
    const timestamp = Date.now();
    testUsername = `scheduletester${timestamp}`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        email: `schedule${timestamp}@test.com`,
        password: 'password123',
        full_name: 'Schedule Tester'
      });

    console.log('Registration response:', registerResponse.body);
    
    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
    
    console.log('User registered successfully:', { userId, hasToken: !!authToken });
  });

  describe('📅 SCHEDULED POSTS FEATURE', () => {
    test('Should schedule a post for future publishing', async () => {
      const futureTime = new Date(Date.now() + 5000); // 5 seconds from now
      
      const response = await request(app)
        .post('/api/posts/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a scheduled post!',
          scheduledTime: futureTime.toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post scheduled successfully');
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data.status).toBe('scheduled');
      
      scheduledJobId = response.body.data.jobId;
    });

    test('Should get user scheduled posts', async () => {
      const response = await request(app)
        .get('/api/posts/scheduled')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });

    test('Should cancel a scheduled post', async () => {
      const response = await request(app)
        .delete(`/api/posts/scheduled/${scheduledJobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Scheduled post cancelled successfully');
    });

    test('Should reject scheduling posts in the past', async () => {
      const pastTime = new Date(Date.now() - 5000); // 5 seconds ago
      
      const response = await request(app)
        .post('/api/posts/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This should fail',
          scheduledTime: pastTime.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Scheduled time must be in the future');
    });
  });

  describe('🚀 GRAPHQL IMPLEMENTATION', () => {
    test('Should handle GraphQL authentication query', async () => {
      const query = `
        query {
          me {
            id
            username
            email
            fullName
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.me).toBeTruthy();
      expect(response.body.data.me.username).toBe(testUsername);
    });

    test('Should handle GraphQL user registration mutation', async () => {
      const timestamp = Date.now();
      const mutation = `
        mutation {
          register(input: {
            username: "graphqluser${timestamp}"
            email: "graphql${timestamp}@test.com"
            password: "password123"
            fullName: "GraphQL User"
          }) {
            token
            user {
              id
              username
              email
              fullName
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.register.token).toBeTruthy();
      expect(response.body.data.register.user.username).toBe(`graphqluser${timestamp}`);
    });

    test('Should handle GraphQL post creation mutation', async () => {
      const mutation = `
        mutation {
          createPost(input: {
            content: "This is a GraphQL post!"
          }) {
            id
            content
            author {
              username
            }
            likesCount
            commentsCount
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.createPost.content).toBe('This is a GraphQL post!');
      expect(response.body.data.createPost.author.username).toBe(testUsername);
    });

    test('Should handle GraphQL posts query', async () => {
      const query = `
        query {
          posts(limit: 5) {
            id
            content
            author {
              username
            }
            likesCount
            commentsCount
            createdAt
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.posts).toBeInstanceOf(Array);
    });

    test('Should handle GraphQL user search query', async () => {
      const query = `
        query {
          searchUsers(query: "schedule", limit: 5) {
            id
            username
            fullName
            followersCount
            followingCount
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.searchUsers).toBeInstanceOf(Array);
    });

    test('Should handle GraphQL scheduled posts mutation', async () => {
      const futureTime = new Date(Date.now() + 10000); // 10 seconds from now
      
      const mutation = `
        mutation {
          schedulePost(input: {
            content: "GraphQL scheduled post!"
            scheduledTime: "${futureTime.toISOString()}"
          }) {
            jobId
            status
            scheduledTime
            postData {
              content
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.schedulePost.status).toBe('scheduled');
      expect(response.body.data.schedulePost.postData.content).toBe('GraphQL scheduled post!');
    });

    test('Should handle GraphQL health check query', async () => {
      const query = `
        query {
          health {
            status
            timestamp
            database
            redis
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.data.health.status).toBe('OK');
      expect(response.body.data.health.database).toMatch(/connected|disconnected/);
      expect(response.body.data.health.redis).toMatch(/connected|disconnected/);
    });

    test('Should handle GraphQL errors properly', async () => {
      const query = `
        query {
          me {
            id
            username
          }
        }
      `;

      // Request without authentication
      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeTruthy();
      expect(response.body.errors[0].message).toBe('Not authenticated');
    });
  });

  describe('🔄 INTEGRATION TESTS', () => {
    test('Should work with both REST and GraphQL for same operations', async () => {
      // Create a post via REST
      const restResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'REST API post' });

      expect(restResponse.status).toBe(201);
      const postId = restResponse.body.post.id;
      console.log('Created post with ID:', postId);

      // Get the same post via GraphQL
      const graphqlQuery = `
        query {
          post(id: ${postId}) {
            id
            content
            author {
              username
            }
          }
        }
      `;

      const graphqlResponse = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send({ query: graphqlQuery });

      expect(graphqlResponse.status).toBe(200);
      expect(graphqlResponse.body.data.post.content).toBe('REST API post');
      expect(graphqlResponse.body.data.post.author.username).toBe(testUsername);
    });

    test('Should maintain data consistency between REST and GraphQL', async () => {
      // Get user stats via REST
      const restResponse = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${authToken}`);

      // Get user stats via GraphQL
      const graphqlQuery = `
        query {
          userStats {
            followersCount
            followingCount
            postsCount
          }
        }
      `;

      const graphqlResponse = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({ query: graphqlQuery });

      expect(restResponse.status).toBe(200);
      expect(graphqlResponse.status).toBe(200);
      
      // Stats should be consistent
      expect(graphqlResponse.body.data.userStats.followersCount)
        .toBe(restResponse.body.followerCount);
      expect(graphqlResponse.body.data.userStats.followingCount)
        .toBe(restResponse.body.followingCount);
    });
  });
});

// Cleanup
afterAll(async () => {
  // Add any cleanup code here
  console.log('🧹 Bonus features tests completed');
});
