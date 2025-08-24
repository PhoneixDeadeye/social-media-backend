// Tests for comments controller
const {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
} = require('../src/controllers/comments');

describe('Comments Controller', () => {
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

  describe('createComment', () => {
    it('should handle validation errors', async () => {
      mockReq.body = { content: '' }; // Invalid content
      await createComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPostComments', () => {
    it('should handle pagination parameters', async () => {
      mockReq.params = { post_id: 1 };
      mockReq.query = { limit: '5', offset: '10' };
      // Would need to mock the model calls for full test
    });
  });
});
