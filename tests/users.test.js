// Tests for users controller and follow model
const {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  getFollowCounts,
} = require('../src/models/follow');

const usersController = require('../src/controllers/users');

describe('Follow Model', () => {
  it('should return empty array for getFollowing with invalid user_id', async () => {
    const following = await getFollowing(-1);
    expect(Array.isArray(following)).toBe(true);
    expect(following.length).toBe(0);
  });

  it('should return empty array for getFollowers with invalid user_id', async () => {
    const followers = await getFollowers(-1);
    expect(Array.isArray(followers)).toBe(true);
    expect(followers.length).toBe(0);
  });

  it('should return zero counts for getFollowCounts with invalid user_id', async () => {
    const counts = await getFollowCounts(-1);
    expect(counts.followers_count).toBe(0);
    expect(counts.following_count).toBe(0);
  });
});

describe('Users Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 1 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('follow', () => {
    it('should handle missing user_id', async () => {
      mockReq.body = {}; // No user_id
      await usersController.follow(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should prevent self-following', async () => {
      mockReq.body = { user_id: 1 }; // Same as req.user.id
      await usersController.follow(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchUsers', () => {
    it('should handle short search terms', async () => {
      mockReq.query = { q: 'a' }; // Too short
      await usersController.searchUsers(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
