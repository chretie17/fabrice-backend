const express = require('express');
const {
    registerUser,
    loginUser,
    getAllUsers,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser,
} = require('../controllers/usersController');

const router = express.Router();

router.post('/', registerUser); 
router.post('/login', loginUser);          // Login user and generate token
router.get('/', getAllUsers);              // Get all users
router.put('/:id', updateUser);            // Update user details by ID
router.delete('/:id', deleteUser);         // Delete a user by ID
router.put('/:id/block', blockUser);
router.put('/:id/unblock', unblockUser)


module.exports = router;
