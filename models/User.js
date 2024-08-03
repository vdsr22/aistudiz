const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordOTP: String,
  resetPasswordExpires: Date
});

UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generatePasswordResetOTP = function() {
  this.resetPasswordOTP = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return this.resetPasswordOTP;
};

UserSchema.methods.verifyPasswordResetOTP = function(otp) {
  return this.resetPasswordOTP === otp && this.resetPasswordExpires > Date.now();
};

UserSchema.methods.clearPasswordResetOTP = function() {
  this.resetPasswordOTP = undefined;
  this.resetPasswordExpires = undefined;
};

module.exports = mongoose.model('User', UserSchema);