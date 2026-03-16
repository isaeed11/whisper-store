const fetch = require('node-fetch');

class PaylinkService {
  constructor() {
    this.isProduction = process.env.PAYLINK_ENV === 'production';
    this.baseUrl = this.isProduction
      ? 'https://restapi.paylink.sa'
      : 'https://restpilot.paylink.sa';
    this.apiId = this.isProduction
      ? process.env.PAYLINK_API_ID
      : 'APP_ID_1123453311';
    this.secretKey = this.isProduction
      ? process.env.PAYLINK_SECRET_KEY
      : '0662abb5-13c7-38ab-cd12-236e58f43766';
    this.token = null;
    this.tokenExpiry = null;
  }

  // الحصول على التوكن
  async authenticate() {
    // لو التوكن موجود وما انتهى
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const res = await fetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiId: this.apiId,
        secretKey: this.secretKey,
        persistToken: false,
      }),
    });

    const data = await res.json();
    if (data.id_token) {
      this.token = data.id_token;
      this.tokenExpiry = Date.now() + 25 * 60 * 1000; // 25 دقيقة
      return this.token;
    }
    throw new Error('فشل التوثيق مع Paylink: ' + JSON.stringify(data));
  }

  // إنشاء فاتورة
  async createInvoice({ orderId, amount, customerName, customerEmail, customerPhone, products, callbackUrl, cancelUrl }) {
    const token = await this.authenticate();

    const invoiceProducts = products.map(p => ({
      title: p.name,
      price: p.price,
      qty: p.qty || 1,
      description: p.description || '',
      isDigital: false,
    }));

    const body = {
      orderNumber: orderId,
      amount: amount,
      callBackUrl: callbackUrl,
      cancelUrl: cancelUrl,
      clientName: customerName,
      clientEmail: customerEmail || '',
      clientMobile: customerPhone,
      currency: 'SAR',
      products: invoiceProducts,
      supportedCardBrands: ['mada', 'visaMastercard', 'amex', 'stcpay', 'urpay', 'tabby', 'tamara'],
      displayPending: true,
      note: `طلب من متجر Whisper - ${orderId}`,
    };

    const res = await fetch(`${this.baseUrl}/api/addInvoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success && data.url) {
      return {
        success: true,
        paymentUrl: data.url,
        transactionNo: data.transactionNo,
        orderStatus: data.orderStatus,
      };
    }
    throw new Error('فشل إنشاء الفاتورة: ' + JSON.stringify(data));
  }

  // التحقق من حالة الدفع
  async getInvoice(transactionNo) {
    const token = await this.authenticate();

    const res = await fetch(`${this.baseUrl}/api/getInvoice/${transactionNo}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    return {
      orderStatus: data.orderStatus,
      amount: data.amount,
      transactionNo: data.transactionNo,
      paymentErrors: data.paymentErrors,
      success: data.orderStatus === 'Paid',
    };
  }
}

module.exports = new PaylinkService();
