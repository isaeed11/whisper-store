const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Message = require('../models/Message');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const Coupon = require('../models/Coupon');
const Activity = require('../models/Activity');
const Page = require('../models/Page');

// ═══════════════ تسجيل الدخول ═══════════════
router.get('/login', (req, res) => { res.render('admin/login', { error: null }); });
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) return res.render('admin/login', { error: 'البريد أو كلمة المرور غير صحيحة' });
    req.session.adminId = admin._id;
    req.session.adminName = admin.name;
    res.redirect('/admin');
  } catch (err) { res.render('admin/login', { error: 'حدث خطأ' }); }
});
router.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

// ═══════════════ لوحة التحكم الرئيسية ═══════════════
router.get('/', isAdmin, async (req, res) => {
  try {
    const [productsCount, ordersCount, reviewsCount, messagesCount,
           pendingOrders, activeOrders, unreadMessages, customersCount, recentOrders] = await Promise.all([
      Product.countDocuments(), Order.countDocuments(), Review.countDocuments(), Message.countDocuments(),
      Order.countDocuments({ status: 'pending' }), Order.countDocuments({ status: 'active' }),
      Message.countDocuments({ read: false }), Customer.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5),
    ]);
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'active', 'returned'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    res.render('admin/dashboard', { activePage: 'dashboard',
      adminName: req.session.adminName,
      stats: { products: productsCount, orders: ordersCount, reviews: reviewsCount, messages: messagesCount,
               pendingOrders, activeOrders, unreadMessages, customers: customersCount,
               revenue: totalRevenue[0]?.total || 0 },
      recentOrders,
    });
  } catch (err) { console.error(err); res.status(500).send('خطأ'); }
});

// ═══════════════ المنتجات ═══════════════
router.get('/products', isAdmin, async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.render('admin/products', { activePage: 'products', products, adminName: req.session.adminName });
});
router.post('/products', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, icon, specs, description, pricePerDay, deposit, featured } = req.body;
    const data = { name, category: 'equipment', icon: icon || '📷', specs, description,
      pricePerDay: Number(pricePerDay), deposit: Number(deposit) || 200, featured: featured === 'on' };
    if (req.file) data.image = '/uploads/' + req.file.filename;
    await Product.create(data);
    res.redirect('/admin/products');
  } catch (err) { console.error(err); res.redirect('/admin/products'); }
});
router.post('/products/:id/update', isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, icon, specs, description, pricePerDay, deposit, available, featured } = req.body;
    const data = { name, icon, specs, description, pricePerDay: Number(pricePerDay),
      deposit: Number(deposit), available: available === 'on', featured: featured === 'on' };
    if (req.file) {
      const old = await Product.findById(req.params.id);
      if (old?.image) { const p = path.join(__dirname, '../public', old.image); if (fs.existsSync(p)) fs.unlinkSync(p); }
      data.image = '/uploads/' + req.file.filename;
    }
    await Product.findByIdAndUpdate(req.params.id, data);
    res.redirect('/admin/products');
  } catch (err) { res.redirect('/admin/products'); }
});
router.post('/products/:id/delete', isAdmin, async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (p?.image) { const fp = path.join(__dirname, '../public', p.image); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
  await Product.findByIdAndDelete(req.params.id);
  res.redirect('/admin/products');
});

// ═══════════════ الطلبات ═══════════════
router.get('/orders', isAdmin, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.render('admin/orders', { activePage: 'orders', orders, adminName: req.session.adminName, currentStatus: req.query.status || '' });
});
router.post('/orders/:id/status', isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    const oldStatus = order.status;
    order.status = req.body.status;
    order.adminNotes = req.body.adminNotes;
    await order.save();
    if (req.body.status === 'cancelled' && oldStatus !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $pull: { bookings: { orderId: order.orderId } } });
      }
    }
  }
  res.redirect('/admin/orders');
});
router.post('/orders/:id/delete', isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $pull: { bookings: { orderId: order.orderId } } });
    }
    await Order.findByIdAndDelete(req.params.id);
  }
  res.redirect('/admin/orders');
});

