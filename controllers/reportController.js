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
  
  return Array.from(topicsMap.values()).sort((a, b) => 
    new Date(b.topic_created_at) - new Date(a.topic_created_at)
  );
};

// Generate Reports - Simplified with Combined Categories
exports.generateReport = async (req, res) => {
  const { start_date, end_date, type = 'full', category } = req.query;

  try {
    // Validate date range for `date_range` type
    if (type === 'date_range' && (!start_date || !end_date || !validateDateRange(start_date, end_date))) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    // Define Queries - Simplified with combined categories
    const queries = {
      // Existing categories
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

      // COMBINED STUDY CATEGORIES

      // 1. Academic Overview (Courses + Batches + Enrollments)
     // Replace the academic query in your reportController.js with this:

academic: `
  SELECT 
    'course' as record_type,
    c.id,
    c.name,
    c.description,
    c.duration,
    c.price,
    c.status,
    COUNT(DISTINCT l.id) AS lesson_count,
    COUNT(DISTINCT a.id) AS assignment_count,
    COUNT(DISTINCT b.id) AS batch_count,
    COUNT(DISTINCT e.id) AS enrollment_count,
    NULL as instructor_name,
    GROUP_CONCAT(DISTINCT students.name SEPARATOR ', ') as student_names,
    DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM courses c
  LEFT JOIN lessons l ON c.id = l.course_id
  LEFT JOIN assignments a ON c.id = a.course_id
  LEFT JOIN batches b ON c.id = b.course_id
  LEFT JOIN enrollments e ON b.id = e.batch_id AND e.status = 'enrolled'
  LEFT JOIN users students ON e.student_id = students.id
  ${type === 'date_range' ? 'WHERE c.created_at >= ? AND c.created_at <= ?' : ''}
  GROUP BY c.id

  UNION ALL

  SELECT 
    'batch' as record_type,
    b.id,
    CONCAT(c.name, ' - ', b.name) as name,
    NULL as description,
    NULL as duration,
    c.price,
    b.status,
    NULL as lesson_count,
    NULL as assignment_count,
    NULL as batch_count,
    b.current_students as enrollment_count,
    instructor.name as instructor_name,
    GROUP_CONCAT(DISTINCT students.name SEPARATOR ', ') as student_names,
    DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM batches b
  JOIN courses c ON b.course_id = c.id
  JOIN users instructor ON b.instructor_id = instructor.id
  LEFT JOIN enrollments e ON b.id = e.batch_id AND e.status = 'enrolled'
  LEFT JOIN users students ON e.student_id = students.id
  ${type === 'date_range' ? 'WHERE b.created_at >= ? AND b.created_at <= ?' : ''}
  GROUP BY b.id, c.id, instructor.id
  
  ORDER BY created_at DESC;

      `,

      // 2. Student Performance (Progress + Assignments + Attendance)
      performance: `
        SELECT 
          u.id as student_id,
          u.name AS student_name,
          u.email AS student_email,
          c.name AS course_name,
          b.name AS batch_name,
          
          -- Progress Data
          COUNT(DISTINCT l.id) AS total_lessons,
          COUNT(DISTINCT sp.lesson_id) AS completed_lessons,
          ROUND((COUNT(DISTINCT sp.lesson_id) / COUNT(DISTINCT l.id)) * 100, 2) AS progress_percentage,
          
          -- Assignment Data
          COUNT(DISTINCT asub.id) AS submitted_assignments,
          COUNT(DISTINCT CASE WHEN asub.score IS NOT NULL THEN asub.id END) AS graded_assignments,
          ROUND(AVG(asub.score), 2) AS avg_score,
          
          -- Attendance Data
          COUNT(DISTINCT att.id) AS total_attendance_days,
          COUNT(DISTINCT CASE WHEN att.status = 'present' THEN att.id END) AS present_days,
          ROUND((COUNT(DISTINCT CASE WHEN att.status = 'present' THEN att.id END) / COUNT(DISTINCT att.id)) * 100, 2) AS attendance_percentage,
          
          DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolled_date,
          DATE_FORMAT(MAX(sp.completed_date), '%Y-%m-%d') AS last_activity
          
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        JOIN batches b ON e.batch_id = b.id
        JOIN courses c ON b.course_id = c.id
        LEFT JOIN lessons l ON c.id = l.course_id
        LEFT JOIN student_progress sp ON u.id = sp.student_id AND l.id = sp.lesson_id
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND u.id = asub.student_id
        LEFT JOIN attendance att ON u.id = att.student_id AND b.id = att.batch_id
        
        WHERE e.status = 'enrolled'
        ${type === 'date_range' ? 'AND e.enrolled_date >= ? AND e.enrolled_date <= ?' : ''}
        
        GROUP BY u.id, c.id, b.id
        ORDER BY progress_percentage DESC, avg_score DESC;
      `,

      // 3. Learning Analytics (Lessons + Assignment Details)
      analytics: `
        SELECT 
          'lesson' as content_type,
          l.id,
          l.title as name,
          l.content as description,
          c.name as course_name,
          l.lesson_order as order_sequence,
          l.duration,
          COUNT(sp.student_id) as completion_count,
          NULL as submission_count,
          NULL as avg_score,
          DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN student_progress sp ON l.id = sp.lesson_id
        ${type === 'date_range' ? 'WHERE l.created_at >= ? AND l.created_at <= ?' : ''}
        GROUP BY l.id

        UNION ALL

        SELECT 
          'assignment' as content_type,
          a.id,
          a.title as name,
          a.description,
          c.name as course_name,
          NULL as order_sequence,
          NULL as duration,
          NULL as completion_count,
          COUNT(asub.id) as submission_count,
          ROUND(AVG(asub.score), 2) as avg_score,
          DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
        ${type === 'date_range' ? 'WHERE a.created_at >= ? AND a.created_at <= ?' : ''}
        GROUP BY a.id
        
        ORDER BY created_at DESC;
      `
    };

    // Ensure the category is valid
    if (!queries[category]) {
      return res.status(400).json({ 
        message: 'Invalid report category',
        available_categories: Object.keys(queries)
      });
    }

    // Execute Query for the Specific Category
    const params = type === 'date_range' ? [start_date, end_date] : [];
    let finalParams = params;
    
    // For academic category (UNION query), duplicate params
    if (category === 'academic' && type === 'date_range') {
      finalParams = [start_date, end_date, start_date, end_date];
    }
    
    const [results] = await db.promise().query(queries[category], finalParams);

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

    // Add summary statistics for study-related categories
    let summary = {};
    if (['academic', 'performance', 'analytics'].includes(category)) {
      summary = generateSummaryStats(category, results);
    }

    // Respond with the Report Data
    res.status(200).json({
      [category]: processedResults,
      summary: summary,
      total_records: results.length,
      date_range: type === 'date_range' ? { start_date, end_date } : null
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// Helper function to generate summary statistics
const generateSummaryStats = (category, data) => {
  const summary = {};
  
  switch (category) {
    case 'academic':
      const courses = data.filter(d => d.record_type === 'course');
      const batches = data.filter(d => d.record_type === 'batch');
      
      summary.total_courses = courses.length;
      summary.total_batches = batches.length;
      summary.total_enrollments = data.reduce((sum, item) => sum + (item.enrollment_count || 0), 0);
      summary.avg_lessons_per_course = courses.reduce((sum, c) => sum + c.lesson_count, 0) / courses.length || 0;
      summary.total_revenue = data.filter(d => d.price).reduce((sum, d) => sum + (d.price * d.enrollment_count), 0);
      break;
      
    case 'performance':
      summary.total_students = data.length;
      summary.avg_progress = data.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / data.length || 0;
      summary.avg_attendance = data.reduce((sum, s) => sum + (s.attendance_percentage || 0), 0) / data.length || 0;
      summary.avg_assignment_score = data.filter(s => s.avg_score).reduce((sum, s) => sum + s.avg_score, 0) / data.filter(s => s.avg_score).length || 0;
      summary.top_performers = data.filter(s => s.progress_percentage >= 80 && s.avg_score >= 80).length;
      break;
      
    case 'analytics':
      const lessons = data.filter(d => d.content_type === 'lesson');
      const assignments = data.filter(d => d.content_type === 'assignment');
      
      summary.total_lessons = lessons.length;
      summary.total_assignments = assignments.length;
      summary.avg_lesson_completion = lessons.reduce((sum, l) => sum + (l.completion_count || 0), 0) / lessons.length || 0;
      summary.avg_assignment_submissions = assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0) / assignments.length || 0;
      summary.overall_assignment_avg = assignments.filter(a => a.avg_score).reduce((sum, a) => sum + a.avg_score, 0) / assignments.filter(a => a.avg_score).length || 0;
      break;
      
    default:
      summary.total_records = data.length;
  }
  
  return summary;
};

// Get all available report categories
exports.getReportCategories = (req, res) => {
  const categories = {
    study_related: [
      'academic',      // Courses, Batches, Enrollments combined
      'performance',   // Student Progress, Assignments, Attendance combined
      'analytics'      // Lessons and Assignment analytics combined
    ],
    communication: [
      'surveys',
      'responses', 
      'feedback',
      'posts'
    ]
  };
  
  res.json({
    categories,
    all_categories: [...categories.study_related, ...categories.communication],
    descriptions: {
      academic: "Course overview, batch management, and enrollment statistics",
      performance: "Student progress, assignment scores, and attendance tracking", 
      analytics: "Learning content analytics and engagement metrics",
      surveys: "Survey data and questions",
      responses: "Survey responses from users",
      feedback: "Student feedback and admin responses",
      posts: "Forum topics and posts"
    }
  });
};