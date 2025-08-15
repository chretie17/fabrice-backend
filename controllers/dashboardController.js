const db = require('../db'); // Using the existing Database class

// Get all dashboard data
exports.getDashboardData = async (req, res) => {
    try {
        const { year } = req.query;

        // Fetch Post Count by Status for the given year
       const [postStatus] = await db.promise().query(
    'SELECT is_hidden, COUNT(*) AS post_count FROM forum_posts WHERE YEAR(created_at) = ? GROUP BY is_hidden',
    [year]
);


        // Fetch Comment Count for the given year
        const [commentCount] = await db.promise().query(
            'SELECT COUNT(*) AS comment_count FROM comments WHERE YEAR(comments.created_at) = ?',
            [year]
        );

        // Fetch student Engagement (Feedback & Comment Counts) for the given year
        const [studentEngagement] = await db.promise().query(
            `SELECT u.name AS student_name, 
                    COUNT(DISTINCT f.id) AS feedback_count, 
                    COUNT(DISTINCT c.id) AS comment_count
             FROM users u
             LEFT JOIN feedback f ON u.id = f.student_id AND YEAR(f.created_at) = ?
             LEFT JOIN comments c ON u.id = c.student_id AND YEAR(c.created_at) = ?
             GROUP BY u.id`,
            [year, year]
        );

        // Fetch Top 5 students by Engagement (Posts, Feedbacks, and Comments) for the given year
        const [topEngagement] = await db.promise().query(
            `SELECT u.name AS student_name, 
                    COUNT(DISTINCT p.id) AS post_count, 
                    COUNT(DISTINCT f.id) AS feedback_count, 
                    COUNT(DISTINCT c.id) AS comment_count
             FROM users u
             LEFT JOIN forum_posts p ON u.id = p.user_id AND YEAR(p.created_at) = ?
             LEFT JOIN feedback f ON u.id = f.student_id AND YEAR(f.created_at) = ?
             LEFT JOIN comments c ON u.id = c.student_id AND YEAR(c.created_at) = ?
             GROUP BY u.id
             ORDER BY post_count DESC, feedback_count DESC, comment_count DESC
             LIMIT 5`,
            [year, year, year]
        );

        // Return all the data together
        res.json({
            postStatus,
            commentCount,
            studentEngagement,
            topEngagement,
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
