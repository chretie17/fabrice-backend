const db = require('../db');

// Mark Attendance for Multiple Students
exports.markAttendance = (req, res) => {
    const { batch_id, date, attendance_records, marked_by } = req.body;
    
    if (!batch_id || !date || !attendance_records || !marked_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate attendance records
    const validStatuses = ['present', 'absent', 'late'];
    const invalidRecords = attendance_records.filter(record => 
        !record.student_id || !validStatuses.includes(record.status)
    );
    
    if (invalidRecords.length > 0) {
        return res.status(400).json({ error: 'Invalid attendance records' });
    }
    
    // Start transaction
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Delete existing attendance for this batch and date
        const deleteQuery = `DELETE FROM attendance WHERE batch_id = ? AND date = ?`;
        
        db.query(deleteQuery, [batch_id, date], (err) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json({ error: err.message });
                });
            }
            
            // Insert new attendance records
            const values = attendance_records.map(record => [
                record.student_id, 
                batch_id, 
                date, 
                record.status, 
                marked_by,
                new Date() // created_at
            ]);
            
            const insertQuery = `
                INSERT INTO attendance (student_id, batch_id, date, status, marked_by, created_at) 
                VALUES ?
            `;
            
            db.query(insertQuery, [values], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: err.message });
                    });
                }
                
                // Commit transaction
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }
                    res.json({ 
                        message: 'Attendance marked successfully',
                        recordsAffected: result.affectedRows
                    });
                });
            });
        });
    });
};

