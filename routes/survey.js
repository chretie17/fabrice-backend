const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');

// ===================== Admin Routes =====================

// Admin: Create a new survey
router.post('/admin/create', surveyController.createSurvey); // Create survey

// Admin: Get all surveys (active and inactive)
router.get('/admin/all', surveyController.getAllSurveys); // Get all surveys

// Admin: Update an existing survey
router.put('/admin/update', surveyController.updateSurvey); // Update survey

// Admin: Activate/Deactivate a survey
router.put('/admin/status', surveyController.updateSurveyStatus); // Activate or Deactivate survey

// Admin: Delete a survey (with associated questions)
router.delete('/admin/delete/:surveyId', surveyController.deleteSurvey); // Delete survey

// Admin: Add a question to a survey
router.post('/admin/question', surveyController.addQuestion); // Add question to survey

// Admin: Update a question in a survey
router.put('/admin/question', surveyController.updateQuestion); // Update question

// Admin: Delete a question from a survey
router.delete('/admin/question/:questionId', surveyController.deleteQuestion); // Delete question

// Admin: Get all questions for a specific survey
router.get('/:surveyId/questions', surveyController.getSurveyQuestions); // Get questions for a survey
router.get('/questions', surveyController.getAllQuestionsWithSurveys);

router.get('/responses', surveyController.getAllSurveysAndResponses);


// ===================== student Routes =====================

// student: Get available surveys (active surveys)
router.get('/student/available', surveyController.getAvailableSurveys); // Get available surveys

// student: Submit responses to a survey
router.post('/student/response', surveyController.submitSurveyResponses); // Submit responses

module.exports = router;
