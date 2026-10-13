const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  topic: {
    type: String,
    default: 'React Native Quiz',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  // Profile fields (for ProfileScreen & HomeScreen)
  userTitle: {
    type: String,
    default: 'React Native Developer',
    trim: true,
  },
  avatarColor: {
    type: String,
    default: '#007AFF',
  },
  profileImage: {
    type: String,
    default: null,
  },
  // Learning progress & Daily streak (for HomeScreen & Learning modules)
  streak: {
    type: Number,
    default: 1,
  },
  lastActiveDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
  },
  completedComponents: {
    type: [String],
    default: [],
  },
  // Quiz History & Achievements (for AchievementsScreen & QuizContext)
  quizHistory: [quizResultSchema],
  // Password Reset fields (for ForgotPasswordScreen)
  resetOtp: {
    type: String,
    default: null,
  },
  resetOtpExpires: {
    type: Date,
    default: null,
  },
    // App usage & Screen time (Offline-first sync)
  totalScreenTimeSeconds: {
    type: Number,
    default: 0,
  },
  todayScreenTimeSeconds: {
    type: Number,
    default: 0,
  },
  lastScreenTimeSync: {
    type: Date,
    default: Date.now,
  },
  // Push Notification Device Token (FCM)
  fcmToken: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);

