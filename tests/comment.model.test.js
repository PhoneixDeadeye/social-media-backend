// Minimal tests for comment model functions
const {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
  getCommentById,
} = require('../src/models/comment');

describe('Comment Model', () => {
  it('should return null for getCommentById with invalid id', async () => {
    const comment = await getCommentById(-1);
    expect(comment).toBeNull();
  });

  it('should return empty array for getPostComments with invalid post_id', async () => {
    const comments = await getPostComments(-1);
    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBe(0);
  });
  // More tests should be added after DB schema is present
});
