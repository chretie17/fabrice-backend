const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASSWORD // your email password or app password
    }
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Email templates
const emailTemplates = {
    gradeNotification: (studentName, assignmentTitle, courseName, score, maxPoints, feedback, graderName) => ({
        subject: `Grade Received - ${assignmentTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .grade-card {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #667eea;
                    }
                    .score {
                        font-size: 2em;
                        font-weight: bold;
                        color: ${score >= (maxPoints * 0.8) ? '#4CAF50' : score >= (maxPoints * 0.6) ? '#FF9800' : '#F44336'};
                        text-align: center;
                    }
                    .percentage {
                        font-size: 1.2em;
                        color: #666;
                        text-align: center;
                    }
                    .feedback-section {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #4CAF50;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding: 20px;
                        color: #666;
                        font-size: 0.9em;
                    }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎓 Grade Notification</h1>
                    <p>Your assignment has been graded!</p>
                </div>
                <div class="content">
                    <p>Dear <strong>${studentName}</strong>,</p>
                    <p>Great news! Your assignment "<strong>${assignmentTitle}</strong>" from the course "<strong>${courseName}</strong>" has been graded.</p>
                    
                    <div class="grade-card">
                        <h3 style="margin-top: 0; color: #667eea;">Your Grade</h3>
                        <div class="score">${score} / ${maxPoints}</div>
                        <div class="percentage">${Math.round((score / maxPoints) * 100)}%</div>
                    </div>
                    
                    ${feedback ? `
                        <div class="feedback-section">
                            <h3 style="margin-top: 0; color: #4CAF50;">📝 Instructor Feedback</h3>
                            <p style="font-style: italic; background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">${feedback}</p>
                        </div>
                    ` : ''}
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #667eea; margin-top: 0;">Assignment Details</h3>
                        <p><strong>Course:</strong> ${courseName}</p>
                        <p><strong>Assignment:</strong> ${assignmentTitle}</p>
                        <p><strong>Graded by:</strong> ${graderName}</p>
                        <p><strong>Grade Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p>Keep up the great work! 🚀</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from your Learning Management System.</p>
                    <p>If you have any questions, please contact your instructor.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Grade Notification - ${assignmentTitle}
            
            Dear ${studentName},
            
            Your assignment "${assignmentTitle}" from the course "${courseName}" has been graded.
            
            Your Grade: ${score} / ${maxPoints} (${Math.round((score / maxPoints) * 100)}%)
            
            ${feedback ? `Instructor Feedback: ${feedback}` : ''}
            
            Assignment Details:
            - Course: ${courseName}
            - Assignment: ${assignmentTitle}
            - Graded by: ${graderName}
            - Grade Date: ${new Date().toLocaleDateString()}
            
            Keep up the great work!
            
            This is an automated message from your Learning Management System.
        `
    }),

    assignmentSubmissionConfirmation: (studentName, assignmentTitle, courseName, isUpdate) => ({
        subject: `Assignment ${isUpdate ? 'Updated' : 'Submitted'} - ${assignmentTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>✅ Assignment ${isUpdate ? 'Updated' : 'Submitted'}</h1>
                    <p>We've received your submission!</p>
                </div>
                <div class="content">
                    <p>Dear <strong>${studentName}</strong>,</p>
                    <p>This confirms that your assignment "<strong>${assignmentTitle}</strong>" for the course "<strong>${courseName}</strong>" has been successfully ${isUpdate ? 'updated' : 'submitted'}.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                        <h3 style="color: #4CAF50; margin-top: 0;">Submission Details</h3>
                        <p><strong>Assignment:</strong> ${assignmentTitle}</p>
                        <p><strong>Course:</strong> ${courseName}</p>
                        <p><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Status:</strong> ${isUpdate ? 'Updated Successfully' : 'Submitted Successfully'}</p>
                    </div>
                    
                    <p>Your instructor will review and grade your submission. You'll receive another email notification once grading is complete.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p>Good luck! 📚</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Assignment ${isUpdate ? 'Updated' : 'Submitted'} - ${assignmentTitle}
            
            Dear ${studentName},
            
            This confirms that your assignment "${assignmentTitle}" for the course "${courseName}" has been successfully ${isUpdate ? 'updated' : 'submitted'}.
            
            Submission Details:
            - Assignment: ${assignmentTitle}
            - Course: ${courseName}
            - Submission Date: ${new Date().toLocaleString()}
            - Status: ${isUpdate ? 'Updated Successfully' : 'Submitted Successfully'}
            
            Your instructor will review and grade your submission. You'll receive another email notification once grading is complete.
            
            Good luck!
        `
    })
};

// Email service functions
const emailService = {
    // Send grade notification email
    sendGradeNotification: async (studentEmail, studentName, assignmentTitle, courseName, score, maxPoints, feedback, graderName) => {
        try {
            const template = emailTemplates.gradeNotification(studentName, assignmentTitle, courseName, score, maxPoints, feedback, graderName);
            
            const mailOptions = {
                from: {
                    name: 'Learning Management System',
                    address: process.env.EMAIL_USER
                },
                to: studentEmail,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Grade notification email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending grade notification email:', error);
            throw error;
        }
    },

    // Send assignment submission confirmation
    sendSubmissionConfirmation: async (studentEmail, studentName, assignmentTitle, courseName, isUpdate = false) => {
        try {
            const template = emailTemplates.assignmentSubmissionConfirmation(studentName, assignmentTitle, courseName, isUpdate);
            
            const mailOptions = {
                from: {
                    name: 'Learning Management System',
                    address: process.env.EMAIL_USER
                },
                to: studentEmail,
                subject: template.subject,
                text: template.text,
                html: template.html
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Submission confirmation email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending submission confirmation email:', error);
            throw error;
        }
    },

    // Generic email sender
    sendCustomEmail: async (to, subject, htmlContent, textContent) => {
        try {
            const mailOptions = {
                from: {
                    name: 'Learning Management System',
                    address: process.env.EMAIL_USER
                },
                to: to,
                subject: subject,
                text: textContent || 'This email requires HTML support to view properly.',
                html: htmlContent
            };
            
            const result = await transporter.sendMail(mailOptions);
            console.log('Custom email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Error sending custom email:', error);
            throw error;
        }
    },

    // Test email connection
    testConnection: async () => {
        try {
            await transporter.verify();
            return { success: true, message: 'Email connection successful' };
        } catch (error) {
            console.error('Email connection test failed:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = emailService;