// ═══════════════ إنشاء طلب يدوي (من لوحة التحكم) ═══════════════
router.get('/orders/new', isAdmin, async (req, res) => {
  const products = await Product.find({ available: true }).sort({ name: 1 });
  res.render('admin/new-order', { activePage: 'orders', products, adminName: req.session.adminName });
});
router.post('/orders/new', isAdmin, async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, productId, startDate, endDate, paymentMethod, adminNotes } = req.body;
    const product = await Product.findById(productId);
    if (!product) { return res.redirect('/admin/orders/new'); }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end - start) / (1000*60*60*24)));
    const total = product.pricePerDay * days;

    const order = await Order.create({
      items: [{
        product: product._id, productName: product.name, pricePerDay: product.pricePerDay,
        days, total, deposit: product.deposit, startDate: start, endDate: end,
      }],
      customer: { name: customerName, phone: customerPhone, email: customerEmail || '' },
      paymentMethod: paymentMethod || 'cash',
      totalAmount: total,
      totalDeposit: product.deposit,
      status: 'confirmed',
      adminNotes: adminNotes || 'طلب يدوي من لوحة التحكم',
    });

    product.bookings.push({ orderId: order.orderId, startDate, endDate });
    await product.save();

    res.redirect('/admin/orders');
  } catch (err) { console.error(err); res.redirect('/admin/orders/new'); }
});

// ═══════════════ الأعضاء (العملاء) ═══════════════
router.get('/customers', isAdmin, async (req, res) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  // جلب عدد الطلبات لكل عميل
  const customerData = await Promise.all(customers.map(async (c) => {
    const orderCount = await Order.countDocuments({ 'customer.phone': c.phone });
    const totalSpent = await Order.aggregate([
      { $match: { 'customer.phone': c.phone, status: { $in: ['confirmed', 'active', 'returned'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    return { ...c.toObject(), orderCount, totalSpent: totalSpent[0]?.total || 0 };
  }));
  res.render('admin/customers', { activePage: 'customers', customers: customerData, adminName: req.session.adminName });
});

// ═══════════════ إعدادات الموقع ═══════════════
router.get('/settings', isAdmin, async (req, res) => {
  const settings = await Settings.get();
  res.render('admin/settings', { activePage: 'settings', settings, adminName: req.session.adminName, saved: req.query.saved === '1' });
});
router.post('/settings', isAdmin, upload.fields([{ name: 'logoImage', maxCount: 1 }, { name: 'heroBgImage', maxCount: 1 }]), async (req, res) => {
  try {
    const settings = await Settings.get();
    const fields = ['siteName','siteTagline','siteDescription','heroTitle','heroSubtitle','heroTag',
      'phone','email','address','workingHours','instagram','instagramUrl','whatsapp','tiktok','twitter','googleMapsUrl',
      'seoTitle','seoDescription','seoKeywords','footerText','currency','termsText','aboutText','announcementBar',
      'logoType','logoText','accentColor','bgColor','cardColor','textColor','whatsappNotifyNumber'];

    fields.forEach(f => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });

    if (req.body.defaultDeposit) settings.defaultDeposit = Number(req.body.defaultDeposit);
    if (req.body.minRentalDays) settings.minRentalDays = Number(req.body.minRentalDays);
    if (req.body.heroBgOverlay) settings.heroBgOverlay = Number(req.body.heroBgOverlay);
    settings.maintenanceMode = req.body.maintenanceMode === 'on';
    settings.whatsappNotify = req.body.whatsappNotify === 'on';

    // رفع صورة الشعار
    if (req.files && req.files.logoImage) {
      settings.logoImage = '/uploads/' + req.files.logoImage[0].filename;
    }
    // رفع صورة البنر
    if (req.files && req.files.heroBgImage) {
      settings.heroBgImage = '/uploads/' + req.files.heroBgImage[0].filename;
    }

    // المميزات
    if (req.body['feat_icon_0']) {
      settings.features = [];
      for (let i = 0; i < 6; i++) {
        if (req.body[`feat_icon_${i}`] && req.body[`feat_title_${i}`]) {
          settings.features.push({
            icon: req.body[`feat_icon_${i}`],
            title: req.body[`feat_title_${i}`],
            desc: req.body[`feat_desc_${i}`] || '',
          });
        }
      }
    }

    await settings.save();
    res.redirect('/admin/settings?saved=1');
  } catch (err) { console.error(err); res.redirect('/admin/settings'); }
});

// ═══════════════ التقييمات ═══════════════
router.get('/reviews', isAdmin, async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 });
  res.render('admin/reviews', { activePage: 'reviews', reviews, adminName: req.session.adminName });
});
router.post('/reviews/:id/toggle', isAdmin, async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (r) { r.approved = !r.approved; await r.save(); }
  res.redirect('/admin/reviews');
});
router.post('/reviews/:id/delete', isAdmin, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.redirect('/admin/reviews');
});

// ═══════════════ الرسائل ═══════════════
router.get('/messages', isAdmin, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  await Message.updateMany({ read: false }, { read: true });
  res.render('admin/messages', { activePage: 'messages', messages, adminName: req.session.adminName });
});
router.post('/messages/:id/delete', isAdmin, async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.redirect('/admin/messages');
});

