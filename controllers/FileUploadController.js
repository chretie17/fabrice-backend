// ==================== BACKEND ====================

const db = require('../db');
const path = require('path');
const fs = require('fs');

// Submit assignment with optional file
exports.submitAssignment = (req, res) => {
    const { student_id, assignment_id, submission_text } = req.body;
    const file_path = req.file ? req.file.filename : null;
    const file_original_name = req.file ? req.file.originalname : null;
    
    if (!student_id || !assignment_id) {
        return res.status(400).json({ error: 'Student ID and Assignment ID required' });
    }
    
    const query = `
        INSERT INTO assignment_submissions 
        (student_id, assignment_id, submission_text, file_path, file_original_name, submitted_date) 
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
        submission_text = VALUES(submission_text),
        file_path = VALUES(file_path),
        file_original_name = VALUES(file_original_name),
        submitted_date = NOW()
    `;
    
    db.query(query, [student_id, assignment_id, submission_text, file_path, file_original_name], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            message: 'Assignment submitted successfully',
            hasFile: !!file_path 
        });
    });
};

// Get student submission with file info
exports.getStudentSubmission = (req, res) => {
    const { student_id, assignment_id } = req.params;
    
    const query = `
        SELECT *, 
               CASE WHEN file_path IS NOT NULL THEN 1 ELSE 0 END as has_file
        FROM assignment_submissions 
        WHERE student_id = ? AND assignment_id = ?
    `;
    
    db.query(query, [student_id, assignment_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || null);
    });
};

// Download file (for instructors)
exports.downloadFile = (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
};

// Get all submissions for assignment (for instructors)
exports.getAssignmentSubmissions = (req, res) => {
    const { assignment_id } = req.params;
    
    const query = `
        SELECT s.*, u.name as student_name, u.email,
               CASE WHEN s.file_path IS NOT NULL THEN 1 ELSE 0 END as has_file
        FROM assignment_submissions s
        JOIN users u ON s.student_id = u.id
        WHERE s.assignment_id = ?
        ORDER BY s.submitted_date DESC
    `;
    
    db.query(query, [assignment_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};



