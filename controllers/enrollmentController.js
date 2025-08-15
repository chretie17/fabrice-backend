const db = require('../db');

// Get All Enrollments (updated with payment info)
exports.getAllEnrollments = (req, res) => {
    const query = `
        SELECT e.*, u.name as student_name, u.email, u.phone_number, 
               b.name as batch_name, c.name as course_name, c.price,
               admin.name as verified_by_name
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        JOIN batches b ON e.batch_id = b.id
        JOIN courses c ON b.course_id = c.id
        LEFT JOIN users admin ON e.verified_by = admin.id
        ORDER BY e.enrolled_date DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Enroll Student in Batch
exports.enrollStudent = (req, res) => {
    const { student_id, batch_id } = req.body;
    
    if (!student_id || !batch_id) {
        return res.status(400).json({ error: 'Student ID and Batch ID are required' });
    }
    
    // Check if batch has space
    const checkQuery = `
        SELECT current_students, max_students FROM batches WHERE id = ?
    `;
    
    db.query(checkQuery, [batch_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Batch not found' });
        
        const batch = results[0];
        if (batch.current_students >= batch.max_students) {
            return res.status(400).json({ error: 'Batch is full' });
        }
        
        // Enroll student with pending payment status
        const enrollQuery = `INSERT INTO enrollments (student_id, batch_id, status, payment_status) VALUES (?, ?, 'pending', 'pending')`;
        
        db.query(enrollQuery, [student_id, batch_id], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Student is already enrolled in this batch' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            // Don't update batch count yet - only when payment is verified
            res.status(201).json({ 
                message: 'Enrollment created successfully. Please submit payment proof to complete enrollment.',
                enrollmentId: result.insertId 
            });
        });
    });
};

// Submit Payment Proof
exports.submitPaymentProof = (req, res) => {
    const { enrollment_id, payment_proof } = req.body;
    
    if (!enrollment_id || !payment_proof) {
        return res.status(400).json({ error: 'Enrollment ID and payment proof are required' });
    }
    
    const query = `
        UPDATE enrollments 
        SET payment_status = 'submitted', payment_proof = ?, payment_submitted_date = NOW() 
        WHERE id = ? AND payment_status = 'pending'
    `;
    
    db.query(query, [payment_proof, enrollment_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Enrollment not found or payment already submitted' });
        res.json({ message: 'Payment proof submitted successfully. Waiting for admin verification.' });
    });
};

// Verify Payment (Admin function)
exports.verifyPayment = (req, res) => {
    const { enrollment_id, verified_by, action, notes } = req.body;
    
    if (!enrollment_id || !verified_by || !action) {
        return res.status(400).json({ error: 'Enrollment ID, Admin ID, and action are required' });
    }
    
    const status = action === 'verify' ? 'verified' : 'rejected';
    const enrollmentStatus = action === 'verify' ? 'enrolled' : 'pending';
    
    const query = `
        UPDATE enrollments 
        SET payment_status = ?, status = ?, verified_by = ?, verification_date = NOW(), verification_notes = ?
        WHERE id = ? AND payment_status = 'submitted'
    `;
    
    db.query(query, [status, enrollmentStatus, verified_by, notes, enrollment_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Enrollment not found or not ready for verification' });
        
        if (action === 'verify') {
            // Get batch_id and update batch student count
            const getBatchQuery = `SELECT batch_id FROM enrollments WHERE id = ?`;
            db.query(getBatchQuery, [enrollment_id], (err, batchResult) => {
                if (!err && batchResult.length > 0) {
                    const updateQuery = `UPDATE batches SET current_students = current_students + 1 WHERE id = ?`;
                    db.query(updateQuery, [batchResult[0].batch_id], (updateErr) => {
                        if (updateErr) console.error('Error updating batch count:', updateErr);
                    });
                }
            });
        }
        
        res.json({ message: `Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully` });
    });
};

// Get Student's Enrollments (updated with payment info)
exports.getStudentEnrollments = (req, res) => {
    const { student_id } = req.params;
    const query = `
        SELECT e.*, b.name as batch_name, c.name as course_name, c.price,
               b.start_date, b.end_date
        FROM enrollments e
        JOIN batches b ON e.batch_id = b.id
        JOIN courses c ON b.course_id = c.id
        WHERE e.student_id = ?
        ORDER BY e.enrolled_date DESC
    `;
    
    db.query(query, [student_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Batch Students (updated with payment info)
exports.getBatchStudents = (req, res) => {
    const { batch_id } = req.params;
    const query = `
        SELECT e.*, u.name as student_name, u.email, u.phone_number
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.batch_id = ?
        ORDER BY e.enrolled_date DESC
    `;
    
    db.query(query, [batch_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Drop Student from Batch
exports.dropStudent = (req, res) => {
    const { student_id, batch_id } = req.body;
    
    const query = `UPDATE enrollments SET status = 'dropped' WHERE student_id = ? AND batch_id = ?`;
    
    db.query(query, [student_id, batch_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Enrollment not found' });
        
        // Update batch student count
        const updateQuery = `UPDATE batches SET current_students = current_students - 1 WHERE id = ?`;
        db.query(updateQuery, [batch_id], (updateErr) => {
            if (updateErr) console.error('Error updating batch count:', updateErr);
        });
        
        res.json({ message: 'Student dropped successfully' });
    });
};

// Get Available Batches for Students
exports.getAvailableBatches = (req, res) => {
    const query = `
        SELECT b.*, c.name as course_name, c.description as course_description, 
               c.price, u.name as instructor_name,
               (b.max_students - b.current_students) as available_spots
        FROM batches b
        JOIN courses c ON b.course_id = c.id
        JOIN users u ON b.instructor_id = u.id
        WHERE b.status = 'upcoming' AND b.current_students < b.max_students
        ORDER BY b.start_date ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};