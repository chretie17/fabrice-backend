const db = require('../db');
const nodemailer = require('nodemailer');

// Secure Email Transporter Configuration (with hard-coded credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Use environment variables for sensitive info
    pass: process.env.EMAIL_PASS, // Use environment variables for sensitive info
  },
  secure: true,
});

// Generate Professional Email Template for feedback
function generateFeedbackEmailHTML(studentDetails, feedbackDetails) {
  const { student_name, service_type, floors, room_numbers } = studentDetails;
  const { rating, comments } = feedbackDetails;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
  </head>
  <body>
      <div>
          <h1>Feedback Confirmation</h1>
          <p>Dear ${student_name},</p>
          <p>Thank you for your feedback regarding the service request. Below are the details of your feedback:</p>
          
          <div>
              <ul>
                  <li><strong>Service Type:</strong> ${service_type}</li>
                  <li><strong>Location:</strong> Floors ${floors}, Room ${room_numbers}</li>
                  <li><strong>Rating:</strong> ${rating} / 5</li>
                  <li><strong>Comments:</strong> ${comments}</li>
              </ul>
          </div>
          <p>Your feedback is invaluable in helping us improve our services.</p>
          <p>Best regards,<br>OfficeHub Support Team</p>
      </div>
  </body>
  </html>
  `;
}

// Controller: Handle Feedback Submission
exports.handleFeedback = async (req, res) => {
    const { userId, service_id, rating, comments } = req.body; // Ensure correct field names
    console.log(`Received feedback submission: userId=${userId}, service_id=${service_id}, rating=${rating}, comments=${comments}`);

    // Validate input
    if (!service_id || !rating || !comments) {
        console.log('Missing required fields');
        return res.status(400).json({ message: 'Missing required fields: serviceId, rating, or comments.' });
    }

    try {
        // Step 1: Check if the service_id exists in the services table
        const [serviceResult] = await db.promise().query(
            `SELECT * FROM services WHERE id = ?;`, [service_id]
        );
        console.log(`Service check result: ${serviceResult.length} service(s) found for id=${service_id}`);

        if (serviceResult.length === 0) {
            console.log('Service not found for the provided serviceId');
            return res.status(404).json({ message: 'Service not found for the provided serviceId.' });
        }

        // Step 2: Check if feedback already exists for this service and student
        const [feedbackResult] = await db.promise().query(
            `SELECT * FROM feedback WHERE service_id = ? AND student_id = ?;`,
            [service_id, userId]
        );
        console.log(`Feedback check result: ${feedbackResult.length} feedback(s) found for studentId=${userId} and serviceId=${service_id}`);

        if (feedbackResult.length > 0) {
            console.log('Feedback already provided for this service by this student');
            return res.status(400).json({ message: 'You have already provided feedback for this service.' });
        }

        // Step 3: Insert Feedback Data into Database
        await db.promise().query(
            `INSERT INTO feedback (service_id, student_id, rating, comments)
            VALUES (?, ?, ?, ?);`,
            [service_id, userId, rating, comments]
        );
        console.log('Feedback data inserted into database');

        // Step 4: Fetch student Details
        const [studentResult] = await db.promise().query(
            `SELECT name AS student_name, email FROM users WHERE id = ?;`,
            [userId]
        );
        console.log(`student details fetched: ${studentResult.length} student(s) found for id=${userId}`);

        if (studentResult.length === 0) {
            console.log('student not found');
            return res.status(404).json({ message: 'student not found' });
        }

        const studentDetails = studentResult[0];
        const feedbackDetails = { rating, comments };

        // Generate Email Content
        const emailHTML = generateFeedbackEmailHTML(studentDetails, feedbackDetails);
        console.log('Generated email HTML for feedback confirmation');

        // Step 5: Send Confirmation Email to student
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender email from environment variable
            to: studentDetails.email,      // student's email fetched from database
            subject: 'Feedback Confirmation',
            html: emailHTML,
        };

        transporter.sendMail(mailOptions, (emailErr, info) => {
            if (emailErr) {
                console.error('Error sending confirmation email:', emailErr);
            } else {
                console.log('Confirmation email sent:', info.response);
            }
        });

        res.status(201).json({ message: 'Feedback submitted successfully and confirmation email sent' });

    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({ message: 'Error processing feedback', error });
    }
};

// Route for fetching services by studentId
exports.getServicesBystudent = (req, res) => {
    const { studentId } = req.params; // Get studentId from URL params
    console.log(`Fetching services for studentId=${studentId}`);

    const query = `
      SELECT s.id, s.service_type,s.status, s.floors, s.room_numbers
      FROM services s
      WHERE s.student_id = ?;
    `;

    db.query(query, [studentId], (err, services) => {
        if (err) {
            console.error('Error fetching services:', err);
            return res.status(500).json({ message: 'Error fetching services', error: err });
        }

        console.log(`Found ${services.length} service(s) for studentId=${studentId}`);
        if (services.length === 0) {
            return res.status(404).json({ message: 'No services found for this student.' });
        }

        res.status(200).json(services); // Return services requested by the student
    });
};
exports.getAllFeedbacks = (req, res) => {
    const query = `
      SELECT f.id, f.service_id, f.student_id, f.rating, f.comments,f.created_at, f.response, u.name AS student_name, s.service_type
      FROM feedback f
      JOIN users u ON f.student_id = u.id
      JOIN services s ON f.service_id = s.id;
    `;
    
    db.query(query, (err, feedbacks) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching feedbacks', error: err });
      }
  
      res.status(200).json(feedbacks);
    });
  };
  
  // Admin: Respond to feedback
  exports.respondToFeedback = async (req, res) => {
    const { feedbackId } = req.params;  // Get feedbackId from the URL
    const { response } = req.body;  // Get the response from the request body

    if (!response) {
      return res.status(400).json({ message: 'Response is required.' });
    }

    try {
      const updateQuery = `
        UPDATE feedback
        SET response = ?
        WHERE id = ?;
      `;
      await db.promise().query(updateQuery, [response, feedbackId]);

      res.status(200).json({ message: 'Response successfully added to feedback.' });

    } catch (error) {
      console.error('Error updating feedback response:', error);
      res.status(500).json({ message: 'Error updating feedback response', error });
    }
};

  // User: Get their feedbacks
  exports.getUserFeedbacks = (req, res) => {
    const { userId } = req.params;
  
    const query = `
      SELECT f.id, f.service_id, f.rating, f.comments, f.response, s.service_type
      FROM feedback f
      JOIN services s ON f.service_id = s.id
      WHERE f.student_id = ?;
    `;
    
    db.query(query, [userId], (err, feedbacks) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching feedbacks', error: err });
      }
  
      if (feedbacks.length === 0) {
        return res.status(404).json({ message: 'No feedback found for this user.' });
      }
  
      res.status(200).json(feedbacks);
    });
  };