const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/AttendanceController');

// Basic attendance operations (non-parameterized routes first)
router.get('/students', attendanceController.getStudents);
router.post('/mark', attendanceController.markAttendance);
router.put('/bulk-update', attendanceController.bulkUpdateAttendance);

// Enhanced attendance features (SPECIFIC routes MUST come BEFORE generic ones)
router.get('/batch/:batch_id/history', attendanceController.getBatchAttendanceHistory);
router.get('/batch/:batch_id/dates', attendanceController.getBatchAttendanceDates);
router.get('/batch/:batch_id/summary', attendanceController.getBatchAttendanceSummary);
router.get('/batch/:batch_id/stats', attendanceController.getAttendanceStats);
router.get('/student/:student_id/batch/:batch_id', attendanceController.getStudentAttendance);

// Generic route MUST come LAST (this catches /batch/:batch_id/:date where date is an actual date)
router.get('/batch/:batch_id/:date', attendanceController.getBatchAttendance);

module.exports = router;