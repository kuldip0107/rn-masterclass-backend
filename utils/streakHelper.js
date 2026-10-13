/**
 * Daily Streak Calculation and Maintenance Helper
 */

/**
 * Normalizes a date into YYYY-MM-DD string
 * @param {Date|string|number} date
 * @returns {string|null}
 */
const toDateString = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch (_) {
    return null;
  }
};

/**
 * Calculates calendar day difference (date2 - date1)
 * @param {string} date1Str - 'YYYY-MM-DD'
 * @param {string} date2Str - 'YYYY-MM-DD'
 * @returns {number}
 */
const getDayDifference = (date1Str, date2Str) => {
  const [y1, m1, d1] = date1Str.split('-').map(Number);
  const [y2, m2, d2] = date2Str.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

/**
 * Evaluates the user's streak based on their current streak, last active date,
 * account creation date, and today's date.
 */
const evaluateStreak = (currentStreak = 1, lastActiveDate = null, createdAt = null, overrideToday = null) => {
  const today = toDateString(overrideToday) || new Date().toISOString().split('T')[0];
  const safeStreak = Math.max(1, typeof currentStreak === 'number' && !isNaN(currentStreak) ? currentStreak : 1);

  let prevDate = toDateString(lastActiveDate);
  if (!prevDate && createdAt) {
    prevDate = toDateString(createdAt);
  }

  // If no previous date recorded at all, initialize to day 1 today
  if (!prevDate) {
    return {
      streak: safeStreak,
      lastActiveDate: today,
      updated: true,
      reason: 'initialized'
    };
  }

  // Same calendar day: keep existing streak
  if (prevDate === today) {
    return {
      streak: safeStreak,
      lastActiveDate: today,
      updated: false,
      reason: 'same_day'
    };
  }

  const diffDays = getDayDifference(prevDate, today);

  if (diffDays === 1) {
    // Exactly 1 day (consecutive): streak increments!
    return {
      streak: safeStreak + 1,
      lastActiveDate: today,
      updated: true,
      reason: 'consecutive_day'
    };
  } else if (diffDays > 1) {
    // Missed 1 or more days: streak resets to 1
    return {
      streak: 1,
      lastActiveDate: today,
      updated: true,
      reason: 'streak_broken'
    };
  } else {
    // Clock skew / negative diff: keep existing streak
    return {
      streak: safeStreak,
      lastActiveDate: today,
      updated: false,
      reason: 'clock_skew'
    };
  }
};

/**
 * Updates a user record (Mongoose document or plain JS object) with evaluated streak.
 */
const syncUserStreak = async (user, isMongoose = false, overrideToday = null) => {
  if (!user) return null;

  const currentStreak = user.streak != null ? user.streak : 1;
  const lastActiveDate = user.lastActiveDate;
  const createdAt = user.createdAt;

  const result = evaluateStreak(currentStreak, lastActiveDate, createdAt, overrideToday);

  user.streak = result.streak;
  user.lastActiveDate = result.lastActiveDate;

  if (isMongoose && typeof user.save === 'function') {
    try {
      await user.save();
    } catch (e) {
      console.warn('Mongoose streak save notice:', e.message);
    }
  }

  return result;
};

module.exports = {
  toDateString,
  getDayDifference,
  evaluateStreak,
  syncUserStreak
};