// ═══════════════ الكوبونات ═══════════════
router.get('/coupons', isAdmin, async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.render('admin/coupons', { activePage: 'coupons', coupons, adminName: req.session.adminName });
});
router.post('/coupons', isAdmin, async (req, res) => {
  try {
    const { code, type, value, description, minOrderAmount, maxDiscount, usageLimit, perUserLimit, startDate, expiryDate } = req.body;
    await Coupon.create({
      code: code.toUpperCase().trim(), type, value: Number(value), description,
      minOrderAmount: Number(minOrderAmount) || 0, maxDiscount: Number(maxDiscount) || 0,
      usageLimit: Number(usageLimit) || 0, perUserLimit: Number(perUserLimit) || 1,
      startDate: startDate || null, expiryDate: expiryDate || null,
    });
    res.redirect('/admin/coupons');
  } catch (err) { console.error(err); res.redirect('/admin/coupons'); }
});
router.post('/coupons/:id/toggle', isAdmin, async (req, res) => {
  const c = await Coupon.findById(req.params.id);
  if (c) { c.active = !c.active; await c.save(); }
  res.redirect('/admin/coupons');
});
router.post('/coupons/:id/delete', isAdmin, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  await Activity.log('coupon', 'حذف كوبون', '', req.session.adminName);
  res.redirect('/admin/coupons');
});

// ═══════════════ تخصيص الواجهة ═══════════════
router.get('/appearance', isAdmin, async (req, res) => {
  const settings = await Settings.get();
  const pages = await Page.find({ active: true }).sort({ order: 1 });
  res.render('admin/appearance', { activePage: 'appearance', settings, pages, adminName: req.session.adminName, saved: req.query.saved === '1' });
});
router.post('/appearance', isAdmin, async (req, res) => {
  try {
    const settings = await Settings.get();

    // حفظ روابط النافبار
    const navCount = parseInt(req.body.navLinksCount) || 0;
    settings.navLinks = [];
    for (let i = 0; i < navCount; i++) {
      if (req.body[`nav_label_${i}`]) {
        settings.navLinks.push({
          label: req.body[`nav_label_${i}`],
          page: req.body[`nav_page_${i}`] || 'home',
          url: req.body[`nav_url_${i}`] || '',
          order: i,
          visible: req.body[`nav_visible_${i}`] === 'on',
        });
      }
    }

    // حفظ روابط الفوتر
    const footerCount = parseInt(req.body.footerLinksCount) || 0;
    settings.footerLinks = [];
    for (let i = 0; i < footerCount; i++) {
      if (req.body[`footer_label_${i}`]) {
        settings.footerLinks.push({
          label: req.body[`footer_label_${i}`],
          page: req.body[`footer_page_${i}`] || 'home',
          url: req.body[`footer_url_${i}`] || '',
          order: i,
          visible: req.body[`footer_visible_${i}`] === 'on',
        });
      }
    }

    // حفظ إعدادات الفوتر
    settings.footerDescription = req.body.footerDescription || '';
    settings.showSocialInFooter = req.body.showSocialInFooter === 'on';

    // حفظ ترتيب الأقسام
    const sectionsCount = parseInt(req.body.sectionsCount) || 0;
    settings.homeSections = [];
    for (let i = 0; i < sectionsCount; i++) {
      if (req.body[`section_id_${i}`]) {
        settings.homeSections.push({
          id: req.body[`section_id_${i}`],
          label: req.body[`section_label_${i}`],
          order: parseInt(req.body[`section_order_${i}`]) || i,
          visible: req.body[`section_visible_${i}`] === 'on',
        });
      }
    }

    await settings.save();
    await Activity.log('settings', 'تحديث تخصيص الواجهة', '', req.session.adminName);
    res.redirect('/admin/appearance?saved=1');
  } catch (err) { console.error(err); res.redirect('/admin/appearance'); }
});

