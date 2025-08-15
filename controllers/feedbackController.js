// controllers/feedback.js
const db = require('../db');
const nodemailer = require('nodemailer');

const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'turashimyechretien@@gmail.com',
    pass: process.env.SMTP_PASS || 'hovj wyno fbck uaal'
  }
};
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

function feedbackEmailHTML(student, course, feedback) {
  return `
    <!doctype html><html><head><meta charset="utf-8" /></head><body>
      <div>
        <h1>Feedback Confirmation</h1>
        <p>Dear ${student.student_name},</p>
        <p>Thanks for your feedback on <strong>${course.course_name}</strong>.</p>
        <ul>
          <li><strong>Rating:</strong> ${feedback.rating} / 5</li>
          <li><strong>Comments:</strong> ${feedback.comments}</li>
        </ul>
        <p>We appreciate your time!</p>
        <p>— Team</p>
      </div>
    </body></html>`;
}

/** POST /api/feedback  (body: { userId, course_id, rating, comments }) */
exports.handleFeedback = async (req, res) => {
  const { userId, course_id, rating, comments } = req.body;
  if (!userId || !course_id || !rating || comments === undefined) {
    return res.status(400).json({ message: 'userId, course_id, rating and comments are required.' });
  }

  try {
    // 1) Course exists?
    const [courseRows] = await db.promise().query(
      'SELECT id, name AS course_name FROM courses WHERE id = ?',
      [course_id]
    );
    if (courseRows.length === 0) return res.status(404).json({ message: 'Course not found.' });
    const course = courseRows[0];

    // 2) ENROLLMENT CHECK (only accept feedback if the user is enrolled in this course)
    // Require both enrolled AND payment verified. If you only want enrolled, drop the payment_status condition.
    const [enrollmentRows] = await db.promise().query(
      `
      SELECT e.id
      FROM enrollments e
      JOIN batches b ON e.batch_id = b.id
      WHERE e.student_id = ? 
        AND b.course_id   = ?
        AND e.status      = 'enrolled'
        AND e.payment_status = 'verified'
      LIMIT 1
      `,
      [userId, course_id]
    );
    if (enrollmentRows.length === 0) {
      return res.status(403).json({
        message: 'You can only give feedback for courses you are enrolled in (and verified).'
      });
    }

    // 3) Prevent duplicate feedback per (student, course)
    const [dupe] = await db.promise().query(
      'SELECT id FROM feedback WHERE course_id = ? AND student_id = ?',
      [course_id, userId]
    );
    if (dupe.length > 0) {
      return res.status(400).json({ message: 'You have already provided feedback for this course.' });
    }

    // 4) Insert feedback
    await db.promise().query(
      'INSERT INTO feedback (course_id, student_id, rating, comments) VALUES (?, ?, ?, ?)',
      [course_id, userId, rating, comments]
    );

    // 5) Email (non-blocking)
    const [studentRows] = await db.promise().query(
      'SELECT name AS student_name, email FROM users WHERE id = ?',
      [userId]
    );
    if (studentRows.length) {
      const student = studentRows[0];
      const html = feedbackEmailHTML(student, course, { rating, comments });
      transporter.sendMail(
        { from: process.env.EMAIL_USER, to: student.email, subject: 'Thanks for your course feedback', html },
        (err) => err && console.error('Email error:', err)
      );
    }

    res.status(201).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ message: 'Error processing feedback', error });
  }
};


/** GET /api/feedback  (admin view) */
exports.getAllFeedbacks = (req, res) => {
  const sql = `
    SELECT f.id, f.course_id, f.student_id, f.rating, f.comments, f.created_at, f.response,
           u.name AS student_name, c.name AS course_name
    FROM feedback f
    JOIN users u   ON f.student_id = u.id
    JOIN courses c ON f.course_id  = c.id
    ORDER BY f.created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching feedbacks', error: err });
    res.status(200).json(rows);
  });
};

/** PUT /api/feedback/:feedbackId/respond  (admin) */
exports.respondToFeedback = async (req, res) => {
  const { feedbackId } = req.params;
  const { response } = req.body;
  if (!response) return res.status(400).json({ message: 'Response is required.' });

  try {
    await db.promise().query('UPDATE feedback SET response = ? WHERE id = ?', [response, feedbackId]);
    res.status(200).json({ message: 'Response successfully added to feedback.' });
  } catch (error) {
    console.error('Error updating feedback response:', error);
    res.status(500).json({ message: 'Error updating feedback response', error });
  }
};

/** GET /api/feedback/user/:userId  (student view) */
exports.getUserFeedbacks = (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT f.id, f.course_id, f.rating, f.comments, f.response, f.created_at,
           c.name AS course_name
    FROM feedback f
    JOIN courses c ON f.course_id = c.id
    WHERE f.student_id = ?
    ORDER BY f.created_at DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching feedbacks', error: err });
    if (rows.length === 0) return res.status(404).json({ message: 'No feedback found for this user.' });
    res.status(200).json(rows);
  });
};

/** GET /api/courses/student/:studentId — courses this student is enrolled in */
/** GET /api/courses/student/:studentId — courses this student can rate */
exports.getCoursesByStudent = (req, res) => {
  const { studentId } = req.params;
  const sql = `
    SELECT 
      c.id AS course_id, c.name AS course_name,
      b.id AS batch_id,  b.name AS batch_name,
      e.status, e.payment_status, e.created_at AS enrolled_at
    FROM enrollments e
    JOIN batches b ON e.batch_id  = b.id
    JOIN courses c ON b.course_id = c.id
    WHERE e.student_id = ?
      AND e.status = 'enrolled'
      AND e.payment_status = 'verified'
    ORDER BY e.created_at DESC
  `;
  db.query(sql, [studentId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching courses', error: err });
    if (rows.length === 0) return res.status(200).json([]); // just return empty
    res.status(200).json(rows);
  });
};

