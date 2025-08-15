const express = require('express');
const router = express.Router();
const {
    submitLeaseRenewal,
    submitTenantAppreciation,
    getAllLeaseRenewals,
    getAllTenantAppreciations
} = require('../controllers/LeaseandAppreciation');

// User Routes

// POST route for Lease Renewal Form submission
router.post('/lease-renewal', submitLeaseRenewal);

// POST route for Tenant Appreciation Survey submission
router.post('/tenant-appreciation', submitTenantAppreciation);

// Admin Routes

// GET all lease renewal form submissions
router.get('/admin/lease-renewals', getAllLeaseRenewals);

// GET all tenant appreciation survey submissions
router.get('/admin/tenant-appreciations', getAllTenantAppreciations);

module.exports = router;
