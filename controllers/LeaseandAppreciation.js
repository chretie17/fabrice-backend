const db = require('../db'); // Import your database connection

// Submit Lease Renewal Form
const submitLeaseRenewal = (req, res) => {
    const { 
        userId, 
        serviceSatisfaction, 
        responsivenessSatisfaction, 
        recommendationScore, 
        tenantDuration, 
        improvementSuggestions 
    } = req.body;

    // Basic validation
    if (!userId || !serviceSatisfaction || !responsivenessSatisfaction || recommendationScore === undefined || !tenantDuration) {
        return res.status(400).json({ message: 'All required fields must be filled out.' });
    }

    // SQL query for Lease Renewal Form
    const query = `
        INSERT INTO lease_renewal_surveys 
        (user_id, service_satisfaction, responsiveness_satisfaction, recommendation_score, tenant_duration, improvement_suggestions)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, serviceSatisfaction, responsivenessSatisfaction, recommendationScore, tenantDuration, improvementSuggestions];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting lease renewal data:', err);
            return res.status(500).json({ message: 'Error submitting form. Please try again later.' });
        }
        return res.status(200).json({ message: 'Lease renewal form submitted successfully!' });
    });
};


// Submit Tenant Appreciation Survey
const submitTenantAppreciation = (req, res) => {
    const { 
        userId, 
        participationRating, 
        tenantAcknowledgment, 
        improvementSuggestions, 
        eventParticipation, 
        additionalComments 
    } = req.body;

    // Basic validation
    if (!userId || participationRating === undefined) {
        return res.status(400).json({ message: 'User ID and participation rating are required.' });
    }

    // SQL query for Tenant Appreciation Survey
    const query = `
        INSERT INTO tenant_appreciation_surveys 
        (user_id, participation_rating, tenant_acknowledgment, improvement_suggestions, event_participation, additional_comments)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, participationRating, tenantAcknowledgment, improvementSuggestions, eventParticipation, additionalComments];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting tenant appreciation data:', err);
            return res.status(500).json({ message: 'Error submitting form. Please try again later.' });
        }
        return res.status(200).json({ message: 'Tenant appreciation survey submitted successfully!' });
    });
};


// Admin Functions

// Admin function to get all lease renewal form submissions (with username instead of userId)
const getAllLeaseRenewals = (req, res) => {
    const query = `
        SELECT lease_renewal_surveys.*, users.username 
        FROM lease_renewal_surveys
        JOIN users ON lease_renewal_surveys.user_id = users.id
        ORDER BY lease_renewal_surveys.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching lease renewal submissions:', err);
            return res.status(500).json({ message: 'Error fetching data. Please try again later.' });
        }
        return res.status(200).json({ data: results });
    });
};

// Admin function to get all tenant appreciation survey submissions (with username instead of userId)
const getAllTenantAppreciations = (req, res) => {
    const query = `
        SELECT tenant_appreciation_surveys.*, users.username 
        FROM tenant_appreciation_surveys
        JOIN users ON tenant_appreciation_surveys.user_id = users.id
        ORDER BY tenant_appreciation_surveys.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching tenant appreciation submissions:', err);
            return res.status(500).json({ message: 'Error fetching data. Please try again later.' });
        }
        return res.status(200).json({ data: results });
    });
};

module.exports = { 
    submitLeaseRenewal, 
    submitTenantAppreciation, 
    getAllLeaseRenewals, 
    getAllTenantAppreciations 
};
