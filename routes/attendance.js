const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/AttendanceController');

router.get('/students', attendanceController.getStudents);
router.get('/batch/:batch_id/:date', attendanceController.getBatchAttendance);
router.get('/student/:student_id/batch/:batch_id', attendanceController.getStudentAttendance);
router.get('/batch/:batch_id/summary', attendanceController.getBatchAttendanceSummary);
router.post('/mark', attendanceController.markAttendance);

module.exports = router;
