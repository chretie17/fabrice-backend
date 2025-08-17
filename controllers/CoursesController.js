const db = require('../db');
const emailService = require('./Email'); // Import the email service

// ==================== COURSES ====================

// Get All Courses with lesson count
exports.getAllCourses = (req, res) => {
    const query = `
        SELECT c.*, 
               COUNT(DISTINCT l.id) as lesson_count,
               COUNT(DISTINCT a.id) as assignment_count
        FROM courses c
        LEFT JOIN lessons l ON c.id = l.course_id
        LEFT JOIN assignments a ON c.id = a.course_id
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Course by ID with lessons and assignments
exports.getCourseById = (req, res) => {
    const { id } = req.params;
    
    const courseQuery = `SELECT * FROM courses WHERE id = ?`;
    const lessonsQuery = `SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_order ASC`;
    const assignmentsQuery = `SELECT * FROM assignments WHERE course_id = ? ORDER BY created_at DESC`;
    
    db.query(courseQuery, [id], (err, courseResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (courseResults.length === 0) return res.status(404).json({ error: 'Course not found' });
        
        const course = courseResults[0];
        
        // Get lessons
        db.query(lessonsQuery, [id], (err, lessons) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Get assignments
            db.query(assignmentsQuery, [id], (err, assignments) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                    ...course,
                    lessons: lessons || [],
                    assignments: assignments || []
                });
            });
        });
    });
};

// Create New Course
exports.createCourse = (req, res) => {
    const { name, description, duration, price } = req.body;
    
    if (!name || !duration) {
        return res.status(400).json({ error: 'Course name and duration are required' });
    }
    
    const query = `
        INSERT INTO courses (name, description, duration, price) 
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [name, description, duration, price || 0], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
            message: 'Course created successfully',
            courseId: result.insertId
        });
    });
};

// Update Course
exports.updateCourse = (req, res) => {
    const { id } = req.params;
    const { name, description, duration, price, status } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (name) { updateFields.push('name = ?'); values.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); values.push(description); }
    if (duration) { updateFields.push('duration = ?'); values.push(duration); }
    if (price !== undefined) { updateFields.push('price = ?'); values.push(price); }
    if (status) { updateFields.push('status = ?'); values.push(status); }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    values.push(id);
    const query = `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Course not found' });
        res.json({ message: 'Course updated successfully' });
    });
};

// Delete Course
exports.deleteCourse = (req, res) => {
    const { id } = req.params;
    
    const checkQuery = `SELECT COUNT(*) as batch_count FROM batches WHERE course_id = ?`;
    
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results[0].batch_count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete course. It has existing batches.' 
            });
        }
        
        const deleteQuery = `DELETE FROM courses WHERE id = ?`;
        
        db.query(deleteQuery, [id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Course not found' });
            res.json({ message: 'Course deleted successfully' });
        });
    });
};

// ==================== LESSONS ====================

// Add Lesson to Course
exports.addLesson = (req, res) => {
    const { course_id } = req.params;
    const { title, content, video_url, lesson_order, duration } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Lesson title is required' });
    }
    
    const query = `
        INSERT INTO lessons (course_id, title, content, video_url, lesson_order, duration) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [course_id, title, content, video_url, lesson_order || 1, duration || 0], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
            message: 'Lesson added successfully',
            lessonId: result.insertId
        });
    });
};

// Update Lesson
exports.updateLesson = (req, res) => {
    const { lesson_id } = req.params;
    const { title, content, video_url, lesson_order, duration } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (title) { updateFields.push('title = ?'); values.push(title); }
    if (content !== undefined) { updateFields.push('content = ?'); values.push(content); }
    if (video_url !== undefined) { updateFields.push('video_url = ?'); values.push(video_url); }
    if (lesson_order) { updateFields.push('lesson_order = ?'); values.push(lesson_order); }
    if (duration !== undefined) { updateFields.push('duration = ?'); values.push(duration); }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    values.push(lesson_id);
    const query = `UPDATE lessons SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ message: 'Lesson updated successfully' });
    });
};

// Delete Lesson
exports.deleteLesson = (req, res) => {
    const { lesson_id } = req.params;
    const query = `DELETE FROM lessons WHERE id = ?`;
    
    db.query(query, [lesson_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ message: 'Lesson deleted successfully' });
    });
};

// ==================== ASSIGNMENTS ====================

// Add Assignment to Course
exports.addAssignment = (req, res) => {
    const { course_id } = req.params;
    const { title, description, due_date, max_points } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Assignment title is required' });
    }
    
    const query = `
        INSERT INTO assignments (course_id, title, description, due_date, max_points) 
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [course_id, title, description, due_date, max_points || 100], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
            message: 'Assignment added successfully',
            assignmentId: result.insertId
        });
    });
};

