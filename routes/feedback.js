// routes/feedback.js
const express = require('express');
const router = express.Router();
const feedback = require('../controllers/feedbackController');

router.post('/', feedback.handleFeedback);
router.get('/', feedback.getAllFeedbacks);
router.put('/:feedbackId/respond', feedback.respondToFeedback);
router.get('/user/:userId', feedback.getUserFeedbacks);

// helpful for picker/dropdown of user’s courses
router.get('/courses/student/:studentId', feedback.getCoursesByStudent);

module.exports = router;
