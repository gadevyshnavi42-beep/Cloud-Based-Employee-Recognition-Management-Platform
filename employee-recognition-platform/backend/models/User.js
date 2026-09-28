// User collection: employees, managers and admins.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters'] },
    employeeId: { type: String, required: [true, 'Employee ID is required'], unique: true, trim: true },
    department: { type: String, required: [true, 'Department is required'], trim: true },
    role: { type: String, enum: ['employee', 'manager', 'admin'], default: 'employee' },
    profileImage: { type: String, default: '' },
    recognitionPoints: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  {
    // Never send the password hash to the client
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash the password before saving (only when it changed)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare a plain password with the stored hash
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
