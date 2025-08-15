const db = require('../db');

// Create a Notification
exports.createNotification = (req, res) => {
    const { user_id, message } = req.body;

    const query = `INSERT INTO notifications (user_id, message) VALUES (?, ?)`;

    db.query(query, [user_id, message], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Notification created successfully', notificationId: result.insertId });
    });
};

// Get All Notifications for a User
exports.getNotifications = (req, res) => {
    const { user_id } = req.params;

    const query = `SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC`;

    db.query(query, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Mark a Notification as Read
exports.markAsRead = (req, res) => {
    const { id } = req.body;

    const query = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification marked as read' });
    });
};

// Update a Notification
exports.updateNotification = (req, res) => {
    const { id, message } = req.body;

    const query = `UPDATE notifications SET message = ? WHERE id = ?`;

    db.query(query, [message, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification updated successfully' });
    });
};

// Delete a Notification
exports.deleteNotification = (req, res) => {
    const { id } = req.body;

    const query = `DELETE FROM notifications WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted successfully' });
    });
};