// Get Batch Attendance for a Date
exports.getBatchAttendance = (req, res) => {
    const { batch_id, date } = req.params;
    
    // Validate parameters
    if (!batch_id || !date) {
        return res.status(400).json({ error: 'Batch ID and date are required' });
    }
    
    const query = `
        SELECT 
            a.id,
            a.student_id,
            a.status,
            a.date,
            a.created_at,
            u.name as student_name,
            u.email as student_email,
            marker.name as marked_by_name
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN users marker ON a.marked_by = marker.id
        WHERE a.batch_id = ? AND a.date = ?
        ORDER BY u.name ASC
    `;
    
    db.query(query, [batch_id, date], (err, results) => {
        if (err) {
            console.error('Error fetching batch attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};

// Get All Attendance History for a Batch
exports.getBatchAttendanceHistory = (req, res) => {
    const { batch_id } = req.params;
    const { limit = 50, offset = 0, start_date, end_date } = req.query;
    
    // Validate batch_id
    if (!batch_id) {
        return res.status(400).json({ error: 'Batch ID is required' });
    }
    
    let query = `
        SELECT 
            a.id,
            a.student_id,
            a.status,
            a.date,
            a.created_at,
            u.name as student_name,
            u.email as student_email,
            marker.name as marked_by_name
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN users marker ON a.marked_by = marker.id
        WHERE a.batch_id = ?
    `;
    
    const queryParams = [batch_id];
    
    // Add date filters if provided
    if (start_date) {
        query += ` AND a.date >= ?`;
        queryParams.push(start_date);
    }
    
    if (end_date) {
        query += ` AND a.date <= ?`;
        queryParams.push(end_date);
    }
    
    query += ` ORDER BY a.date DESC, u.name ASC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Get total count for pagination
    let countQuery = `
        SELECT COUNT(*) as total
        FROM attendance a
        WHERE a.batch_id = ?
    `;
    
    const countParams = [batch_id];
    
    if (start_date) {
        countQuery += ` AND a.date >= ?`;
        countParams.push(start_date);
    }
    
    if (end_date) {
        countQuery += ` AND a.date <= ?`;
        countParams.push(end_date);
    }
    
    // Execute both queries
    db.query(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Error fetching attendance count:', err);
            return res.status(500).json({ error: err.message });
        }
        
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error fetching attendance history:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                attendance: results,
                pagination: {
                    total: countResult[0].total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: countResult[0].total > parseInt(offset) + parseInt(limit)
                }
            });
        });
    });
};

// Get Attendance Dates for a Batch (for date picker)
exports.getBatchAttendanceDates = (req, res) => {
    const { batch_id } = req.params;
    
    // Validate batch_id
    if (!batch_id) {
        return res.status(400).json({ error: 'Batch ID is required' });
    }
    
    const query = `
        SELECT DISTINCT 
            date,
            COUNT(*) as students_marked,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
        FROM attendance 
        WHERE batch_id = ?
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
    `;
    
    db.query(query, [batch_id], (err, results) => {
        if (err) {
            console.error('Error fetching attendance dates:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};

// Get Student Attendance Report
exports.getStudentAttendance = (req, res) => {
    const { student_id, batch_id } = req.params;
    
    // Validate parameters
    if (!student_id || !batch_id) {
        return res.status(400).json({ error: 'Student ID and Batch ID are required' });
    }
    
    const query = `
        SELECT 
            a.*,
            b.name as batch_name,
            marker.name as marked_by_name
        FROM attendance a
        JOIN batches b ON a.batch_id = b.id
        LEFT JOIN users marker ON a.marked_by = marker.id
        WHERE a.student_id = ? AND a.batch_id = ?
        ORDER BY a.date DESC
    `;
    
    db.query(query, [student_id, batch_id], (err, results) => {
        if (err) {
            console.error('Error fetching student attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};

// Get Attendance Summary for Batch
exports.getBatchAttendanceSummary = (req, res) => {
    const { batch_id } = req.params;
    
    // Validate batch_id
    if (!batch_id) {
        return res.status(400).json({ error: 'Batch ID is required' });
    }
    
    const query = `
        SELECT 
            u.id as student_id,
            u.name as student_name,
            u.email as student_email,
            COUNT(a.id) as total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
            CASE 
                WHEN COUNT(a.id) > 0 THEN ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 2)
                ELSE 0 
            END as attendance_percentage,
            MAX(a.date) as last_attendance_date
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        LEFT JOIN attendance a ON e.student_id = a.student_id AND e.batch_id = a.batch_id
        WHERE e.batch_id = ? AND e.status = 'enrolled'
        GROUP BY u.id, u.name, u.email
        ORDER BY attendance_percentage DESC, u.name ASC
    `;
    
    db.query(query, [batch_id], (err, results) => {
        if (err) {
            console.error('Error fetching attendance summary:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};

// Get Attendance Statistics for Dashboard
exports.getAttendanceStats = (req, res) => {
    const { batch_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Validate batch_id
    if (!batch_id) {
        return res.status(400).json({ error: 'Batch ID is required' });
    }
    
    let query = `
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT date) as total_days,
            COUNT(DISTINCT student_id) as unique_students,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as total_late,
            ROUND(AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END), 2) as avg_attendance_rate
        FROM attendance 
        WHERE batch_id = ?
    `;
    
    const queryParams = [batch_id];
    
    if (start_date) {
        query += ` AND date >= ?`;
        queryParams.push(start_date);
    }
    
    if (end_date) {
        query += ` AND date <= ?`;
        queryParams.push(end_date);
    }
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching attendance stats:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results[0] || {});
    });
};

// Get Students (for dropdown)
exports.getStudents = (req, res) => {
    const query = `
        SELECT id, name, email, phone, created_at 
        FROM users 
        WHERE role = 'student' 
        ORDER BY name ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};

// Bulk Update Attendance Status
exports.bulkUpdateAttendance = (req, res) => {
    const { attendance_updates, updated_by } = req.body;
    
    if (!attendance_updates || !Array.isArray(attendance_updates) || attendance_updates.length === 0) {
        return res.status(400).json({ error: 'No attendance updates provided' });
    }
    
    const validStatuses = ['present', 'absent', 'late'];
    const invalidUpdates = attendance_updates.filter(update => 
        !update.id || !validStatuses.includes(update.status)
    );
    
    if (invalidUpdates.length > 0) {
        return res.status(400).json({ error: 'Invalid attendance updates' });
    }
    
    // Start transaction
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const updatePromises = attendance_updates.map(update => {
            return new Promise((resolve, reject) => {
                const updateQuery = `
                    UPDATE attendance 
                    SET status = ?, updated_at = NOW(), updated_by = ?
                    WHERE id = ?
                `;
                
                db.query(updateQuery, [update.status, updated_by, update.id], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        });
        
        Promise.all(updatePromises)
            .then(() => {
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }
                    res.json({ 
                        message: 'Attendance updated successfully',
                        updatedRecords: attendance_updates.length
                    });
                });
            })
            .catch((error) => {
                db.rollback(() => {
                    res.status(500).json({ error: error.message });
                });
            });
    });
};