// Creates a notification. Failure to notify should never break the main request.
const Notification = require('../models/Notification');

module.exports = async function notify(userId, message, type) {
  try {
    await Notification.create({ user: userId, message, type });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};
