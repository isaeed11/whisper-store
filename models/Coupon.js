const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  usedBy: [{ phone: String, count: Number }],
  startDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  active: { type: Boolean, default: true },
  description: { type: String, default: '' },
}, { timestamps: true });

couponSchema.methods.isValid = function(orderAmount, userPhone) {
  if (!this.active) return { valid: false, message: 'الكوبون غير مفعّل' };
  if (this.startDate && new Date() < this.startDate) return { valid: false, message: 'الكوبون لم يبدأ بعد' };
  if (this.expiryDate && new Date() > this.expiryDate) return { valid: false, message: 'الكوبون منتهي الصلاحية' };
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) return { valid: false, message: 'الكوبون وصل حد الاستخدام الأقصى' };
  if (this.minOrderAmount > 0 && orderAmount < this.minOrderAmount) return { valid: false, message: `الحد الأدنى للطلب ${this.minOrderAmount} ر.س` };
  if (userPhone && this.perUserLimit > 0) {
    const userUsage = this.usedBy.find(u => u.phone === userPhone);
    if (userUsage && userUsage.count >= this.perUserLimit) return { valid: false, message: 'لقد استخدمت هذا الكوبون من قبل' };
  }
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function(orderAmount) {
  let discount = 0;
  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscount > 0 && discount > this.maxDiscount) discount = this.maxDiscount;
  } else {
    discount = this.value;
  }
  if (discount > orderAmount) discount = orderAmount;
  return Math.round(discount * 100) / 100;
};

couponSchema.methods.recordUsage = function(userPhone) {
  this.usedCount += 1;
  if (userPhone) {
    const existing = this.usedBy.find(u => u.phone === userPhone);
    if (existing) existing.count += 1;
    else this.usedBy.push({ phone: userPhone, count: 1 });
  }
};

module.exports = mongoose.model('Coupon', couponSchema);
