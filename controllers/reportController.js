const db = require('../db');

// Helper: Validate Date Range
const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

// Helper: Process Forum Data to group posts under topics
const processForumData = (sqlResults) => {
  const topicsMap = new Map();
  
  sqlResults.forEach(row => {
    const topicId = row.topic_id;
    
    // If topic doesn't exist in map, create it
    if (!topicsMap.has(topicId)) {
      topicsMap.set(topicId, {
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        topic_description: row.topic_description,
        topic_created_at: row.topic_created_at,
        topic_status: row.topic_status,
        topic_priority: row.topic_priority,
        topic_creator: row.topic_creator,
        posts: []
      });
    }
    
    // Add post to topic if post exists (not null)
    if (row.post_id) {
      topicsMap.get(topicId).posts.push({
        post_id: row.post_id,
        post_content: row.post_content,
        post_created_at: row.post_created_at,
        post_visibility: row.post_visibility,
        post_author: row.post_author
      });
    }
  });
  
  // Convert map to array and sort by topic creation date (newest first)
  return Array.from(topicsMap.values()).sort((a, b) => 
    new Date(b.topic_created_at) - new Date(a.topic_created_at)
  );
};

// Generate Reports
exports.generateReport = async (req, res) => {
  const { start_date, end_date, type = 'full', category } = req.query;

  try {
    // Validate date range for `date_range` type
    if (type === 'date_range' && (!start_date || !end_date || !validateDateRange(start_date, end_date))) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    // Define Queries
    const queries = {
      surveys: `
        SELECT 
          surveys.id AS survey_id,
          surveys.title,
          surveys.description,
          DATE_FORMAT(surveys.start_date, '%Y-%m-%d %H:%i:%s') AS start_date,
          DATE_FORMAT(surveys.end_date, '%Y-%m-%d %H:%i:%s') AS end_date,
          surveys.status,
          COUNT(questions.id) AS total_questions,
          DATE_FORMAT(surveys.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM surveys
        LEFT JOIN questions ON surveys.id = questions.survey_id
        ${type === 'date_range' ? 'WHERE surveys.created_at >= ? AND surveys.created_at <= ?' : ''}
        GROUP BY surveys.id
        ORDER BY surveys.created_at DESC;
      `,
      responses: `
        SELECT 
          responses.id AS response_id,
          surveys.title AS survey_title,
          users.name AS respondent_name,
          responses.responses,
          DATE_FORMAT(responses.submitted_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
          DATE_FORMAT(responses.response_date, '%Y-%m-%d %H:%i:%s') AS response_date
        FROM responses
        LEFT JOIN surveys ON responses.survey_id = surveys.id
        LEFT JOIN users ON responses.user_id = users.id
        ${type === 'date_range' ? 'WHERE responses.response_date >= ? AND responses.response_date <= ?' : ''}
        ORDER BY responses.response_date DESC;
      `,
      feedback: `
        SELECT 
          feedback.id AS feedback_id,
          users.name AS student_name,
          courses.name,
          feedback.comments,
          feedback.response AS admin_response,
          DATE_FORMAT(feedback.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM feedback
        LEFT JOIN users ON feedback.student_id = users.id
        LEFT JOIN courses ON feedback.course_id = courses.id
        ${type === 'date_range' ? 'WHERE feedback.created_at >= ? AND feedback.created_at <= ?' : ''}
        ORDER BY feedback.created_at DESC;
      `,
      posts: `
        SELECT 
          t.id AS topic_id,
          t.title AS topic_title,
          t.description AS topic_description,
          DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS topic_created_at,
          t.status AS topic_status,
          CASE WHEN t.is_pinned = 1 THEN 'pinned' ELSE 'normal' END AS topic_priority,
          creator.name AS topic_creator,
          p.id AS post_id,
          p.content AS post_content,
          DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS post_created_at,
          CASE WHEN p.is_hidden = 1 THEN 'hidden' ELSE 'visible' END AS post_visibility,
          poster.name AS post_author
        FROM forum_topics t
        LEFT JOIN forum_posts p ON t.id = p.topic_id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users poster ON p.user_id = poster.id
        ${type === 'date_range' ? 'WHERE t.created_at >= ? AND t.created_at <= ?' : ''}
        ORDER BY t.created_at DESC, p.created_at ASC;
      `,
    };

    // Ensure the category is valid
    if (!queries[category]) {
      return res.status(400).json({ message: 'Invalid report category' });
    }

    // Execute Query for the Specific Category
    const params = type === 'date_range' ? [start_date, end_date] : [];
    const [results] = await db.promise().query(queries[category], params);

    if (!results.length) {
      return res.status(200).json({ 
        message: 'No data available for the specified category.',
        [category]: []
      });
    }

    // Process results based on category
    let processedResults = results;
    
    // Special processing for posts to group them under topics
    if (category === 'posts') {
      processedResults = processForumData(results);
    }

    // Respond with the Report Data
    res.status(200).json({
      [category]: processedResults,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report', error });
  }
};