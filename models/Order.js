const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  pricePerDay: Number,
  days: Number,
  total: Number,
  deposit: Number,
  startDate: Date,
  endDate: Date,
  notes: String,
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  items: [orderItemSchema],
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    nationalId: String,
    address: String,
  },
  paymentMethod: {
    type: String,
    enum: ['bank', 'card', 'cash', 'stc'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'returned', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  totalDeposit: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  transactionNo: { type: String, default: '' },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'cancelled', 'refunded'], default: 'unpaid' },
  adminNotes: String,
}, { timestamps: true });

// توليد رقم طلب فريد
orderSchema.pre('validate', function(next) {
  if (!this.orderId) {
    this.orderId = 'WSP-' + Date.now().toString(36).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