// Update Assignment
exports.updateAssignment = (req, res) => {
    const { assignment_id } = req.params;
    const { title, description, due_date, max_points } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (title) { updateFields.push('title = ?'); values.push(title); }
    if (description !== undefined) { updateFields.push('description = ?'); values.push(description); }
    if (due_date) { updateFields.push('due_date = ?'); values.push(due_date); }
    if (max_points !== undefined) { updateFields.push('max_points = ?'); values.push(max_points); }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    values.push(assignment_id);
    const query = `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Assignment updated successfully' });
    });
};

// Delete Assignment
exports.deleteAssignment = (req, res) => {
    const { assignment_id } = req.params;
    const query = `DELETE FROM assignments WHERE id = ?`;
    
    db.query(query, [assignment_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Assignment deleted successfully' });
    });
};

// ==================== PROGRESS TRACKING ====================

// Mark Lesson as Complete
exports.markLessonComplete = (req, res) => {
    const { student_id, lesson_id } = req.body;
    
    if (!student_id || !lesson_id) {
        return res.status(400).json({ error: 'Student ID and Lesson ID are required' });
    }
    
    const query = `
        INSERT INTO student_progress (student_id, lesson_id, completed_date) 
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE completed_date = NOW()
    `;
    
    db.query(query, [student_id, lesson_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Lesson marked as complete' });
    });
};

// Get Student Progress for Course
exports.getStudentProgress = (req, res) => {
    const { student_id, course_id } = req.params;
    
    const query = `
        SELECT 
            l.id as lesson_id,
            l.title as lesson_title,
            l.lesson_order,
            l.duration,
            l.video_url,
            sp.completed_date,
            CASE WHEN sp.lesson_id IS NOT NULL THEN 1 ELSE 0 END as completed
        FROM lessons l
        LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = ?
        WHERE l.course_id = ?
        ORDER BY l.lesson_order ASC
    `;
    
    db.query(query, [student_id, course_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Course Progress Summary
exports.getCourseProgressSummary = (req, res) => {
    const { course_id } = req.params;
    
    const query = `
        SELECT 
            u.id as student_id,
            u.name as student_name,
            COUNT(l.id) as total_lessons,
            COUNT(sp.lesson_id) as completed_lessons,
            ROUND((COUNT(sp.lesson_id) / COUNT(l.id)) * 100, 2) as progress_percentage
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        JOIN batches b ON e.batch_id = b.id
        CROSS JOIN lessons l ON b.course_id = l.course_id
        LEFT JOIN student_progress sp ON u.id = sp.student_id AND l.id = sp.lesson_id
        WHERE b.course_id = ? AND e.status = 'enrolled'
        GROUP BY u.id, u.name
        ORDER BY progress_percentage DESC
    `;
    
    db.query(query, [course_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// ==================== ASSIGNMENT SUBMISSIONS ====================

// Enhanced Submit Assignment with Email Notification
exports.submitAssignment = async (req, res) => {
    const { student_id, assignment_id, submission_text, file_path } = req.body;
    
    if (!student_id || !assignment_id) {
        return res.status(400).json({ error: 'Student ID and Assignment ID are required' });
    }
    
    // Check if submission already exists
    const checkQuery = `SELECT id FROM assignment_submissions WHERE student_id = ? AND assignment_id = ?`;
    
    db.query(checkQuery, [student_id, assignment_id], async (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const isUpdate = existing.length > 0;
        let submissionId;
        
        if (isUpdate) {
            // Update existing submission
            const updateQuery = `
                UPDATE assignment_submissions 
                SET submission_text = ?, file_path = ?, submitted_date = NOW(),
                    score = NULL, feedback = NULL, graded_date = NULL
                WHERE student_id = ? AND assignment_id = ?
            `;
            
            db.query(updateQuery, [submission_text, file_path, student_id, assignment_id], async (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                
                submissionId = existing[0].id;
                
                // Send email confirmation
                await sendSubmissionEmail(student_id, assignment_id, isUpdate);
                
                res.json({ 
                    message: 'Assignment updated successfully',
                    submissionId: submissionId,
                    isUpdate: true 
                });
            });
        } else {
            // Create new submission
            const insertQuery = `
                INSERT INTO assignment_submissions (student_id, assignment_id, submission_text, file_path, submitted_date) 
                VALUES (?, ?, ?, ?, NOW())
            `;
            
            db.query(insertQuery, [student_id, assignment_id, submission_text, file_path], async (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                
                submissionId = result.insertId;
                
                // Send email confirmation
                await sendSubmissionEmail(student_id, assignment_id, isUpdate);
                
                res.json({ 
                    message: 'Assignment submitted successfully',
                    submissionId: submissionId,
                    isUpdate: false 
                });
            });
        }
    });
};

// Helper function to send submission confirmation email
async function sendSubmissionEmail(student_id, assignment_id, isUpdate) {
    try {
        const query = `
            SELECT 
                u.name as student_name,
                u.email as student_email,
                a.title as assignment_title,
                c.name as course_name
            FROM users u
            JOIN assignment_submissions asub ON u.id = asub.student_id
            JOIN assignments a ON asub.assignment_id = a.id
            JOIN courses c ON a.course_id = c.id
            WHERE u.id = ? AND a.id = ?
            LIMIT 1
        `;
        
        db.query(query, [student_id, assignment_id], async (err, results) => {
            if (err || results.length === 0) {
                console.error('Error fetching submission details for email:', err);
                return;
            }
            
            const { student_name, student_email, assignment_title, course_name } = results[0];
            
            await emailService.sendSubmissionConfirmation(
                student_email,
                student_name,
                assignment_title,
                course_name,
                isUpdate
            );
        });
    } catch (error) {
        console.error('Error sending submission confirmation email:', error);
    }
}

// Get Assignment Submissions
exports.getAssignmentSubmissions = (req, res) => {
    const { assignment_id } = req.params;
    
    const query = `
        SELECT 
            asub.*,
            u.name as student_name,
            u.email as student_email
        FROM assignment_submissions asub
        JOIN users u ON asub.student_id = u.id
        WHERE asub.assignment_id = ?
        ORDER BY asub.submitted_date DESC
    `;
    
    db.query(query, [assignment_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Student's Assignment Submission
exports.getStudentAssignmentSubmissions = (req, res) => {
    const { student_id, assignment_id } = req.params;
    
    const query = `
        SELECT asub.*, a.max_points, a.title as assignment_title
        FROM assignment_submissions asub
        JOIN assignments a ON asub.assignment_id = a.id
        WHERE asub.student_id = ? AND asub.assignment_id = ?
        ORDER BY asub.submitted_date DESC
        LIMIT 1
    `;
    
    db.query(query, [student_id, assignment_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || null);
    });
};

// Enhanced Grade Submission with Email Notification
exports.gradeSubmission = async (req, res) => {
    const { submission_id } = req.params;
    const { score, feedback, graded_by } = req.body;
    
    if (!score && score !== 0) {
        return res.status(400).json({ error: 'Score is required' });
    }
    
    // Format date for MySQL
    const graded_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const updateQuery = `
        UPDATE assignment_submissions 
        SET 
            score = ?,
            feedback = ?,
            graded_by = ?,
            graded_date = ?
        WHERE id = ?
    `;
    
    db.query(updateQuery, [score, feedback, graded_by, graded_date, submission_id], async (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        // Send grade notification email
        try {
            await sendGradeNotificationEmail(submission_id, score, feedback, graded_by);
        } catch (emailError) {
            console.error('Error sending grade notification email:', emailError);
            // Don't fail the grading process if email fails
        }
        
        res.json({ 
            message: 'Submission graded successfully',
            submission_id: submission_id,
            score: score
        });
    });
};

// Helper function to send grade notification email
async function sendGradeNotificationEmail(submission_id, score, feedback, graded_by) {
    try {
        const query = `
            SELECT 
                u.name as student_name,
                u.email as student_email,
                a.title as assignment_title,
                a.max_points,
                c.name as course_name,
                grader.name as grader_name
            FROM assignment_submissions asub
            JOIN users u ON asub.student_id = u.id
            JOIN assignments a ON asub.assignment_id = a.id
            JOIN courses c ON a.course_id = c.id
            LEFT JOIN users grader ON asub.graded_by = grader.id
            WHERE asub.id = ?
        `;
        
        db.query(query, [submission_id], async (err, results) => {
            if (err || results.length === 0) {
                console.error('Error fetching grade details for email:', err);
                return;
            }
            
            const { 
                student_name, 
                student_email, 
                assignment_title, 
                max_points, 
                course_name, 
                grader_name 
            } = results[0];
            
            await emailService.sendGradeNotification(
                student_email,
                student_name,
                assignment_title,
                course_name,
                score,
                max_points,
                feedback,
                grader_name || 'Instructor'
            );
        });
    } catch (error) {
        console.error('Error in sendGradeNotificationEmail:', error);
        throw error;
    }
}

// Get Submission Grade Details
exports.getSubmissionGrade = (req, res) => {
    const { submission_id } = req.params;
    
    const query = `
        SELECT 
            s.id,
            s.score,
            s.feedback,
            s.graded_by,
            s.graded_date,
            s.submitted_date,
            s.submission_text,
            s.file_path,
            u.name as student_name,
            u.email as student_email,
            a.title as assignment_title,
            a.max_points,
            c.name as course_name,
            grader.name as grader_name
        FROM assignment_submissions s
        JOIN users u ON s.student_id = u.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN users grader ON s.graded_by = grader.id
        WHERE s.id = ?
    `;
    
    db.query(query, [submission_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        res.json(results[0]);
    });
};

// Get Assignment by ID
exports.getAssignmentById = (req, res) => {
    const { assignment_id } = req.params;
    
    const query = `
        SELECT a.*, c.name as course_name, c.id as course_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.id = ?
    `;
    
    db.query(query, [assignment_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json(results[0]);
    });
};

// Get Course Statistics (Enhanced)
exports.getCourseStats = (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            c.name,
            COUNT(DISTINCT b.id) as total_batches,
            COUNT(DISTINCT e.student_id) as total_students,
            COUNT(DISTINCT l.id) as total_lessons,
            COUNT(DISTINCT a.id) as total_assignments,
            COUNT(DISTINCT CASE WHEN b.status = 'ongoing' THEN b.id END) as active_batches,
            AVG(CASE WHEN sp.lesson_id IS NOT NULL THEN 1 ELSE 0 END) * 100 as avg_progress_percentage
        FROM courses c
        LEFT JOIN batches b ON c.id = b.course_id
        LEFT JOIN enrollments e ON b.id = e.batch_id AND e.status = 'enrolled'
        LEFT JOIN lessons l ON c.id = l.course_id
        LEFT JOIN assignments a ON c.id = a.course_id
        LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND e.student_id = sp.student_id
        WHERE c.id = ?
        GROUP BY c.id, c.name
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Course not found' });
        res.json(results[0]);
    });
};


// ==================== BULK EMAIL OPERATIONS ====================

// Send bulk grade notifications (for batch operations)
exports.sendBulkGradeNotifications = async (req, res) => {
    const { submission_ids } = req.body;
    
    if (!submission_ids || !Array.isArray(submission_ids)) {
        return res.status(400).json({ error: 'Submission IDs array is required' });
    }
    
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const submission_id of submission_ids) {
        try {
            // Get submission details
            const query = `
                SELECT 
                    asub.score,
                    asub.feedback,
                    asub.graded_by,
                    u.name as student_name,
                    u.email as student_email,
                    a.title as assignment_title,
                    a.max_points,
                    c.name as course_name,
                    grader.name as grader_name
                FROM assignment_submissions asub
                JOIN users u ON asub.student_id = u.id
                JOIN assignments a ON asub.assignment_id = a.id
                JOIN courses c ON a.course_id = c.id
                LEFT JOIN users grader ON asub.graded_by = grader.id
                WHERE asub.id = ? AND asub.score IS NOT NULL
            `;
            
            db.query(query, [submission_id], async (err, submissionResults) => {
                if (err || submissionResults.length === 0) {
                    results.failed++;
                    results.errors.push(`Submission ${submission_id}: No graded submission found`);
                    return;
                }
                
                const submission = submissionResults[0];
                
                await emailService.sendGradeNotification(
                    submission.student_email,
                    submission.student_name,
                    submission.assignment_title,
                    submission.course_name,
                    submission.score,
                    submission.max_points,
                    submission.feedback,
                    submission.grader_name || 'Instructor'
                );
                
                results.success++;
            });
        } catch (error) {
            results.failed++;
            results.errors.push(`Submission ${submission_id}: ${error.message}`);
        }
    }
    
    res.json({
        message: `Bulk email operation completed`,
        results: results
    });
};