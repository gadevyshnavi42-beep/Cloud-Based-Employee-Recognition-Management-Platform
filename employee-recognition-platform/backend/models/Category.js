// Category collection: recognition categories managed by the admin.
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Category name is required'], unique: true, trim: true },
  description: { type: String, default: '', trim: true }
});

module.exports = mongoose.model('Category', categorySchema);
