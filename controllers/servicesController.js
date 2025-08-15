const db = require('../db');

// Create a new service request
exports.createService = (req, res) => {
    const { tenant_id, service_type, description, priority, floors, room_numbers, service_date } = req.body;

    // Debugging: Log incoming request body
    console.log('Incoming Data:', req.body);

    // Validate input: Check if floors and room_numbers are arrays
    if (!Array.isArray(floors) || !Array.isArray(room_numbers)) {
        return res.status(400).json({ error: 'Floors and room_numbers must be arrays' });
    }

    // Convert arrays to comma-separated strings
    const floorsString = floors.join(',');
    const roomsString = room_numbers.join(',');

    // SQL query to insert service request
    const query = `
        INSERT INTO services 
        (tenant_id, service_type, description, priority, floors, room_numbers, service_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
        query,
        [tenant_id, service_type, description, priority || 'Medium', floorsString, roomsString, service_date || null],
        (err, result) => {
            if (err) {
                console.error('Error inserting service:', err);
                return res.status(500).json({ error: 'Error creating service request' });
            }
            res.status(201).json({ message: 'Service request created successfully' });
        }
    );
};



// Get all service requests
exports.getAllServices = (req, res) => {
    const query = `
        SELECT s.*, 
               t.name AS tenant_name, 
               m.name AS manager_name, 
               r.name AS resolved_by_name 
        FROM services s
        LEFT JOIN users t ON s.tenant_id = t.id
        LEFT JOIN users m ON s.manager_id = m.id
        LEFT JOIN users r ON s.resolved_by = r.id
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Get services by floor
exports.getServicesByFloor = (req, res) => {
    const { floor } = req.params;
    const query = `
        SELECT s.*, 
               t.name AS tenant_name, 
               m.name AS manager_name 
        FROM services s
        LEFT JOIN users t ON s.tenant_id = t.id
        LEFT JOIN users m ON s.manager_id = m.id
        WHERE s.floors = ?
    `;
    db.query(query, [floor], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Update a service request
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Secure Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'turachretien@gmail.com', 
        pass: 'ruix vmny qntx ywos', 
    },
    secure: true,
});

