const express = require('express');
const {
    createPost,
    getAllPosts,
    getPendingPosts,
    updatePostStatus,
    getPostWithComments,
    getCommentsByPostId,
    createComment,
    deletePost,
    deleteComment,
    likeComment,
    getLikesForComment,
} = require('../controllers/communityController');

const router = express.Router();

router.post('/posts', createPost); // Create a new post
router.get('/posts', getAllPosts); // Get all approved posts
router.get('/posts/pending', getPendingPosts); // Get pending posts (Admin only)
router.put('/posts/status', updatePostStatus); // Approve or reject a post
router.get('/posts/:post_id', getPostWithComments); // Get a specific post with its comments
router.get('/posts/:post_id/comments', getCommentsByPostId); // Get all comments for a specific post
router.post('/comments', createComment); // Create a comment
router.delete('/posts/:post_id', deletePost); // Delete a post
router.delete('/comments/:comment_id', deleteComment); // Delete a comment
router.post('/comments/like', likeComment);

router.get('/comments/:comment_id/likes', getLikesForComment);

module.exports = router;
