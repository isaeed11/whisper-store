const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'equipment' },
  icon: { type: String, default: '📷' },
  image: { type: String, default: '' },
  specs: { type: String, required: true },
  description: { type: String, required: true },
  pricePerDay: { type: Number, required: true },
  deposit: { type: Number, default: 200 },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  totalRatings: { type: Number, default: 0 },
  reviews: [{
    customerName: String,
    customerPhone: String,
    rating: { type: Number, min: 1, max: 5 },
    text: String,
    approved: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }],
  available: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  bookings: [{
    orderId: String,
    startDate: Date,
    endDate: Date,
  }],
}, { timestamps: true });

productSchema.methods.isAvailableForDates = function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const booking of this.bookings) {
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);
    if (start < bEnd && end > bStart) {
      return false;
    }
  }
  return true;
};

productSchema.methods.getBookedDates = function() {
  const dates = [];
  for (const booking of this.bookings) {
    const current = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }
  return dates;
};

module.exports = mongoose.model('Product', productSchema);
