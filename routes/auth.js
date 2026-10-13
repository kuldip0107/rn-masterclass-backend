const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { syncUserStreak, evaluateStreak } = require('../utils/streakHelper');
const { sendPasswordResetOtpEmail, isSmtpConfigured } = require('../utils/mailer');

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

// 1. REGISTER API
router.post(['/register', '/signup'], async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];

    // Hash password for security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }

      const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        streak: 1,
        lastActiveDate: todayStr
      });
      await newUser.save();

      // Also cache in local users
      const localUsers = getLocalUsers();
      const existingIdx = localUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      const userObj = {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        password: hashedPassword,
        streak: 1,
        lastActiveDate: todayStr,
        createdAt: newUser.createdAt
      };
      if (existingIdx >= 0) localUsers[existingIdx] = userObj;
      else localUsers.push(userObj);
      saveLocalUsers(localUsers);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully!',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          streak: 1,
          lastActiveDate: todayStr,
          createdAt: newUser.createdAt
        }
      });
    }

    // When DB is offline, register in local store with real bcrypt password
    const localUsers = getLocalUsers();
    if (localUsers.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const newId = new mongoose.Types.ObjectId().toString();
    const newUserObj = {
      id: newId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userTitle: 'React Native Developer',
      avatarColor: '#007AFF',
      profileImage: null,
      streak: 1,
      lastActiveDate: todayStr,
      createdAt: new Date()
    };
    localUsers.push(newUserObj);
    saveLocalUsers(localUsers);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: {
        id: newId,
        name: name.trim(),
        email: normalizedEmail,
        streak: 1,
        lastActiveDate: todayStr,
        createdAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. LOGIN API - Strict Password Validation & Automatic Streak Maintenance
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. If MongoDB is connected, strictly validate against MongoDB
    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found with this email.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid password. Please enter correct password.' });
      }

      // Auto-evaluate and update streak on login
      await syncUserStreak(user, true);

      // Keep local user in sync
      const localUsers = getLocalUsers();
      const localMatch = localUsers.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
      if (localMatch) {
        localMatch.streak = user.streak;
        localMatch.lastActiveDate = user.lastActiveDate;
        saveLocalUsers(localUsers);
      }

      return res.json({
        success: true,
        message: 'Login successful!',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userTitle: user.userTitle,
          avatarColor: user.avatarColor,
          profileImage: user.profileImage || null,
          streak: user.streak,
          lastActiveDate: user.lastActiveDate,
        }
      });
    }

    // 2. If MongoDB is offline, validate against local stored users
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);

    if (localUser) {
      const isMatch = await bcrypt.compare(password, localUser.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid password. Please enter correct password.' });
      }

      // Auto-evaluate and update streak in local store
      syncUserStreak(localUser, false);
      saveLocalUsers(localUsers);

      return res.json({
        success: true,
        message: 'Login successful!',
        user: {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          userTitle: localUser.userTitle || 'React Native Developer',
          avatarColor: localUser.avatarColor || '#007AFF',
          profileImage: localUser.profileImage || null,
          streak: localUser.streak || 1,
          lastActiveDate: localUser.lastActiveDate,
        }
      });
    }

    // User not found
    return res.status(404).json({
      success: false,
      message: 'User not found with this email. Please sign up first.'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2.1 GOOGLE LOGIN & SIGNUP API
router.post(['/google-login', '/google', '/google-signup', '/googlesignin', '/google-signin'], async (req, res) => {
  try {
    const { email, name, profileImage, photoUrl, userTitle } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const finalPhoto = profileImage || photoUrl || null;
    const finalName = name && name.trim() ? name.trim() : normalizedEmail.split('@')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    if (isDbConnected()) {
      let user = await User.findOne({ email: normalizedEmail });
      let isNewUser = false;

      if (user) {
        if (finalName && (!user.name || user.name === 'Alex' || user.name === 'User' || user.name === 'React Native Developer')) {
          user.name = finalName;
        }
        if (finalPhoto) {
          user.profileImage = finalPhoto;
        }
        // Auto-evaluate and update streak on login
        await syncUserStreak(user, true);
        await user.save();
      } else {
        isNewUser = true;
        const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = new User({
          name: finalName,
          email: normalizedEmail,
          password: hashedPassword,
          profileImage: finalPhoto,
          userTitle: userTitle || 'React Native Developer',
          streak: 1,
          lastActiveDate: todayStr
        });
        await user.save();
      }

      // Sync/cache with local users
      const localUsers = getLocalUsers();
      const existingIdx = localUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
      const userCached = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        userTitle: user.userTitle,
        avatarColor: user.avatarColor,
        profileImage: user.profileImage || null,
        streak: user.streak || 1,
        lastActiveDate: user.lastActiveDate,
        password: user.password,
        createdAt: user.createdAt,
      };

      if (existingIdx >= 0) {
        localUsers[existingIdx] = { ...localUsers[existingIdx], ...userCached };
      } else {
        localUsers.push(userCached);
      }
      saveLocalUsers(localUsers);

      return res.json({
        success: true,
        message: isNewUser ? 'Google signup successful!' : 'Google login successful!',
        isNewUser,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userTitle: user.userTitle,
          avatarColor: user.avatarColor,
          profileImage: user.profileImage || null,
          streak: user.streak,
          lastActiveDate: user.lastActiveDate,
        },
      });
    }

    // Google login / signup when DB is offline
    const localUsers = getLocalUsers();
    let lUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    let isNewUser = false;

    if (lUser) {
      if (finalName) lUser.name = finalName;
      if (finalPhoto) lUser.profileImage = finalPhoto;
      syncUserStreak(lUser, false);
      saveLocalUsers(localUsers);
    } else {
      isNewUser = true;
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      lUser = {
        id: new mongoose.Types.ObjectId().toString(),
        name: finalName,
        email: normalizedEmail,
        password: hashedPassword,
        userTitle: userTitle || 'React Native Developer',
        avatarColor: '#007AFF',
        profileImage: finalPhoto,
        streak: 1,
        lastActiveDate: todayStr,
        createdAt: new Date(),
      };
      localUsers.push(lUser);
      saveLocalUsers(localUsers);
    }

    res.json({
      success: true,
      message: isNewUser ? 'Google signup successful!' : 'Google login successful!',
      isNewUser,
      user: {
        id: lUser.id,
        name: lUser.name,
        email: lUser.email,
        userTitle: lUser.userTitle,
        avatarColor: lUser.avatarColor,
        profileImage: lUser.profileImage || null,
        streak: lUser.streak,
        lastActiveDate: lUser.lastActiveDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. CHANGE PASSWORD API
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields (email, currentPassword, newPassword) are required.'
      });
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'New password must be between 6 and 20 characters.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({
        success: true,
        message: 'Password changed successfully!'
      });
    }

    const localUsers = getLocalUsers();
    const localUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);

    if (localUser) {
      const isMatch = await bcrypt.compare(currentPassword, localUser.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password does not match.' });
      }

      const salt = await bcrypt.genSalt(10);
      localUser.password = await bcrypt.hash(newPassword, salt);
      saveLocalUsers(localUsers);

      return res.json({
        success: true,
        message: 'Password changed successfully!'
      });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. FORGOT PASSWORD API - Send OTP via Real Email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    let userName = 'Learner';

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        userName = user.name || userName;
        user.resetOtp = otp;
        user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
      }
    }

    const localUsers = getLocalUsers();
    const lUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    if (lUser) {
      userName = lUser.name || userName;
      lUser.resetOtp = otp;
      lUser.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
      saveLocalUsers(localUsers);
    }

    // Deliver OTP to user's registered email inbox
    const mailResult = await sendPasswordResetOtpEmail(normalizedEmail, otp, userName);

    const responseData = {
      success: true,
      message: 'Password reset verification code has been sent to your email.',
      email: normalizedEmail,
      expiresIn: '15 minutes',
      emailDelivered: mailResult.success
    };

    // Include devOtp only when not in production or when SMTP is not configured
    if (process.env.NODE_ENV !== 'production' || !isSmtpConfigured()) {
      responseData.devOtp = otp;
      responseData.note = 'SMTP configured status: ' + (isSmtpConfigured() ? 'Active' : 'Pending credentials in .env');
    }

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. RESET PASSWORD API
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP code, and new password are required.'
      });
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 6 and 20 characters.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        if (!user.resetOtp || user.resetOtp !== otp) {
          return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
        }
        if (user.resetOtpExpires && user.resetOtpExpires < new Date()) {
          return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        return res.json({
          success: true,
          message: 'Password has been reset successfully. You can now login with your new password.'
        });
      }
    }

    const localUsers = getLocalUsers();
    const lUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    if (lUser) {
      if (!lUser.resetOtp || lUser.resetOtp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
      }

      const salt = await bcrypt.genSalt(10);
      lUser.password = await bcrypt.hash(newPassword, salt);
      lUser.resetOtp = null;
      lUser.resetOtpExpires = null;
      saveLocalUsers(localUsers);

      return res.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. GET ALL USERS
router.get('/users', async (req, res) => {
  try {
    if (isDbConnected()) {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      return res.json({
        success: true,
        totalUsers: users.length,
        users
      });
    }
    const localUsers = getLocalUsers().map(({ password, ...rest }) => rest);
    res.json({
      success: true,
      totalUsers: localUsers.length,
      users: localUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
