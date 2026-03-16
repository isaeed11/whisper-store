const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['order', 'product', 'review', 'coupon', 'settings', 'customer', 'message', 'page', 'login'] },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  actor: { type: String, default: 'system' },
  ip: { type: String, default: '' },
}, { timestamps: true });

activitySchema.statics.log = async function(type, action, details = '', actor = 'admin') {
  return this.create({ type, action, details, actor });
};

module.exports = mongoose.model('Activity', activitySchema);
