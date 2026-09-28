// Fills the database with DEMO data.  Run with:  npm run seed
// WARNING: this deletes all existing users, recognitions, notifications and categories.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Recognition = require('./models/Recognition');
const Notification = require('./models/Notification');
const Category = require('./models/Category');
const defaultCategories = require('./utils/defaultCategories');

const people = [
  { name: 'Alice Admin', email: 'admin@company.com', password: 'Admin@123', employeeId: 'EMP001', department: 'Management', role: 'admin' },
  { name: 'Mark Manager', email: 'manager@company.com', password: 'Manager@123', employeeId: 'EMP002', department: 'Operations', role: 'manager' },
  { name: 'Priya Sharma', email: 'priya@company.com', password: 'Password@123', employeeId: 'EMP003', department: 'Engineering' },
  { name: 'Rahul Verma', email: 'rahul@company.com', password: 'Password@123', employeeId: 'EMP004', department: 'Engineering' },
  { name: 'Sara Khan', email: 'sara@company.com', password: 'Password@123', employeeId: 'EMP005', department: 'Design' },
  { name: 'John Miller', email: 'john@company.com', password: 'Password@123', employeeId: 'EMP006', department: 'Sales' },
  { name: 'Meera Iyer', email: 'meera@company.com', password: 'Password@123', employeeId: 'EMP007', department: 'Customer Support' },
  { name: 'David Lee', email: 'david@company.com', password: 'Password@123', employeeId: 'EMP008', department: 'HR' }
];

// [senderIndex, receiverIndex, category, title, message, points, daysAgo]
const recognitions = [
  [1, 2, 'Innovation', 'Faster search feature', 'Priya built a search feature that cut load time in half. Brilliant work!', 50, 1],
  [4, 2, 'Teamwork', 'Great pairing session', 'Thank you for patiently walking me through the API design.', 20, 2],
  [2, 3, 'Helping Others', 'Saved the release', 'Rahul stayed late to fix the deployment bug so we could ship on time.', 40, 3],
  [1, 4, 'Performance', 'Stunning new dashboard design', 'Sara delivered the dashboard mock-ups a week early and they look amazing.', 60, 4],
  [6, 5, 'Leadership', 'Closed the big deal', 'John led the whole team through a tough negotiation and closed the deal.', 80, 5],
  [7, 6, 'Customer Service', 'Turned an unhappy customer around', 'Meera stayed calm and solved a very difficult customer case.', 45, 6],
  [3, 7, 'Teamwork', 'Onboarding made easy', 'David organised a wonderful onboarding week for the new hires.', 30, 7],
  [5, 2, 'Helping Others', 'Mentoring the interns', 'Thanks for the time you spend mentoring our interns.', 25, 8],
  [1, 6, 'Customer Service', 'Five-star feedback', 'Customers keep mentioning Meera by name in their feedback.', 55, 9],
  [4, 3, 'Innovation', 'Automated the test suite', 'Rahul automated our regression tests and saved us hours every week.', 35, 10]
];

async function seed() {
  await connectDB();

  await Promise.all([User.deleteMany(), Recognition.deleteMany(), Notification.deleteMany(), Category.deleteMany()]);
  await Category.insertMany(defaultCategories);

  // create() one by one so passwords are hashed
  const users = [];
  for (const p of people) users.push(await User.create(p));

  for (const [s, r, category, title, message, points, daysAgo] of recognitions) {
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await Recognition.create({
      sender: users[s]._id,
      receiver: users[r]._id,
      category,
      title,
      message,
      points,
      createdAt,
      likes: [users[1]._id, users[(s + 1) % users.length]._id].filter((id) => String(id) !== String(users[s]._id)),
      comments: [{ user: users[1]._id, text: 'Well deserved! 👏', createdAt }]
    });
    await User.findByIdAndUpdate(users[r]._id, { $inc: { recognitionPoints: points } });
    await Notification.create({ user: users[r]._id, message: `${users[s].name} recognised you: "${title}"`, type: 'recognition', createdAt });
    await Notification.create({ user: users[r]._id, message: `You received ${points} points from ${users[s].name}`, type: 'points', createdAt });
  }

  console.log('✅ Demo data created. Login accounts:');
  console.log('   Admin    : admin@company.com    / Admin@123');
  console.log('   Manager  : manager@company.com  / Manager@123');
  console.log('   Employee : priya@company.com    / Password@123  (all other employees use the same password)');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
