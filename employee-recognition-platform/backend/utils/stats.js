// Calculates recognition counts and achievement badges for a user.
const Recognition = require('../models/Recognition');

function buildAchievements(points, received, given) {
  const list = [];
  if (received >= 1) list.push({ icon: 'bi-star', title: 'First Recognition', description: 'Received a first recognition' });
  if (received >= 5) list.push({ icon: 'bi-stars', title: 'Rising Star', description: 'Received 5 recognitions' });
  if (received >= 10) list.push({ icon: 'bi-people', title: 'Team Favourite', description: 'Received 10 recognitions' });
  if (points >= 100) list.push({ icon: 'bi-award', title: 'Bronze Achiever', description: 'Earned 100+ points' });
  if (points >= 250) list.push({ icon: 'bi-award-fill', title: 'Silver Achiever', description: 'Earned 250+ points' });
  if (points >= 500) list.push({ icon: 'bi-trophy-fill', title: 'Gold Achiever', description: 'Earned 500+ points' });
  if (given >= 3) list.push({ icon: 'bi-gift', title: 'Generous Giver', description: 'Recognised 3 colleagues' });
  if (given >= 10) list.push({ icon: 'bi-heart-fill', title: 'Culture Champion', description: 'Recognised 10 colleagues' });
  return list;
}

async function getUserStats(userId, points) {
  const [received, given] = await Promise.all([
    Recognition.countDocuments({ receiver: userId }),
    Recognition.countDocuments({ sender: userId })
  ]);
  return {
    recognitionCount: received,
    givenCount: given,
    achievements: buildAchievements(points, received, given)
  };
}

module.exports = { getUserStats };
