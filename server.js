const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
// ... rest of your imports
const usersRoutes = require('./routes/users');
const feedbackRoutes = require('./routes/feedback');
const notificationsRoutes = require('./routes/notificationsRoutes');
const surveyRoutes = require('./routes/survey');
const formsRoutes = require('./routes/forms');
const dashboardRoutes = require('./routes/dash');
const reportRoutes = require('./routes/report');
const courseRoutes = require('./routes/course');
const batchRoutes = require('./routes/batch');
const enrollmentRoutes = require('./routes/enrollment');
const attendanceRoutes = require('./routes/attendance');
const CommunityForumRoutes = require('./routes/Communication Forum');
const AdminPostRoutes = require('./routes/AdminPost');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Body Parser Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/reports', reportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/files', require('./routes/file'));
app.use('/api/', CommunityForumRoutes);
app.use('/api/admin', AdminPostRoutes);

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
