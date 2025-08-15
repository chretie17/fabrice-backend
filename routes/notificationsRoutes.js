const express = require('express');
const {
    getNotifications,
    markAsRead
} = require('../controllers/notificationsController');

const router = express.Router();

router.get('/:user_id', getNotifications);     // Get all notifications for a user
router.put('/mark-read', markAsRead);          // Mark a notification as read

module.exports = router;
