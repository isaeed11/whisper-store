const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const authentica = require('../services/authentica');

// ═══════════════ طلب رمز التحقق (OTP) ═══════════════
router.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, message: 'رقم الجوال غير صحيح' });
    }

    const cleanPhone = phone.replace(/\s/g, '');

    let customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      customer = new Customer({ phone: cleanPhone });
      await customer.save();
    }

    // إرسال OTP عبر Authentica
    const smsResult = await authentica.sendOTP(cleanPhone);

    if (smsResult.success) {
      console.log(`📱 OTP sent via Authentica to ${cleanPhone}`);
      res.json({ success: true, message: 'تم إرسال رمز التحقق على جوالك', isNewUser: !customer.name });
    } else if (smsResult.devMode) {
      // وضع التطوير — بدون Authentica
      const otp = customer.generateOTP();
      await customer.save();
      console.log(`🔧 Dev OTP for ${cleanPhone}: ${otp}`);
      res.json({
        success: true, message: 'تم إرسال رمز التحقق',
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
        isNewUser: !customer.name,
      });
    } else {
      res.status(500).json({ success: false, message: smsResult.message || 'فشل إرسال الرمز' });
    }
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الرمز' });
  }
});

// ═══════════════ التحقق من الرمز ═══════════════
router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace(/\s/g, '');

    let customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      customer = new Customer({ phone: cleanPhone });
    }

    const apiKey = process.env.AUTHENTICA_API_KEY;
    if (apiKey) {
      // تحقق عبر Authentica
      const verifyResult = await authentica.verifyOTP(cleanPhone, otp);
      if (verifyResult.success) {
        customer.verified = true;
        customer.otp = null;
        customer.otpExpires = null;
        await customer.save();
        req.session.customerId = customer._id;
        req.session.customerPhone = customer.phone;
        return res.json({
          success: true,
          customer: { id: customer._id, phone: customer.phone, name: customer.name, email: customer.email, nationalId: customer.nationalId, address: customer.address },
        });
      } else {
        return res.status(400).json({ success: false, message: verifyResult.message || 'رمز التحقق خاطئ' });
      }
    }

    // Fallback: تحقق محلي
    if (!customer.verifyOTP(otp)) {
      return res.status(400).json({ success: false, message: 'رمز التحقق خاطئ أو منتهي' });
    }
    customer.verified = true;
    customer.otp = null;
    customer.otpExpires = null;
    await customer.save();
    req.session.customerId = customer._id;
    req.session.customerPhone = customer.phone;
    res.json({
      success: true,
      customer: { id: customer._id, phone: customer.phone, name: customer.name, email: customer.email, nationalId: customer.nationalId, address: customer.address },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التحقق' });
  }
});

// ═══════════════ تحديث بيانات العميل ═══════════════
router.post('/api/auth/update-profile', async (req, res) => {
  try {
    if (!req.session.customerId) return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    const { name, email, nationalId, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(req.session.customerId, { name, email, nationalId, address }, { new: true });
    res.json({ success: true, customer: { id: customer._id, phone: customer.phone, name: customer.name, email: customer.email, nationalId: customer.nationalId, address: customer.address } });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في تحديث البيانات' }); }
});

// ═══════════════ جلب الملف الشخصي ═══════════════
router.get('/api/auth/me', async (req, res) => {
  try {
    if (!req.session.customerId) return res.json({ success: false, loggedIn: false });
    const customer = await Customer.findById(req.session.customerId);
    if (!customer) return res.json({ success: false, loggedIn: false });
    res.json({ success: true, loggedIn: true, customer: { id: customer._id, phone: customer.phone, name: customer.name, email: customer.email, nationalId: customer.nationalId, address: customer.address } });
  } catch (err) { res.json({ success: false, loggedIn: false }); }
});

// ═══════════════ طلبات العميل ═══════════════
router.get('/api/auth/my-orders', async (req, res) => {
  try {
    if (!req.session.customerId) return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
    const customer = await Customer.findById(req.session.customerId);
    const orders = await Order.find({ 'customer.phone': customer.phone }).sort({ createdAt: -1 }).populate('items.product');
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' }); }
});

// ═══════════════ تسجيل الخروج ═══════════════
router.post('/api/auth/logout', (req, res) => {
  req.session.customerId = null;
  req.session.customerPhone = null;
  res.json({ success: true });
});

module.exports = router;
