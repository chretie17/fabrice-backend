const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const usersRoutes = require('./routes/users');
const feedbackRoutes = require('./routes/feedback');
const notificationsRoutes = require('./routes/notificationsRoutes');
const surveyRoutes = require('./routes/survey');
const formsRoutes = require('./routes/forms');
const dashboardRoutes = require('./routes/dash');
const reportRoutes = require('./routes/report');

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

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
