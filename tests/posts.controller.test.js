// Tests for posts controller additional functions
const postsController = require('../src/controllers/posts');

describe('Posts Controller - New Functions', () => {
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

  describe('getFeed', () => {
    it('should handle pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '10' };
      // Would need to mock the model calls for full test
    });
  });

  describe('search', () => {
    it('should handle short search terms', async () => {
      mockReq.query = { q: 'a' }; // Too short
      await postsController.search(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
