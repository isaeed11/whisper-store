const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  nationalId: { type: String, default: '' },
  address: { type: String, default: '' },
  // رمز التحقق
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// توليد رمز تحقق
customerSchema.methods.generateOTP = function() {
  const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 أرقام
  this.otp = code;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق
  return code;
};

// التحقق من الرمز
customerSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otpExpires) return false;
  if (new Date() > this.otpExpires) return false;
  return this.otp === code;
};

module.exports = mongoose.model('Customer', customerSchema);
