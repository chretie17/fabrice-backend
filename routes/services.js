const express = require('express');
const {
    createService,
    getAllServices,
    updateService,
    deleteService,
    getServicesByFloor,
    getServicesByTenant,
} = require('../controllers/servicesController');

const router = express.Router();

// Admin and general routes
router.post('/', createService); // Create a new service request
router.get('/', getAllServices); // Get all service requests
router.put('/', updateService); // Update a service request
router.delete('/:id', deleteService); // Delete a service request

// Filters
router.get('/floor/:floor', getServicesByFloor); // Filter by floor
router.get('/tenant/:tenant_id', getServicesByTenant); // Get tenant-specific services

module.exports = router;