// ═══════════════ التقارير ═══════════════
router.get('/reports', isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allOrders = await Order.find({ status: { $in: ['confirmed', 'active', 'returned'] } });
    const thisMonthOrders = allOrders.filter(o => o.createdAt >= thisMonthStart);
    const totalRevenue = allOrders.reduce((s, o) => s + o.totalAmount, 0);
    const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalDiscounts = allOrders.reduce((s, o) => s + (o.discount || 0), 0);
    const avgOrderValue = allOrders.length ? Math.round(totalRevenue / allOrders.length) : 0;

    const statusCounts = { pending: 0, confirmed: 0, active: 0, returned: 0, cancelled: 0 };
    const allOrdersFull = await Order.find();
    allOrdersFull.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

    // Monthly data (last 12 months)
    const monthlyLabels = [], monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      monthlyLabels.push(months[d.getMonth()]);
      monthlyData.push(allOrders.filter(o => o.createdAt >= d && o.createdAt <= end).reduce((s, o) => s + o.totalAmount, 0));
    }

    // Daily data (last 30 days)
    const dailyLabels = [], dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      dailyLabels.push(d.getDate() + '/' + (d.getMonth()+1));
      dailyData.push(allOrdersFull.filter(o => o.createdAt >= d && o.createdAt <= end).length);
    }

    // Top products
    const productMap = {};
    allOrders.forEach(o => o.items.forEach(item => {
      if (!productMap[item.productName]) productMap[item.productName] = { name: item.productName, count: 0, revenue: 0 };
      productMap[item.productName].count++;
      productMap[item.productName].revenue += item.total;
    }));
    const topProducts = Object.values(productMap).sort((a, b) => b.count - a.count).slice(0, 5);

    res.render('admin/reports', { activePage: 'reports',
      adminName: req.session.adminName,
      report: { totalRevenue, totalOrders: allOrders.length, thisMonthRevenue, thisMonthOrders: thisMonthOrders.length,
                avgOrderValue, totalDiscounts, statusCounts, monthlyLabels, monthlyData, dailyLabels, dailyData, topProducts }
    });
  } catch (err) { console.error(err); res.status(500).send('خطأ'); }
});

// ═══════════════ سجل النشاطات ═══════════════
router.get('/activity', isAdmin, async (req, res) => {
  const activities = await Activity.find().sort({ createdAt: -1 }).limit(100);
  res.render('admin/activity', { activePage: 'activity', activities, adminName: req.session.adminName });
});

// ═══════════════ الصفحات المخصصة ═══════════════
router.get('/pages', isAdmin, async (req, res) => {
  const pages = await Page.find().sort({ order: 1, createdAt: -1 });
  res.render('admin/pages', { activePage: 'pages', pages, adminName: req.session.adminName });
});
router.post('/pages', isAdmin, async (req, res) => {
  try {
    const { title, slug, content, showInNav, showInFooter } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const page = await Page.create({ title, slug: cleanSlug, content, showInNav: showInNav === 'on', showInFooter: showInFooter === 'on' });

    // إضافة تلقائية للنافبار والفوتر
    const settings = await Settings.get();
    if (showInNav === 'on') {
      const exists = settings.navLinks.find(l => l.page === 'page-' + cleanSlug);
      if (!exists) {
        settings.navLinks.push({ label: title, page: 'page-' + cleanSlug, url: '', order: settings.navLinks.length, visible: true });
      }
    }
    if (showInFooter === 'on') {
      const exists = settings.footerLinks.find(l => l.page === 'page-' + cleanSlug);
      if (!exists) {
        settings.footerLinks.push({ label: title, page: 'page-' + cleanSlug, url: '', order: settings.footerLinks.length, visible: true });
      }
    }
    await settings.save();

    await Activity.log('page', 'إنشاء صفحة', title, req.session.adminName);
    res.redirect('/admin/pages');
  } catch (err) { console.error(err); res.redirect('/admin/pages'); }
});
router.post('/pages/:id/update', isAdmin, async (req, res) => {
  const { title, content, showInNav, showInFooter, active } = req.body;
  const page = await Page.findByIdAndUpdate(req.params.id, { title, content, showInNav: showInNav === 'on', showInFooter: showInFooter === 'on', active: active === 'on' }, { new: true });

  // تحديث النافبار والفوتر تلقائياً
  if (page) {
    const settings = await Settings.get();
    const slug = page.slug;
    if (showInNav === 'on') {
      if (!settings.navLinks.find(l => l.page === 'page-' + slug)) {
        settings.navLinks.push({ label: title, page: 'page-' + slug, url: '', order: settings.navLinks.length, visible: true });
      }
    } else {
      settings.navLinks = settings.navLinks.filter(l => l.page !== 'page-' + slug);
    }
    if (showInFooter === 'on') {
      if (!settings.footerLinks.find(l => l.page === 'page-' + slug)) {
        settings.footerLinks.push({ label: title, page: 'page-' + slug, url: '', order: settings.footerLinks.length, visible: true });
      }
    } else {
      settings.footerLinks = settings.footerLinks.filter(l => l.page !== 'page-' + slug);
    }
    await settings.save();
  }

  res.redirect('/admin/pages');
});
router.post('/pages/:id/delete', isAdmin, async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (page) {
    // حذف من النافبار والفوتر
    const settings = await Settings.get();
    settings.navLinks = settings.navLinks.filter(l => l.page !== 'page-' + page.slug);
    settings.footerLinks = settings.footerLinks.filter(l => l.page !== 'page-' + page.slug);
    await settings.save();
    await Page.findByIdAndDelete(req.params.id);
  }
  res.redirect('/admin/pages');
});

module.exports = router;
