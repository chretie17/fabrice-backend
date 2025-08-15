const db = require('../db');

// Create a new post (Pending by default)
exports.createPost = (req, res) => {
    const { tenant_id, title, content, floors } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }

    const query = `INSERT INTO posts (tenant_id, title, content, floors, status) VALUES (?, ?, ?, ?, 'Pending')`;
    db.query(query, [tenant_id, title, content, floors || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Post submitted for approval', postId: result.insertId });
    });
};

// Get all approved posts
// Get all approved posts
exports.getAllPosts = (req, res) => {
    const { floor, search } = req.query;

    let query = `
        SELECT p.*, u.name AS tenant_name 
        FROM posts p 
        JOIN users u ON p.tenant_id = u.id 
        WHERE p.status = 'Approved'
    `;

    const params = [];

    // Apply floor filter
    if (floor) {
        query += ' AND (p.floors = ? OR p.floors = "All Floors")';
        params.push(floor);
    }

    // Apply search filter
    if (search) {
        query += ' AND (p.title LIKE ? OR p.content LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
    }

    query += ' ORDER BY p.created_at DESC';

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};
// Like or Unlike a Comment
exports.likeComment = (req, res) => {
    const { comment_id, tenant_id } = req.body;

    if (!comment_id || !tenant_id) {
        return res.status(400).json({ error: 'Comment ID and Tenant ID are required.' });
    }

    const query = `
        INSERT INTO comment_likes (comment_id, tenant_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE liked_at = CURRENT_TIMESTAMP
    `;

    db.query(query, [comment_id, tenant_id], (err, result) => {
        if (err) {
            console.error('Error liking comment:', err);
            return res.status(500).json({ error: 'Error liking comment.' });
        }

        const affectedRows = result.affectedRows;
        const message = affectedRows === 1
            ? 'Comment liked successfully.'
            : 'Comment like updated successfully.';

        res.status(201).json({ message });
    });
};

// Get Likes for a Comment
exports.getLikesForComment = (req, res) => {
    const { comment_id } = req.params;

    if (!comment_id) {
        return res.status(400).json({ error: 'Comment ID is required.' });
    }

    const query = `
        SELECT COUNT(*) AS like_count
        FROM comment_likes
        WHERE comment_id = ?
    `;

    db.query(query, [comment_id], (err, results) => {
        if (err) {
            console.error('Error fetching likes for comment:', err);
            return res.status(500).json({ error: 'Error fetching likes for comment.' });
        }

        const likeCount = results[0]?.like_count || 0;
        res.json({ comment_id, like_count: likeCount });
    });
};

// Get pending posts for admin review
exports.getPendingPosts = (req, res) => {
    const query = `
        SELECT p.*, u.name AS tenant_name 
        FROM posts p 
        JOIN users u ON p.tenant_id = u.id 
        WHERE p.status = 'Pending'
        ORDER BY p.created_at DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Approve or reject a post
exports.updatePostStatus = (req, res) => {
    const { post_id, status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    const query = `UPDATE posts SET status = ? WHERE id = ?`;
    db.query(query, [status, post_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Post ${status.toLowerCase()} successfully.` });
    });
};

// Get a specific post with its comments (Only approved posts are visible)
exports.getPostWithComments = (req, res) => {
    const { post_id } = req.params;

    const postQuery = `
        SELECT p.*, u.name AS tenant_name 
        FROM posts p 
        JOIN users u ON p.tenant_id = u.id 
        WHERE p.id = ? AND p.status = 'Approved'
    `;

    const commentsQuery = `
        SELECT c.*, u.name AS tenant_name 
        FROM comments c 
        JOIN users u ON c.tenant_id = u.id 
        WHERE c.post_id = ? 
        ORDER BY c.created_at ASC
    `;

    db.query(postQuery, [post_id], (postErr, postResults) => {
        if (postErr) return res.status(500).json({ error: postErr.message });
        if (postResults.length === 0) return res.status(404).json({ error: 'Post not found or not approved.' });

        db.query(commentsQuery, [post_id], (commentErr, commentResults) => {
            if (commentErr) return res.status(500).json({ error: commentErr.message });

            res.json({
                post: postResults[0],
                comments: commentResults,
            });
        });
    });
};

// Get comments for a specific post
exports.getCommentsByPostId = (req, res) => {
    const { post_id } = req.params;

    const query = `
        SELECT c.*, u.name AS tenant_name 
        FROM comments c 
        JOIN users u ON c.tenant_id = u.id 
        WHERE c.post_id = ? 
        ORDER BY c.created_at ASC
    `;

    db.query(query, [post_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Create a comment on a post
exports.createComment = (req, res) => {
    const { post_id, tenant_id, content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required.' });
    }

    const query = `INSERT INTO comments (post_id, tenant_id, content) VALUES (?, ?, ?)`;
    db.query(query, [post_id, tenant_id, content], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Comment added successfully', commentId: result.insertId });
    });
};

// Delete a post
exports.deletePost = (req, res) => {
    const { post_id } = req.params;

    const query = `DELETE FROM posts WHERE id = ?`;
    db.query(query, [post_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Post deleted successfully' });
    });
};

// Delete a comment
exports.deleteComment = (req, res) => {
    const { comment_id } = req.params;

    const query = `DELETE FROM comments WHERE id = ?`;
    db.query(query, [comment_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Comment deleted successfully' });
    });
};
