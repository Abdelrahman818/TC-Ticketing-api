const cors = require('cors');
const express = require('express');

const dotenv = require('dotenv');
const helmet = require('helmet');
const cookies = require('cookie-parser')

const authRoutes = require('./routes/auth.route');
const ticketRoutes = require('./routes/tickets.route');
const userRoutes = require('./routes/users.route');
const departmentRoutes = require('./routes/departments.route');
const stageRoutes = require('./routes/stages.route');
const dashboardRoutes = require('./routes/dashboard.route');
const reportRoutes = require('./routes/reports.route');
const auditLogRoutes = require('./routes/auditLogs.route');
const healthRoutes = require('./routes/health.route');

const { connectDatabase } = require('./config/database');
const { ensureDefaultStages } = require('./services/bootstrap.service');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

// Initializing
dotenv.config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(cookies());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      uptime: process.uptime(),
    },
  });
});

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const port = process.env.PORT || 5000;
  connectDatabase()
    .then(ensureDefaultStages)
    .then(() => {
      app.listen(port, () => {
        console.log(`API is running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = app;
