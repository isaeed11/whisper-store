const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// ═══════════════ طلب رمز التحقق (OTP) ═══════════════
router.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, message: 'رقم الجوال غير صحيح' });
    }

    // تنظيف رقم الجوال
    const cleanPhone = phone.replace(/\s/g, '');

    // البحث عن العميل أو إنشاء جديد
    let customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      customer = new Customer({ phone: cleanPhone });
    }

    // توليد الرمز
    const otp = customer.generateOTP();
    await customer.save();

    // ═══ هنا تربط خدمة SMS (Twilio/Unifonic) ═══
    // مؤقتاً: نطبع الرمز في الكونسول + نرسله للمتصفح (للتطوير فقط)
    console.log(`📱 OTP for ${cleanPhone}: ${otp}`);

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق',
      // ═══ احذف السطر التالي في الإنتاج! ═══
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      isNewUser: !customer.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الرمز' });
  }
});

// ═══════════════ التحقق من الرمز ═══════════════
router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace(/\s/g, '');

    const customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      return res.status(400).json({ success: false, message: 'رقم الجوال غير مسجل' });
    }

    if (!customer.verifyOTP(otp)) {
      return res.status(400).json({ success: false, message: 'رمز التحقق خاطئ أو منتهي' });
    }

    // تأكيد التحقق
    customer.verified = true;
    customer.otp = null;
    customer.otpExpires = null;
    await customer.save();

    // حفظ في الجلسة
    req.session.customerId = customer._id;
    req.session.customerPhone = customer.phone;

    res.json({
      success: true,
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        nationalId: customer.nationalId,
        address: customer.address,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحقق' });
  }
});

// ═══════════════ تحديث بيانات العميل ═══════════════
router.post('/api/auth/update-profile', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    }

    const { name, email, nationalId, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.session.customerId,
      { name, email, nationalId, address },
      { new: true }
    );

    res.json({
      success: true,
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        nationalId: customer.nationalId,
        address: customer.address,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث البيانات' });
  }
});

// ═══════════════ جلب الملف الشخصي ═══════════════
router.get('/api/auth/me', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.json({ success: false, loggedIn: false });
    }

    const customer = await Customer.findById(req.session.customerId);
    if (!customer) {
      return res.json({ success: false, loggedIn: false });
    }

    res.json({
      success: true,
      loggedIn: true,
      customer: {
        id: customer._id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        nationalId: customer.nationalId,
        address: customer.address,
      },
    });
  } catch (err) {
    res.json({ success: false, loggedIn: false });
  }
});

// ═══════════════ طلبات العميل ═══════════════
router.get('/api/auth/my-orders', async (req, res) => {
  try {
    if (!req.session.customerId) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
    }

    const customer = await Customer.findById(req.session.customerId);
    const orders = await Order.find({ 'customer.phone': customer.phone })
      .sort({ createdAt: -1 })
      .populate('items.product');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
  }
});

// ═══════════════ تسجيل الخروج ═══════════════
router.post('/api/auth/logout', (req, res) => {
  req.session.customerId = null;
  req.session.customerPhone = null;
  res.json({ success: true });
});

module.exports = router;
