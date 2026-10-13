const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const Feedback = require('../models/Feedback');
const { sendAccountDeletionEmail } = require('../utils/mailer');
const fs = require('fs');
const path = require('path');
const { syncUserStreak, evaluateStreak } = require('../utils/streakHelper');

const LOCAL_USERS_FILE = path.join(__dirname, '../local_users.json');

const getLocalUsers = () => {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
};

const saveLocalUsers = (users) => {
  try {
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (_) {}
};

const isDbConnected = () => mongoose.connection.readyState === 1;
const isValidId = (id) => id && mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) => {
  return (
    req.params.userId ||
    req.query.userId ||
    (req.body && req.body.userId) ||
    req.headers['x-user-id']
  );
};

// 1. GET USER PROFILE (Auto-evaluates & updates streak)
router.get(['/profile', '/profile/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u => 
      u.id === userId || 
      (u._id && u._id.toString() === userId) || 
      (u.email && (u.email === userId || (req.query.email && u.email === req.query.email)))
    );

    let dbUser = null;
    if (isDbConnected()) {
      try {
        if (isValidId(userId)) {
          dbUser = await User.findById(userId).select('-password -resetOtp -resetOtpExpires');
        }
        if (!dbUser && (req.query.email || (lUser && lUser.email))) {
          const searchEmail = (req.query.email || lUser.email).toLowerCase().trim();
          dbUser = await User.findOne({ email: searchEmail }).select('-password -resetOtp -resetOtpExpires');
        }
      } catch (dbErr) {
        console.log('DB find user warning:', dbErr.message);
      }
    }

    // Auto evaluate and update daily streak
    if (dbUser) {
      await syncUserStreak(dbUser, true);
    }
    if (lUser) {
      syncUserStreak(lUser, false);
      if (dbUser) {
        lUser.streak = dbUser.streak;
        lUser.lastActiveDate = dbUser.lastActiveDate;
      }
      saveLocalUsers(localUsers);
    }

    // Bidirectional sync between localUsers and dbUser for profileImage and other fields
    const effectiveName = (dbUser && dbUser.name) || (lUser && lUser.name) || req.query.name || 'Learner';
    const effectiveEmail = (dbUser && dbUser.email) || (lUser && lUser.email) || req.query.email || 'learner@example.com';
    const effectiveTitle = (dbUser && dbUser.userTitle) || (lUser && lUser.userTitle) || 'React Native Developer';
    const effectiveAvatarColor = (dbUser && dbUser.avatarColor) || (lUser && lUser.avatarColor) || '#007AFF';
    const effectiveProfileImage = (lUser && lUser.profileImage) || (dbUser && dbUser.profileImage) || null;
    const effectiveStreak = (dbUser && dbUser.streak) || (lUser && lUser.streak) || 1;
    const effectiveLastActiveDate = (dbUser && dbUser.lastActiveDate) || (lUser && lUser.lastActiveDate) || new Date().toISOString().split('T')[0];
    const effectiveCompletedComponents = (dbUser && dbUser.completedComponents) || (lUser && lUser.completedComponents) || [];

    // Keep local user updated with latest data
    if (lUser) {
      let changed = false;
      if (effectiveProfileImage && lUser.profileImage !== effectiveProfileImage) {
        lUser.profileImage = effectiveProfileImage;
        changed = true;
      }
      if (changed) saveLocalUsers(localUsers);
    }

    return res.json({
      success: true,
      user: {
        id: (dbUser && dbUser._id) || (lUser && (lUser.id || lUser._id)) || userId,
        name: effectiveName,
        email: effectiveEmail,
        userTitle: effectiveTitle,
        avatarColor: effectiveAvatarColor,
        profileImage: effectiveProfileImage,
        streak: effectiveStreak,
        lastActiveDate: effectiveLastActiveDate,
        completedComponentsCount: effectiveCompletedComponents.length,
        completedComponents: effectiveCompletedComponents,
        createdAt: (dbUser && dbUser.createdAt) || (lUser && lUser.createdAt) || new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. UPDATE USER PROFILE
router.put(['/profile', '/profile/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, userTitle, avatarColor, profileImage, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Update in local_users.json
    const localUsers = getLocalUsers();
    let lUserIndex = localUsers.findIndex(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && (u.email === userId || (email && u.email.toLowerCase() === email.toLowerCase())))
    );

    if (lUserIndex !== -1) {
      if (name && name.trim()) localUsers[lUserIndex].name = name.trim();
      if (userTitle && userTitle.trim()) localUsers[lUserIndex].userTitle = userTitle.trim();
      if (avatarColor && avatarColor.trim()) localUsers[lUserIndex].avatarColor = avatarColor.trim();
      if (profileImage !== undefined) localUsers[lUserIndex].profileImage = profileImage;
      saveLocalUsers(localUsers);
    } else {
      // Create record in local_users.json so it is persisted
      const newUser = {
        id: userId,
        name: name ? name.trim() : 'Learner',
        email: email || 'learner@example.com',
        userTitle: userTitle ? userTitle.trim() : 'React Native Developer',
        avatarColor: avatarColor || '#007AFF',
        profileImage: profileImage !== undefined ? profileImage : null,
        streak: 1,
        lastActiveDate: todayStr,
        completedComponents: [],
        createdAt: new Date().toISOString()
      };
      localUsers.push(newUser);
      saveLocalUsers(localUsers);
      lUserIndex = localUsers.length - 1;
    }

    const localRecord = localUsers[lUserIndex];

    // 2. Update in MongoDB if connected
    let dbUser = null;
    if (isDbConnected()) {
      try {
        if (isValidId(userId)) {
          dbUser = await User.findById(userId);
        }
        if (!dbUser && (email || (localRecord && localRecord.email))) {
          const searchEmail = (email || localRecord.email).toLowerCase().trim();
          dbUser = await User.findOne({ email: searchEmail });
        }
        if (dbUser) {
          if (name && name.trim()) dbUser.name = name.trim();
          if (userTitle && userTitle.trim()) dbUser.userTitle = userTitle.trim();
          if (avatarColor && avatarColor.trim()) dbUser.avatarColor = avatarColor.trim();
          if (profileImage !== undefined) dbUser.profileImage = profileImage;
          await dbUser.save();
        }
      } catch (dbErr) {
        console.log('MongoDB update notice:', dbErr.message);
      }
    }

    const returnUser = {
      id: (dbUser && dbUser._id) || localRecord.id || userId,
      name: (dbUser && dbUser.name) || localRecord.name,
      email: (dbUser && dbUser.email) || localRecord.email,
      userTitle: (dbUser && dbUser.userTitle) || localRecord.userTitle,
      avatarColor: (dbUser && dbUser.avatarColor) || localRecord.avatarColor,
      profileImage: profileImage !== undefined ? profileImage : (localRecord.profileImage || (dbUser && dbUser.profileImage) || null),
      streak: (dbUser && dbUser.streak) || localRecord.streak || 1,
      lastActiveDate: (dbUser && dbUser.lastActiveDate) || localRecord.lastActiveDate || todayStr,
      completedComponentsCount: ((dbUser && dbUser.completedComponents) || localRecord.completedComponents || []).length
    };

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: returnUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET LEARNING PROGRESS & STREAK (Auto-calculates & updates streak)
router.get(['/progress', '/progress/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    if (!isDbConnected() || !isValidId(userId)) {
      if (lUser) {
        syncUserStreak(lUser, false);
        saveLocalUsers(localUsers);
      }
      return res.json({
        success: true,
        progress: {
          streak: (lUser && lUser.streak) || 1,
          lastActiveDate: (lUser && lUser.lastActiveDate) || todayStr,
          completedCount: ((lUser && lUser.completedComponents) || []).length,
          completedComponents: (lUser && lUser.completedComponents) || []
        }
      });
    }

    let user = await User.findById(userId).select('streak lastActiveDate completedComponents createdAt email');
    if (!user && lUser && lUser.email) {
      user = await User.findOne({ email: lUser.email.toLowerCase().trim() }).select('streak lastActiveDate completedComponents createdAt email');
    }

    if (!user) {
      if (lUser) {
        syncUserStreak(lUser, false);
        saveLocalUsers(localUsers);
      }
      return res.json({
        success: true,
        progress: {
          streak: (lUser && lUser.streak) || 1,
          lastActiveDate: (lUser && lUser.lastActiveDate) || todayStr,
          completedCount: ((lUser && lUser.completedComponents) || []).length,
          completedComponents: (lUser && lUser.completedComponents) || []
        }
      });
    }

    // Auto-evaluate streak in DB
    await syncUserStreak(user, true);

    // Sync with local record
    if (lUser) {
      lUser.streak = user.streak;
      lUser.lastActiveDate = user.lastActiveDate;
      saveLocalUsers(localUsers);
    }

    res.json({
      success: true,
      progress: {
        streak: user.streak,
        lastActiveDate: user.lastActiveDate,
        completedCount: user.completedComponents.length,
        completedComponents: user.completedComponents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. UPDATE LEARNING PROGRESS & STREAK
router.put(['/progress', '/progress/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    const { componentName, streak, lastActiveDate, completedComponents } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Update in local_users.json
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    if (lUser) {
      if (typeof streak === 'number') lUser.streak = streak;
      if (lastActiveDate) lUser.lastActiveDate = lastActiveDate;
      else if (typeof streak === 'number') lUser.lastActiveDate = todayStr;

      if (!lUser.completedComponents) lUser.completedComponents = [];
      if (componentName && !lUser.completedComponents.includes(componentName)) {
        lUser.completedComponents.push(componentName);
      }
      if (Array.isArray(completedComponents)) {
        lUser.completedComponents = [...new Set(completedComponents)];
      }
      saveLocalUsers(localUsers);
    }

    if (!isDbConnected() || !isValidId(userId)) {
      return res.json({
        success: true,
        message: 'Progress updated successfully!',
        progress: {
          streak: typeof streak === 'number' ? streak : (lUser && lUser.streak) || 1,
          lastActiveDate: lastActiveDate || (lUser && lUser.lastActiveDate) || todayStr,
          completedCount: Array.isArray(completedComponents)
            ? completedComponents.length
            : ((lUser && lUser.completedComponents) || []).length,
          completedComponents: completedComponents || ((lUser && lUser.completedComponents) || [])
        }
      });
    }

    let user = await User.findById(userId);
    if (!user && lUser && lUser.email) {
      user = await User.findOne({ email: lUser.email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (componentName && !user.completedComponents.includes(componentName)) {
      user.completedComponents.push(componentName);
    }

    if (Array.isArray(completedComponents)) {
      user.completedComponents = [...new Set(completedComponents)];
    }

    if (typeof streak === 'number') {
      user.streak = streak;
      user.lastActiveDate = lastActiveDate || todayStr;
    } else if (lastActiveDate) {
      user.lastActiveDate = lastActiveDate;
    }

    await user.save();

    if (lUser) {
      lUser.streak = user.streak;
      lUser.lastActiveDate = user.lastActiveDate;
      saveLocalUsers(localUsers);
    }

    res.json({
      success: true,
      message: 'Progress updated successfully!',
      progress: {
        streak: user.streak,
        lastActiveDate: user.lastActiveDate,
        completedCount: user.completedComponents.length,
        completedComponents: user.completedComponents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. GET OR REFRESH DAILY STREAK
router.get(['/streak', '/streak/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    let dbUser = null;
    if (isDbConnected()) {
      if (isValidId(userId)) dbUser = await User.findById(userId);
      if (!dbUser && lUser && lUser.email) {
        dbUser = await User.findOne({ email: lUser.email.toLowerCase().trim() });
      }
    }

    let streakResult = null;
    if (dbUser) {
      streakResult = await syncUserStreak(dbUser, true);
      if (lUser) {
        lUser.streak = dbUser.streak;
        lUser.lastActiveDate = dbUser.lastActiveDate;
        saveLocalUsers(localUsers);
      }
    } else if (lUser) {
      streakResult = syncUserStreak(lUser, false);
      saveLocalUsers(localUsers);
    }

    const finalStreak = (dbUser && dbUser.streak) || (lUser && lUser.streak) || 1;
    const finalLastDate = (dbUser && dbUser.lastActiveDate) || (lUser && lUser.lastActiveDate) || todayStr;

    res.json({
      success: true,
      streak: finalStreak,
      lastActiveDate: finalLastDate,
      streakUpdated: streakResult ? streakResult.updated : false,
      reason: streakResult ? streakResult.reason : 'unchanged'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. SYNC STREAK EXPLICITLY (POST /api/user/streak/:userId)
router.post(['/streak', '/streak/:userId', '/streak/sync', '/streak/sync/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    const { streak: clientStreak, lastActiveDate: clientLastDate } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    let dbUser = null;
    if (isDbConnected()) {
      if (isValidId(userId)) dbUser = await User.findById(userId);
      if (!dbUser && lUser && lUser.email) {
        dbUser = await User.findOne({ email: lUser.email.toLowerCase().trim() });
      }
    }

    if (typeof clientStreak === 'number' && clientStreak > 0) {
      if (dbUser) {
        dbUser.streak = clientStreak;
        dbUser.lastActiveDate = clientLastDate || todayStr;
        await dbUser.save();
      }
      if (lUser) {
        lUser.streak = clientStreak;
        lUser.lastActiveDate = clientLastDate || todayStr;
        saveLocalUsers(localUsers);
      }
    } else {
      if (dbUser) await syncUserStreak(dbUser, true);
      if (lUser) {
        syncUserStreak(lUser, false);
        saveLocalUsers(localUsers);
      }
    }

    const finalStreak = (dbUser && dbUser.streak) || (lUser && lUser.streak) || 1;
    const finalLastDate = (dbUser && dbUser.lastActiveDate) || (lUser && lUser.lastActiveDate) || todayStr;

    res.json({
      success: true,
      message: 'Streak synced successfully!',
      streak: finalStreak,
      lastActiveDate: finalLastDate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// 7. SYNC SCREEN TIME / APP USAGE (Offline-First Sync)
router.post(['/sync-time', '/sync-time/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    const { totalSeconds, todaySeconds, totalScreenTimeSeconds, todayScreenTimeSeconds } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const incomingTotal = typeof totalScreenTimeSeconds === 'number'
      ? totalScreenTimeSeconds
      : (typeof totalSeconds === 'number' ? totalSeconds : 0);

    const incomingToday = typeof todayScreenTimeSeconds === 'number'
      ? todayScreenTimeSeconds
      : (typeof todaySeconds === 'number' ? todaySeconds : 0);

    const now = new Date();
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    let dbUser = null;
    if (isDbConnected()) {
      if (isValidId(userId)) dbUser = await User.findById(userId);
      if (!dbUser && lUser && lUser.email) {
        dbUser = await User.findOne({ email: lUser.email.toLowerCase().trim() });
      }
    }

    let finalTotal = incomingTotal;
    let finalToday = incomingToday;

    if (dbUser) {
      const currentDbTotal = dbUser.totalScreenTimeSeconds || 0;
      finalTotal = Math.max(currentDbTotal, incomingTotal);
      dbUser.totalScreenTimeSeconds = finalTotal;
      dbUser.todayScreenTimeSeconds = finalToday;
      dbUser.lastScreenTimeSync = now;
      await dbUser.save();
    }

    if (lUser) {
      const currentLocalTotal = lUser.totalScreenTimeSeconds || 0;
      finalTotal = Math.max(currentLocalTotal, finalTotal);
      lUser.totalScreenTimeSeconds = finalTotal;
      lUser.todayScreenTimeSeconds = finalToday;
      lUser.lastScreenTimeSync = now.toISOString();
      saveLocalUsers(localUsers);
    }

    res.json({
      success: true,
      message: 'Screen time synced successfully!',
      screenTime: {
        totalScreenTimeSeconds: finalTotal,
        todayScreenTimeSeconds: finalToday,
        lastScreenTimeSync: now,
      },
    });
  } catch (error) {
    console.error('Screen time sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. GET SCREEN TIME
router.get(['/sync-time', '/sync-time/:userId', '/screen-time/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u =>
      u.id === userId ||
      (u._id && u._id.toString() === userId) ||
      (u.email && u.email === userId)
    );

    let dbUser = null;
    if (isDbConnected()) {
      if (isValidId(userId)) dbUser = await User.findById(userId);
      if (!dbUser && lUser && lUser.email) {
        dbUser = await User.findOne({ email: lUser.email.toLowerCase().trim() });
      }
    }

    const totalSeconds = (dbUser && dbUser.totalScreenTimeSeconds) || (lUser && lUser.totalScreenTimeSeconds) || 0;
    const todaySeconds = (dbUser && dbUser.todayScreenTimeSeconds) || (lUser && lUser.todayScreenTimeSeconds) || 0;
    const lastSync = (dbUser && dbUser.lastScreenTimeSync) || (lUser && lUser.lastScreenTimeSync) || null;

    res.json({
      success: true,
      screenTime: {
        totalScreenTimeSeconds: totalSeconds,
        todayScreenTimeSeconds: todaySeconds,
        lastScreenTimeSync: lastSync,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. DELETE USER ACCOUNT & ALL ASSOCIATED DATA (Hard Delete)
// Endpoint: DELETE /api/user/profile/:userId
router.delete(['/profile', '/profile/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);
    const targetEmail = req.query.email || (req.body && req.body.email);

    if (!userId && !targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required to delete account.'
      });
    }

    let deletedDbUser = null;
    let localDeletedCount = 0;
    let userEmail = targetEmail ? targetEmail.toLowerCase().trim() : null;
    let userName = 'User';

    // 1. Delete from MongoDB Atlas if connected
    if (isDbConnected()) {
      try {
        let query = null;
        if (isValidId(userId)) {
          query = { _id: userId };
        } else if (targetEmail) {
          query = { email: targetEmail.toLowerCase().trim() };
        } else if (userId && typeof userId === 'string') {
          query = {
            $or: [
              ...(isValidId(userId) ? [{ _id: userId }] : []),
              { email: userId.toLowerCase().trim() }
            ]
          };
        }

        if (query) {
          const existingUser = await User.findOne(query);

          if (existingUser) {
            userEmail = existingUser.email;
            userName = existingUser.name;

            // Delete all notifications for this user
            await Notification.deleteMany({ userId: existingUser._id });

            // Delete or unlink feedback associated with this user
            await Feedback.deleteMany({
              $or: [
                { userId: existingUser._id },
                { email: existingUser.email }
              ]
            });

            // Delete physical profile image file if stored locally on server disk
            if (existingUser.profileImage && typeof existingUser.profileImage === 'string') {
              if (existingUser.profileImage.startsWith('/uploads/') || existingUser.profileImage.startsWith('uploads/')) {
                const fullImgPath = path.join(__dirname, '..', 'public', existingUser.profileImage);
                if (fs.existsSync(fullImgPath)) {
                  try { fs.unlinkSync(fullImgPath); } catch (_) {}
                }
              }
            }

            // Hard delete the User document from MongoDB
            deletedDbUser = await User.findByIdAndDelete(existingUser._id);
          }
        }
      } catch (dbErr) {
        console.error('MongoDB account deletion error:', dbErr.message);
      }
    }

    // 2. Delete from local_users.json
    const localUsers = getLocalUsers();
    const initialLen = localUsers.length;
    const filteredUsers = localUsers.filter(u => {
      const matchId = (u.id && u.id.toString() === userId) || (u._id && u._id.toString() === userId);
      const matchEmail = (userEmail && u.email && u.email.toLowerCase() === userEmail) ||
                         (targetEmail && u.email && u.email.toLowerCase() === targetEmail.toLowerCase().trim()) ||
                         (userId && u.email && u.email.toLowerCase() === userId.toLowerCase().trim());
      return !(matchId || matchEmail);
    });

    if (filteredUsers.length < initialLen) {
      localDeletedCount = initialLen - filteredUsers.length;
      saveLocalUsers(filteredUsers);
    }

    if (!deletedDbUser && localDeletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. It may have already been deleted.'
      });
    }

    // Send confirmation email
    if (userEmail) {
      sendAccountDeletionEmail(userEmail, userName).catch(err => {
        console.log('Deletion email notice:', err.message);
      });
    }

    return res.json({
      success: true,
      message: 'Account, learning progress, quiz history, and profile photo have been permanently deleted from our servers.',
      details: {
        userId: (deletedDbUser && deletedDbUser._id) || userId,
        email: userEmail,
        deletedFromDatabase: Boolean(deletedDbUser),
        deletedFromLocalStorage: localDeletedCount > 0,
        cleanedData: [
          'User credentials & profile data',
          'Completed component progress & streaks',
          'Practice quiz results & achievements',
          'Screen time analytics',
          'Device push notification tokens',
          'Profile picture & avatar preferences'
        ]
      }
    });

  } catch (error) {
    console.error('DELETE /api/user/profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. WEB ACCOUNT DELETION REQUEST (Web portal & Google Play compliance)
// Endpoint: POST /api/user/delete-account-request
router.post('/delete-account-request', async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Registered email address is required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let deletedFromDb = false;
    let userName = 'User';

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        userName = user.name;
        await Notification.deleteMany({ userId: user._id });
        await Feedback.deleteMany({
          $or: [{ userId: user._id }, { email: normalizedEmail }]
        });
        await User.findByIdAndDelete(user._id);
        deletedFromDb = true;
      }
    }

    const localUsers = getLocalUsers();
    const filteredUsers = localUsers.filter(u => !u.email || u.email.toLowerCase() !== normalizedEmail);
    const deletedFromLocal = filteredUsers.length < localUsers.length;
    if (deletedFromLocal) {
      saveLocalUsers(filteredUsers);
    }

    // Record an audit entry in Feedback collection
    if (isDbConnected()) {
      try {
        const audit = new Feedback({
          name: userName,
          email: normalizedEmail,
          subject: 'Account Deletion Request - RN Master Class',
          message: `User requested permanent account deletion via Web Portal. Reason: ${reason || 'Web portal request'}. Status: Executed.`,
          status: 'resolved'
        });
        await audit.save();
      } catch (_) {}
    }

    // Send confirmation email
    sendAccountDeletionEmail(normalizedEmail, userName).catch(() => {});

    res.json({
      success: true,
      message: 'Your RN Master Class account and all associated data have been permanently deleted from our servers.',
      email: normalizedEmail,
      deleted: deletedFromDb || deletedFromLocal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

