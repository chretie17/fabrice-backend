const db = require('../db');

// Helper: Validate Date Range
const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
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
  DATE_FORMAT(responses.response_date, '%Y-%m-%d %H:%i:%s') AS response_date -- Use response_date here
FROM responses
LEFT JOIN surveys ON responses.survey_id = surveys.id
LEFT JOIN users ON responses.user_id = users.id
${type === 'date_range' ? 'WHERE responses.response_date >= ? AND responses.response_date <= ?' : ''} -- Adjust filtering here
ORDER BY responses.response_date DESC; -- Use response_date for ordering

      `,
      services: `
        SELECT 
          services.id AS service_id,
          services.service_type,
          services.description,
          services.priority,
          services.status,
          users.name AS tenant_name,
          services.floors,
          services.room_numbers,
          DATE_FORMAT(services.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM services
        LEFT JOIN users ON services.tenant_id = users.id
        ${type === 'date_range' ? 'WHERE services.created_at >= ? AND services.created_at <= ?' : ''}
        ORDER BY services.created_at DESC;
      `,
      feedback: `
        SELECT 
          feedback.id AS feedback_id,
          users.name AS tenant_name,
          services.service_type,
          feedback.comments,
          feedback.response AS admin_response,
          DATE_FORMAT(feedback.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM feedback
        LEFT JOIN users ON feedback.tenant_id = users.id
        LEFT JOIN services ON feedback.service_id = services.id
        ${type === 'date_range' ? 'WHERE feedback.created_at >= ? AND feedback.created_at <= ?' : ''}
        ORDER BY feedback.created_at DESC;
      `,
      posts: `
        SELECT 
          posts.id AS post_id,
          posts.title,
          users.name AS tenant_name,
          DATE_FORMAT(posts.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
          posts.status
        FROM posts
        LEFT JOIN users ON posts.tenant_id = users.id
        ${type === 'date_range' ? 'WHERE posts.created_at >= ? AND posts.created_at <= ?' : ''}
        ORDER BY posts.created_at DESC;
      `,
      comments: `
        SELECT 
          comments.id AS comment_id,
          comments.content,
          users.name AS tenant_name,
          posts.title AS post_title,
          DATE_FORMAT(comments.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM comments
        LEFT JOIN posts ON comments.post_id = posts.id
        LEFT JOIN users ON comments.tenant_id = users.id
        ${type === 'date_range' ? 'WHERE comments.created_at >= ? AND comments.created_at <= ?' : ''}
        ORDER BY comments.created_at DESC;
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
      return res.status(404).json({ message: 'No data found for the specified date range and category.' });
    }
    if (!results.length) {
        return res.status(200).json({ message: 'No data available for the specified date range and category.' });
      }

    // Respond with the Report Data
    res.status(200).json({
      [category]: results,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report', error });
  }
};
