const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');

router.get('/', enrollmentController.getAllEnrollments);
router.get('/available-batches', enrollmentController.getAvailableBatches);
router.get('/student/:student_id', enrollmentController.getStudentEnrollments);
router.get('/batch/:batch_id/students', enrollmentController.getBatchStudents);
router.post('/enroll', enrollmentController.enrollStudent);
router.post('/drop', enrollmentController.dropStudent);
router.post('/submit-payment-proof', enrollmentController.submitPaymentProof); // New route for payment proof
router.post('/verify-payment', enrollmentController.verifyPayment); // New route for payment verification

module.exports = router;