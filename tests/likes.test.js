// Tests for likes model and controller
const {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
  hasUserLikedPost,
} = require('../src/models/like');

const likesController = require('../src/controllers/likes');

describe('Likes Model', () => {
  it('should return empty array for getPostLikes with invalid post_id', async () => {
    const likes = await getPostLikes(-1);
    expect(Array.isArray(likes)).toBe(true);
    expect(likes.length).toBe(0);
  });

  it('should return empty array for getUserLikes with invalid user_id', async () => {
    const likes = await getUserLikes(-1);
    expect(Array.isArray(likes)).toBe(true);
    expect(likes.length).toBe(0);
  });

  it('should return false for hasUserLikedPost with invalid ids', async () => {
    const hasLiked = await hasUserLikedPost(-1, -1);
    expect(hasLiked).toBe(false);
  });
});

describe('Likes Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { id: 1 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('likePost', () => {
    it('should handle missing post_id', async () => {
      mockReq.body = {}; // No post_id
      await likesController.likePost(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
