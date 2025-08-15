const express = require('express');
const router = express.Router();
const batchController = require('../controllers/BatchesController');

router.get('/', batchController.getAllBatches);
router.get('/instructors', batchController.getInstructors);
router.get('/:id', batchController.getBatchById);
router.post('/', batchController.createBatch);
router.put('/:id', batchController.updateBatch);
router.delete('/:id', batchController.deleteBatch);

module.exports = router;