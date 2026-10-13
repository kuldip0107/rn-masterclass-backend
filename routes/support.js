const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// 1. SUBMIT CONTACT / FEEDBACK MESSAGE
// Endpoint: POST /api/support/feedback
router.post('/feedback', async (req, res) => {
  try {
    const { userId, name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const feedback = new Feedback({
      userId: userId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: (subject && subject.trim()) || 'General Support / Feedback',
      message: message.trim(),
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully! Our team will get back to you soon.',
      feedbackId: feedback._id,
      createdAt: feedback.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET ALL FEEDBACK LIST (Admin / Support view)
// Endpoint: GET /api/support/feedback
router.get('/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      totalFeedback: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. UPDATE FEEDBACK STATUS
// Endpoint: PUT /api/support/feedback/:id/status
router.put('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'in-review', 'resolved'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowed.join(', ')}`
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found.'
      });
    }

    res.json({
      success: true,
      message: 'Feedback status updated successfully!',
      feedback
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
