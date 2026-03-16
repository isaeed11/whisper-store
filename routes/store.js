const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Message = require('../models/Message');
const Settings = require('../models/Settings');
const Coupon = require('../models/Coupon');
const Page = require('../models/Page');
const Activity = require('../models/Activity');

router.get('/', async (req, res) => {
  try {
    const settings = await Settings.get();
    if (settings.maintenanceMode) return res.send('<div style="text-align:center;padding:100px;font-family:sans-serif;background:#0a0a0a;color:#f0ece4;min-height:100vh;"><h1 style="color:#c8a97e;font-size:3rem;">🔧</h1><p>الموقع تحت الصيانة</p></div>');
    const products = await Product.find({ available: true }).sort({ featured: -1, createdAt: -1 }).limit(8);
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(5);
    const productsCount = await Product.countDocuments();
    const pages = await Page.find({ active: true }).sort({ order: 1 });
    res.render('store', { products, reviews, productsCount, settings, pages });
  } catch (err) { console.error(err); res.status(500).send('خطأ'); }
});

router.get('/page/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug, active: true });
    if (!page) return res.status(404).send('الصفحة غير موجودة');
    const settings = await Settings.get();
    const pages = await Page.find({ active: true }).sort({ order: 1 });
    res.render('custom-page', { page, settings, pages });
  } catch (err) { res.status(500).send('خطأ'); }
});

router.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ' }); }
});

router.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ' }); }
});

router.get('/api/products/:id/availability', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false });
    const bookedDates = product.getBookedDates();
    if (req.query.startDate && req.query.endDate) {
      return res.json({ success: true, isAvailable: product.isAvailableForDates(req.query.startDate, req.query.endDate), bookedDates });
    }
    res.json({ success: true, bookedDates });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ═══ التحقق من الكوبون ═══
router.post('/api/coupon/validate', async (req, res) => {
  try {
    const { code, orderAmount, userPhone } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'أدخل كود الكوبون' });
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return res.status(404).json({ success: false, message: 'الكوبون غير موجود' });
    const check = coupon.isValid(orderAmount || 0, userPhone);
    if (!check.valid) return res.json({ success: false, message: check.message });
    const discount = coupon.calculateDiscount(orderAmount || 0);
    res.json({ success: true, coupon: { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description }, discount });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ' }); }
});

router.post('/api/orders', async (req, res) => {
  try {
    const { items, customer, paymentMethod, couponCode } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: 'السلة فارغة' });
    if (!customer?.name || !customer?.phone) return res.status(400).json({ success: false, message: 'الاسم ورقم الجوال مطلوبين' });

    let totalAmount = 0, totalDeposit = 0;
    const orderItems = [], productsToUpdate = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ success: false, message: 'المنتج غير موجود' });
      if (!product.available) return res.status(400).json({ success: false, message: `${product.name} غير متاح` });

      const startDate = new Date(item.startDate), endDate = new Date(item.endDate);
      if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate)
        return res.status(400).json({ success: false, message: 'تواريخ غير صحيحة' });
      if (!product.isAvailableForDates(item.startDate, item.endDate))
        return res.status(400).json({ success: false, message: `${product.name} محجوز في هذه الفترة` });

      const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000));
      const itemTotal = product.pricePerDay * days;
      orderItems.push({ product: product._id, productName: product.name, pricePerDay: product.pricePerDay, days, total: itemTotal, deposit: product.deposit, startDate, endDate, notes: item.notes || '' });
      totalAmount += itemTotal; totalDeposit += product.deposit;
      productsToUpdate.push({ product, booking: { startDate: item.startDate, endDate: item.endDate } });
    }

    // تطبيق الكوبون
    let discount = 0, appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (coupon) {
        const check = coupon.isValid(totalAmount, customer.phone);
        if (check.valid) {
          discount = coupon.calculateDiscount(totalAmount);
          appliedCoupon = coupon;
        }
      }
    }

    const order = await Order.create({ items: orderItems, customer, paymentMethod: paymentMethod || 'cash', totalAmount: totalAmount - discount, totalDeposit, discount, couponCode: appliedCoupon ? appliedCoupon.code : '' });

    // تسجيل استخدام الكوبون
    if (appliedCoupon) { appliedCoupon.recordUsage(customer.phone); await appliedCoupon.save(); }

    for (const { product, booking } of productsToUpdate) {
      product.bookings.push({ orderId: order.orderId, ...booking });
      await product.save();
    }
    await Activity.log('order', 'طلب جديد', `${order.orderId} — ${customer.name} — ${order.totalAmount} ر.س`, customer.name);
    res.json({ success: true, orderId: order.orderId, discount });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'خطأ: ' + err.message }); }
});

router.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/api/reviews', async (req, res) => {
  try { res.json({ success: true, reviews: await Review.find({ approved: true }).sort({ createdAt: -1 }) }); }
  catch (err) { res.status(500).json({ success: false }); }
});
router.post('/api/reviews', async (req, res) => {
  try {
    const { name, rating, text } = req.body;
    if (!name || !rating || !text) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    const review = await Review.create({ name, rating: Math.min(5, Math.max(1, rating)), text });
    res.json({ success: true, review });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/api/messages', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'حقول مطلوبة' });
    await Message.create({ name, email, phone, subject, message });
    res.json({ success: true, message: 'تم الإرسال' });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/api/settings', async (req, res) => {
  try { res.json({ success: true, settings: await Settings.get() }); }
  catch (err) { res.status(500).json({ success: false }); }
});

// ═══ تقييم المعدات ═══
router.post('/api/products/:id/review', async (req, res) => {
  try {
    const { customerName, customerPhone, rating, text } = req.body;
    if (!rating || !text) return res.status(400).json({ success: false, message: 'التقييم والنص مطلوبين' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    product.reviews.push({ customerName: customerName || 'زائر', customerPhone, rating: Math.min(5, Math.max(1, rating)), text });
    // إعادة حساب متوسط التقييم
    const totalR = product.reviews.filter(r => r.approved).reduce((s, r) => s + r.rating, 0);
    const countR = product.reviews.filter(r => r.approved).length;
    product.rating = countR > 0 ? Math.round((totalR / countR) * 10) / 10 : 5;
    product.totalRatings = countR;
    await product.save();
    res.json({ success: true, message: 'شكراً لتقييمك!' });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ' }); }
});

router.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false });
    const reviews = product.reviews.filter(r => r.approved).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, reviews, rating: product.rating, totalRatings: product.totalRatings });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;
