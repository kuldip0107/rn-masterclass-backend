const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');

// 1. REGISTER / UPDATE DEVICE FCM PUSH TOKEN
// Endpoint: POST /api/notifications/register-token
router.post('/register-token', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'User ID and FCM device token are required.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    user.fcmToken = fcmToken;
    await user.save();

    res.json({
      success: true,
      message: 'FCM push device token registered successfully!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. SEND / CREATE NOTIFICATION (To single user or broadcast)
// Endpoint: POST /api/notifications/send
router.post('/send', async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message are required.'
      });
    }

    // If userId provided, send to that user
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }

      const notif = new Notification({
        userId,
        title,
        message,
        type: type || 'general',
      });
      await notif.save();

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully!',
        hasFcmToken: Boolean(user.fcmToken),
        notification: notif
      });
    }

    // If no userId, broadcast to all users
    const allUsers = await User.find().select('_id');
    const notifs = allUsers.map(u => ({
      userId: u._id,
      title,
      message,
      type: type || 'announcement',
    }));

    if (notifs.length > 0) {
      await Notification.insertMany(notifs);
    }

    res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${notifs.length} users successfully!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET NOTIFICATIONS FOR A USER
// Endpoint: GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      totalCount: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. MARK A NOTIFICATION AS READ
// Endpoint: PUT /api/notifications/mark-read/:notificationId
router.put('/mark-read/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notif = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read.',
      notification: notif
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
