const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { syncUserStreak } = require('../utils/streakHelper');

// Helper to extract userId from params, query, body, or headers
const getUserId = (req) => {
  return (
    req.params.userId ||
    req.query.userId ||
    (req.body && req.body.userId) ||
    req.headers['x-user-id']
  );
};

// 1. SUBMIT QUIZ RESULT
// Endpoint: POST /api/quiz/result
router.post('/result', async (req, res) => {
  try {
    const { userId, score, total, topic } = req.body;

    if (!userId || score === undefined || total === undefined) {
      return res.status(400).json({
        success: false,
        message: 'User ID, score, and total questions are required.'
      });
    }

    if (typeof score !== 'number' || typeof total !== 'number' || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Score and total must be valid positive numbers.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const newResult = {
      score,
      total,
      topic: topic || 'React Native Quiz',
      date: new Date()
    };

    user.quizHistory.unshift(newResult); // newest first

    // Auto update streak on quiz activity
    await syncUserStreak(user, true);
    await user.save();

    const percentage = Math.round((score / total) * 100);

    res.status(201).json({
      success: true,
      message: 'Quiz result saved successfully!',
      result: {
        id: user.quizHistory[0]._id,
        score,
        total,
        percentage: `${percentage}%`,
        topic: newResult.topic,
        date: newResult.date
      },
      streak: user.streak,
      lastActiveDate: user.lastActiveDate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET QUIZ HISTORY & ACHIEVEMENTS
// Endpoint: GET /api/quiz/history/:userId?
router.get(['/history', '/history/:userId'], async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    const user = await User.findById(userId).select('quizHistory streak lastActiveDate');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const history = user.quizHistory || [];
    const totalQuizzes = history.length;

    let bestScore = 0;
    let totalScoreSum = 0;
    let totalQuestionsSum = 0;

    history.forEach((q) => {
      const pct = (q.score / q.total) * 100;
      if (pct > bestScore) bestScore = Math.round(pct);
      totalScoreSum += q.score;
      totalQuestionsSum += q.total;
    });

    const averageScore = totalQuestionsSum > 0 ? Math.round((totalScoreSum / totalQuestionsSum) * 100) : 0;

    // Calculate Badges / Achievements
    const achievements = [
      {
        id: 'first_quiz',
        title: 'Quiz Starter',
        description: 'Complete your first practice quiz',
        unlocked: totalQuizzes >= 1,
        icon: 'emoji-events'
      },
      {
        id: 'mastery_5',
        title: 'Dedicated Learner',
        description: 'Complete 5 practice quizzes',
        unlocked: totalQuizzes >= 5,
        icon: 'stars'
      },
      {
        id: 'perfect_score',
        title: 'Perfectionist',
        description: 'Score 100% on any quiz',
        unlocked: bestScore === 100,
        icon: 'workspace-premium'
      }
    ];

    res.json({
      success: true,
      summary: {
        totalQuizzes,
        bestScore: `${bestScore}%`,
        averageScore: `${averageScore}%`,
        unlockedAchievementsCount: achievements.filter(a => a.unlocked).length
      },
      streak: user.streak,
      achievements,
      quizHistory: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
