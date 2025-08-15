const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Maximum failed login attempts before blocking
const MAX_FAILED_ATTEMPTS = 3;

// Register User
exports.registerUser = (req, res) => {
    const { name, username, email, phone_number, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `
        INSERT INTO users (name, username, email, phone_number, password, role, failed_attempts, is_blocked) 
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `;

    db.query(query, [name, username, email, phone_number, hashedPassword, role || 'student'], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'User registered successfully' });
    });
};

// Login User
exports.loginUser = (req, res) => {
    const { username, email, password } = req.body;

    // Fixed query to properly handle both username and email
    const query = `SELECT * FROM users WHERE username = ? OR email = ?`;

    db.query(query, [username || email, email || username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = results[0];

        // Check if the user is blocked
        if (user.is_blocked) {
            return res.status(403).json({ error: 'Account is blocked. Please contact the administrator.' });
        }

        // Validate password
        if (!bcrypt.compareSync(password, user.password)) {
            const updateFailedAttemptsQuery = `
                UPDATE users SET failed_attempts = failed_attempts + 1, is_blocked = IF(failed_attempts + 1 >= ?, 1, 0) 
                WHERE id = ?
            `;
            db.query(updateFailedAttemptsQuery, [MAX_FAILED_ATTEMPTS, user.id], (updateErr) => {
                if (updateErr) console.error('Error updating failed attempts:', updateErr);
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset failed attempts on successful login
        const resetFailedAttemptsQuery = `UPDATE users SET failed_attempts = 0 WHERE id = ?`;
        db.query(resetFailedAttemptsQuery, [user.id], (resetErr) => {
            if (resetErr) console.error('Error resetting failed attempts:', resetErr);
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            'your-secret-key', // Consider using environment variable: process.env.JWT_SECRET
            { expiresIn: '12h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    });
};

// Get All Users
exports.getAllUsers = (req, res) => {
    const query = `SELECT id, name, username, email, phone_number, role, failed_attempts, is_blocked, created_at FROM users`;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Update User
exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { name, username, email, phone_number, role, password } = req.body;
    
    // Build dynamic query based on provided fields
    let updateFields = [];
    let values = [];
    
    if (name) {
        updateFields.push('name = ?');
        values.push(name);
    }
    if (username) {
        updateFields.push('username = ?');
        values.push(username);
    }
    if (email) {
        updateFields.push('email = ?');
        values.push(email);
    }
    if (phone_number) {
        updateFields.push('phone_number = ?');
        values.push(phone_number);
    }
    if (role) {
        updateFields.push('role = ?');
        values.push(role);
    }
    if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        updateFields.push('password = ?');
        values.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided to update' });
    }
    
    values.push(id); // Add id for WHERE clause
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User updated successfully' });
    });
};

// Delete User
exports.deleteUser = (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM users WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    });
};

// Admin: Block User
exports.blockUser = (req, res) => {
    const { id } = req.params;

    const query = `UPDATE users SET is_blocked = 1 WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User blocked successfully' });
    });
};

// Admin: Unblock User
exports.unblockUser = (req, res) => {
    const { id } = req.params;

    const query = `UPDATE users SET is_blocked = 0, failed_attempts = 0 WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User unblocked successfully' });
    });
};