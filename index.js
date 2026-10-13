require('dotenv').config();
const express = require('express');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/support', require('./routes/support'));
app.use('/api/notifications', require('./routes/notification'));

const path = require('path');

// Privacy Policy Webpage Route (Google Play & User compliance)
app.get(['/privacy-policy', '/privacy', '/privacy-policy.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

// Delete Account Webpage Route (Google Play Data Safety compliance)
app.get(['/delete-account', '/delete', '/delete-account.html', '/account-deletion'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delete-account.html'));
});

// Health check API Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend API is running!',
    mongodbStatus: 'Connected to MongoDB Atlas'
  });
});

// Start server and connect to MongoDB
const startServer = () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
  connectDB();
};

startServer();
