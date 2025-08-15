const express = require('express');
const router = express.Router();
const feedbackSurveyController = require('../controllers/feedbackController');

// Feedback Routes

// Route to handle feedback submission
router.post('/', feedbackSurveyController.handleFeedback); // Submit Feedback (POST)

// Route to get services requested by a specific student (GET by studentId)
router.get('/:studentId', feedbackSurveyController.getServicesBystudent); // Get services requested by student

// Admin routes
router.get('/', feedbackSurveyController.getAllFeedbacks); // Get all feedbacks (admin)
// Correcting the route to include the feedbackId
router.post('/response/:feedbackId', feedbackSurveyController.respondToFeedback);

router.get('/user/:userId', feedbackSurveyController.getUserFeedbacks); // Get feedback for specific user
router.post('/feedback', feedbackSurveyController.handleFeedback); // Submit feedback

module.exports = router;
