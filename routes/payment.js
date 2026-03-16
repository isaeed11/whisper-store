const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Activity = require('../models/Activity');
const paylink = require('../services/paylink');

// ═══ إنشاء جلسة دفع ═══
router.post('/api/payment/create', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId }).populate('items.product');
    if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (order.paymentStatus === 'paid') return res.json({ success: false, message: 'الطلب مدفوع مسبقاً' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const totalWithDeposit = order.totalAmount + order.totalDeposit;

    const products = order.items.map(item => ({
      name: item.productName,
      price: item.total + item.deposit,
      qty: 1,
      description: `${item.days} يوم تأجير + تأمين`,
    }));

    const result = await paylink.createInvoice({
      orderId: order.orderId,
      amount: totalWithDeposit,
      customerName: order.customer.name,
      customerEmail: order.customer.email || '',
      customerPhone: order.customer.phone,
      products,
      callbackUrl: `${baseUrl}/payment/callback`,
      cancelUrl: `${baseUrl}/payment/cancel`,
    });

    // حفظ رقم العملية
    order.transactionNo = result.transactionNo;
    order.paymentStatus = 'pending';
    await order.save();

    res.json({ success: true, paymentUrl: result.paymentUrl, transactionNo: result.transactionNo });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الدفع: ' + err.message });
  }
});

// ═══ Callback بعد الدفع ═══
router.get('/payment/callback', async (req, res) => {
  try {
    const { orderNumber, transactionNo } = req.query;
    const txn = transactionNo || orderNumber;

    if (!txn) return res.redirect('/?payment=error');

    // البحث بالـ transactionNo أو orderId
    let order = await Order.findOne({ transactionNo: txn });
    if (!order) order = await Order.findOne({ orderId: txn });
    if (!order) return res.redirect('/?payment=not-found');

    // التحقق من حالة الدفع
    const invoice = await paylink.getInvoice(order.transactionNo);

    if (invoice.orderStatus === 'Paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
      await Activity.log('order', 'دفع ناجح', `${order.orderId} — ${order.totalAmount} ر.س`, order.customer.name);
      return res.redirect(`/?payment=success&orderId=${order.orderId}`);
    } else if (invoice.orderStatus === 'Canceled') {
      order.paymentStatus = 'cancelled';
      await order.save();
      return res.redirect(`/?payment=cancelled&orderId=${order.orderId}`);
    } else {
      // لسا بانتظار الدفع
      return res.redirect(`/?payment=pending&orderId=${order.orderId}`);
    }
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?payment=error');
  }
});

// ═══ Cancel redirect ═══
router.get('/payment/cancel', async (req, res) => {
  res.redirect('/?payment=cancelled');
});

// ═══ التحقق اليدوي من حالة الدفع ═══
router.get('/api/payment/verify/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order || !order.transactionNo) return res.json({ success: false, message: 'الطلب غير موجود' });

    const invoice = await paylink.getInvoice(order.transactionNo);

    if (invoice.orderStatus === 'Paid' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
    }

    res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      orderStatus: invoice.orderStatus,
      amount: invoice.amount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحقق' });
  }
});

module.exports = router;
