const db = require('../db');


exports.getAllBatches = (req, res) => {
    const query = `
        SELECT b.*, c.name as course_name, u.name as instructor_name 
        FROM batches b 
        JOIN courses c ON b.course_id = c.id 
        JOIN users u ON b.instructor_id = u.id 
        ORDER BY b.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get Batch by ID
exports.getBatchById = (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT b.*, c.name as course_name, u.name as instructor_name 
        FROM batches b 
        JOIN courses c ON b.course_id = c.id 
        JOIN users u ON b.instructor_id = u.id 
        WHERE b.id = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Batch not found' });
        res.json(results[0]);
    });
};

// Create New Batch
exports.createBatch = (req, res) => {
    const { course_id, instructor_id, name, start_date, end_date, start_time, end_time, max_students } = req.body;
    
    if (!course_id || !instructor_id || !name || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const query = `
        INSERT INTO batches (course_id, instructor_id, name, start_date, end_date, start_time, end_time, max_students) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [course_id, instructor_id, name, start_date, end_date, start_time || '09:00', end_time || '17:00', max_students || 20], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
            message: 'Batch created successfully',
            batchId: result.insertId
        });
    });
};

// Update Batch
exports.updateBatch = (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, start_time, end_time, max_students, status } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (name) { updateFields.push('name = ?'); values.push(name); }
    if (start_date) { updateFields.push('start_date = ?'); values.push(start_date); }
    if (end_date) { updateFields.push('end_date = ?'); values.push(end_date); }
    if (start_time) { updateFields.push('start_time = ?'); values.push(start_time); }
    if (end_time) { updateFields.push('end_time = ?'); values.push(end_time); }
    if (max_students) { updateFields.push('max_students = ?'); values.push(max_students); }
    if (status) { updateFields.push('status = ?'); values.push(status); }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    values.push(id);
    const query = `UPDATE batches SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Batch not found' });
        res.json({ message: 'Batch updated successfully' });
    });
};

// Delete Batch
exports.deleteBatch = (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM batches WHERE id = ?`;
    
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Batch not found' });
        res.json({ message: 'Batch deleted successfully' });
    });
};

// Get Instructors (for dropdown)
exports.getInstructors = (req, res) => {
    const query = `SELECT id, name FROM users WHERE role = 'instructor'`;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

