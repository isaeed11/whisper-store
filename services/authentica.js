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
    let cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '+966' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('5')) cleanPhone = '+966' + cleanPhone;
    else if (cleanPhone.startsWith('966')) cleanPhone = '+' + cleanPhone;
    else if (!cleanPhone.startsWith('+')) cleanPhone = '+966' + cleanPhone;

    console.log(`📱 Authentica: Sending OTP to ${cleanPhone}`);

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
        }),
      });

      const text = await res.text();
      console.log(`📱 Authentica Response (${res.status}):`, text);

      let data;
      try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

      if (res.ok || res.status === 200 || res.status === 201) {
        return { success: true, phone: cleanPhone };
      }
      return { success: false, message: data.message || data.error || 'فشل إرسال الرمز — كود: ' + res.status };
    } catch (err) {
      console.error('Authentica sendOTP error:', err.message);
      return { success: false, message: 'خطأ في الاتصال بخدمة الرسائل: ' + err.message };
    }
  }

  async verifyOTP(phone, otp) {
    if (!this.apiKey) {
      return { success: false, devMode: true };
    }

    let cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '+966' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('5')) cleanPhone = '+966' + cleanPhone;
    else if (cleanPhone.startsWith('966')) cleanPhone = '+' + cleanPhone;
    else if (!cleanPhone.startsWith('+')) cleanPhone = '+966' + cleanPhone;

    console.log(`✅ Authentica: Verifying OTP for ${cleanPhone}`);

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
          otp: String(otp),
        }),
      });

      const text = await res.text();
      console.log(`✅ Authentica Verify Response (${res.status}):`, text);

      let data;
      try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

      if (res.ok || res.status === 200) {
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
