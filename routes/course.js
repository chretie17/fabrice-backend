const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/CoursesController');

// ==================== COURSES ROUTES ====================
// Basic CRUD
router.get('/', coursesController.getAllCourses);
router.get('/:id', coursesController.getCourseById);
router.post('/', coursesController.createCourse);
router.put('/:id', coursesController.updateCourse);
router.delete('/:id', coursesController.deleteCourse);
router.get('/:id/stats', coursesController.getCourseStats);

// ==================== LESSONS ROUTES ====================
// Add/Update/Delete Lessons
router.post('/:course_id/lessons', coursesController.addLesson);
router.put('/lessons/:lesson_id', coursesController.updateLesson);
router.delete('/lessons/:lesson_id', coursesController.deleteLesson);

// ==================== ASSIGNMENTS ROUTES ====================
// Add/Update/Delete Assignments
router.post('/:course_id/assignments', coursesController.addAssignment);
router.put('/assignments/:assignment_id', coursesController.updateAssignment);
router.delete('/assignments/:assignment_id', coursesController.deleteAssignment);

// Get Assignment Submissions
router.get('/assignments/:assignment_id/submissions', coursesController.getAssignmentSubmissions);

// **NEW ROUTE**: Get student's specific assignment submission
router.get('/assignments/:assignment_id/student/:student_id', coursesController.getStudentAssignmentSubmissions);

// ==================== PROGRESS ROUTES ====================
// Mark lesson complete
router.post('/progress/complete', coursesController.markLessonComplete);

// Get student progress for course
router.get('/:course_id/progress/:student_id', coursesController.getStudentProgress);

// Get course progress summary (all students)
router.get('/:course_id/progress-summary', coursesController.getCourseProgressSummary);

// ==================== ASSIGNMENT SUBMISSION ROUTES ====================
// Submit assignment
router.post('/assignments/submit', coursesController.submitAssignment);
// Single submission grading
router.put('/assignments/submissions/:submission_id/grade', coursesController.gradeSubmission);

// Get grading details (optional)
router.get('/assignments/submissions/:submission_id/grade', coursesController.getSubmissionGrade);

module.exports = router;