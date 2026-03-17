const fetch = require('node-fetch');

class AuthenticaService {
  constructor() {
    this.baseUrl = 'https://api.authentica.sa/api/v2';
    this.apiKey = process.env.AUTHENTICA_API_KEY || '';
  }

  async sendOTP(phone) {
    if (!this.apiKey) {
      console.log('⚠️ Authentica API Key غير موجود — وضع التطوير');
      return { success: false, devMode: true };
    }

    // تنظيف الرقم — تحويله لصيغة دولية
    let cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '+966' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('5')) cleanPhone = '+966' + cleanPhone;
    else if (!cleanPhone.startsWith('+')) cleanPhone = '+966' + cleanPhone;

    try {
      const res = await fetch(`${this.baseUrl}/send-otp`, {
        method: 'POST',
        headers: {
          'X-Authorization': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'sms',
          phone: cleanPhone,
          template_id: 1,
        }),
      });

      const data = await res.json();
      console.log(`📱 Authentica sendOTP to ${cleanPhone}:`, data);

      if (res.ok) {
        return { success: true, phone: cleanPhone };
      }
      return { success: false, message: data.message || 'فشل إرسال الرمز' };
    } catch (err) {
      console.error('Authentica sendOTP error:', err.message);
      return { success: false, message: 'خطأ في الاتصال بخدمة الرسائل' };
    }
  }

  async verifyOTP(phone, otp) {
    if (!this.apiKey) {
      return { success: false, devMode: true };
    }

    let cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '+966' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('5')) cleanPhone = '+966' + cleanPhone;
    else if (!cleanPhone.startsWith('+')) cleanPhone = '+966' + cleanPhone;

    try {
      const res = await fetch(`${this.baseUrl}/verify-otp`, {
        method: 'POST',
        headers: {
          'X-Authorization': this.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: otp,
        }),
      });

      const data = await res.json();
      console.log(`✅ Authentica verifyOTP for ${cleanPhone}:`, data);

      if (res.ok) {
        return { success: true };
      }
      return { success: false, message: data.message || 'رمز التحقق غير صحيح' };
    } catch (err) {
      console.error('Authentica verifyOTP error:', err.message);
      return { success: false, message: 'خطأ في التحقق' };
    }
  }
}

module.exports = new AuthenticaService();
