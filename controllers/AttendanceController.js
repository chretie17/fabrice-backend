const db = require('../db');


// Mark Attendance for Multiple Students
exports.markAttendance = (req, res) => {
    const { batch_id, date, attendance_records, marked_by } = req.body;
    
    if (!batch_id || !date || !attendance_records || !marked_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Delete existing attendance for this batch and date
    const deleteQuery = `DELETE FROM attendance WHERE batch_id = ? AND date = ?`;
    
    db.query(deleteQuery, [batch_id, date], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Insert new attendance records
        const values = attendance_records.map(record => [
            record.student_id, batch_id, date, record.status, marked_by
        ]);
        
        const insertQuery = `
            INSERT INTO attendance (student_id, batch_id, date, status, marked_by) 
            VALUES ?
        `;
        
        db.query(insertQuery, [values], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Attendance marked successfully' });
        });
    });
};

// Get Batch Attendance for a Date
exports.getBatchAttendance = (req, res) => {
    const { batch_id, date } = req.params;
    const query = `
        SELECT a.*, u.name as student_name
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        WHERE a.batch_id = ? AND a.date = ?
    `;
    
    db.query(query, [batch_id, date], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Student Attendance Report
exports.getStudentAttendance = (req, res) => {
    const { student_id, batch_id } = req.params;
    const query = `
        SELECT a.*, b.name as batch_name
        FROM attendance a
        JOIN batches b ON a.batch_id = b.id
        WHERE a.student_id = ? AND a.batch_id = ?
        ORDER BY a.date DESC
    `;
    
    db.query(query, [student_id, batch_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Attendance Summary for Batch
exports.getBatchAttendanceSummary = (req, res) => {
    const { batch_id } = req.params;
    const query = `
        SELECT 
            u.id as student_id,
            u.name as student_name,
            COUNT(a.id) as total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
            ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2) as attendance_percentage
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        LEFT JOIN attendance a ON e.student_id = a.student_id AND e.batch_id = a.batch_id
        WHERE e.batch_id = ? AND e.status = 'enrolled'
        GROUP BY u.id, u.name
    `;
    
    db.query(query, [batch_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Students (for dropdown)
exports.getStudents = (req, res) => {
    const query = `SELECT id, name, email FROM users WHERE role = 'student'`;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};