// Professional Email Template Function with Enhanced Design
function generateEmailHTML(details) {
    const { tenant_name, service_type, status, priority, floors, room_numbers } = details;
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
            body { 
                font-family: 'Inter', Arial, sans-serif; 
                line-height: 1.6; 
                color: #2c3e50; 
                background-color: #f4f7f6; 
                margin: 0; 
                padding: 20px;
            }
            .email-container { 
                background-color: #ffffff; 
                border-radius: 12px; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
                max-width: 600px; 
                margin: 0 auto; 
                overflow: hidden;
            }
            .header { 
                background: linear-gradient(135deg, #13377C 0%, #1a4db0 100%); 
                color: white; 
                padding: 25px 20px; 
                text-align: center;
                position: relative;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('https://www.officesiq.com/api/img/kigali-city-tower-2-0.jpg?w=487') no-repeat center center;
                background-size: cover;
                opacity: 0.2;
            }
            .header h1 {
                margin: 0;
                font-weight: 600;
                position: relative;
                z-index: 1;
            }
            .content { 
                padding: 30px 25px; 
            }
            .details { 
                background-color: #f9f9f9; 
                border-left: 4px solid #13377C; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 5px;
            }
            .details ul { 
                list-style-type: none; 
                padding: 0; 
                margin: 0;
            }
            .details li { 
                margin-bottom: 12px; 
                padding-bottom: 10px; 
                border-bottom: 1px solid #e9ecef;
            }
            .details li:last-child { 
                border-bottom: none; 
            }
            .details strong { 
                color: #13377C; 
                display: inline-block;
                width: 120px;
                font-weight: 600;
            }
            .footer {
                background-color: #f1f3f5;
                padding: 15px;
                text-align: center;
                font-size: 0.9em;
                color: #6c757d;
            }
            @media screen and (max-width: 600px) {
                .email-container {
                    width: 100%;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>Service Request Update</h1>
            </div>
            <div class="content">
                <p>Dear ${tenant_name},</p>
                <p>We hope this message finds you well. We are writing to provide an update on your recent service request.</p>
                
                <div class="details">
                    <ul>
                        <li><strong>Service Type:</strong> ${service_type}</li>
                        <li><strong>Current Status:</strong> ${status}</li>
                        <li><strong>Priority Level:</strong> ${priority}</li>
                        <li><strong>Location:</strong> Floor ${floors}, Room ${room_numbers}</li>
                    </ul>
                </div>

                <p>Our dedicated team is actively working to address your request with the utmost care and attention. We understand the importance of maintaining a comfortable and efficient workspace, and we are committed to resolving your service request promptly.</p>
                
                <p>Should you have any questions or require additional information, please do not hesitate to contact our support team.</p>
                
                <p>Thank you for your patience and understanding.</p>
                
                <p>Best regards,<br>OfficeHub Support Team</p>
            </div>
            <div class="footer">
                © ${new Date().getFullYear()} OfficeHub. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
}

// Logging Utility
function logEvent(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console[type](`[${timestamp}] ${message}`);
}

// Service Update Handler
exports.updateService = (req, res) => {
    const { id, manager_id, status, priority, resolved_by } = req.body;

    const buildUpdateQuery = () => {
        const updates = [];
        const params = [];
        const updateFields = { manager_id, status, priority, resolved_by };

        Object.entries(updateFields).forEach(([key, value]) => {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                params.push(value);
            }
        });

        return {
            query: `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
            params: [...params, id],
        };
    };

    const { query, params } = buildUpdateQuery();

    // Perform the update
    db.query(query, params, (err, result) => {
        if (err) {
            logEvent(`Database update error: ${err.message}`, 'error');
            return res.status(500).json({ error: 'Database update failed' });
        }

        // Fetch details for email notifications
        const emailQuery = `
    SELECT 
        t.email AS tenant_email, 
        t.name AS tenant_name, 
        s.service_type, 
        s.status, 
        s.priority, 
        s.floors, 
        s.room_numbers,
        m.name AS manager_name, 
        m.email AS manager_email 
    FROM services s
    INNER JOIN users t ON s.tenant_id = t.id
    LEFT JOIN users m ON s.manager_id = m.id
    WHERE s.id = ?
`;

        db.query(emailQuery, [id], (emailErr, emailResults) => {
            if (emailErr) {
                logEvent(`Email query error: ${emailErr.message}`, 'error');
                return res.status(500).json({ error: 'Tenant and manager lookup failed' });
            }

            if (emailResults.length === 0) {
                logEvent('No tenant or manager found for service request', 'warn');
                return res.status(404).json({ message: 'No tenant or manager found' });
            }

            const { tenant_email, tenant_name, service_type, status, priority, floors, room_numbers, manager_name, manager_email } = emailResults[0];

            if (!tenant_email) {
                logEvent('No email found for tenant', 'warn');
                return res.status(404).json({ message: 'No tenant email available' });
            }

            // Notify Tenant
            const tenantMailOptions = {
                from: 'OfficeHub Support <turachretien@gmail.com>',
                to: tenant_email,
                subject: `Service Manager Assigned: ${service_type}`,
                html: generateEmailHTML({
                    tenant_name,
                    service_type,
                    status,
                    priority,
                    floors,  
                    room_numbers,
                }),
            };

            transporter.sendMail(tenantMailOptions, (tenantMailErr) => {
                if (tenantMailErr) {
                    logEvent(`Tenant email sending error: ${tenantMailErr.message}`, 'error');
                } else {
                    logEvent(`Tenant email sent to ${tenant_email}`);
                }
            });

            // Notify Manager
            if (manager_email) {
                const managerMailOptions = {
                    from: 'OfficeHub Support <turachretien@gmail.com>',
                    to: manager_email,
                    subject: `New Service Assigned: ${service_type}`,
                    html: generateEmailHTML({
                        tenant_name: manager_name,
                        service_type,
                        status,
                        priority,
                        floors,
                        room_numbers,
                    }),
                };

                transporter.sendMail(managerMailOptions, (managerMailErr) => {
                    if (managerMailErr) {
                        logEvent(`Manager email sending error: ${managerMailErr.message}`, 'error');
                    } else {
                        logEvent(`Manager email sent to ${manager_email}`);
                    }
                });
            }

            res.json({
                message: 'Service request updated successfully, tenant and manager notified',
                emailSentToTenant: true,
                emailSentToManager: !!manager_email,
            });
        });
    });
};

// Error Handling Middleware
exports.handleServiceErrors = (err, req, res, next) => {
    logEvent(`Unhandled error: ${err.message}`, 'error');
    res.status(500).json({ 
        error: 'An unexpected error occurred', 
        details: process.env.NODE_ENV === 'development' ? err.message : null 
    });
};
// Delete a service request
exports.deleteService = (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM services WHERE id = ?`;
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Service request deleted successfully' });
    });
};

// Get services for a specific tenant
exports.getServicesByTenant = (req, res) => {
    const { tenant_id } = req.params;
    const query = `
        SELECT * FROM services 
        WHERE tenant_id = ? 
        ORDER BY created_at DESC
    `;
    db.query(query, [tenant_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};
