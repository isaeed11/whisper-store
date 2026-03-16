const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Whisper' },
  siteTagline: { type: String, default: 'تأجير معدات تصوير احترافية' },
  siteDescription: { type: String, default: 'نوفر لك أحدث معدات التصوير الاحترافية بأسعار تأجير مناسبة.' },

  // الشعار
  logoType: { type: String, enum: ['text', 'image'], default: 'text' },
  logoText: { type: String, default: 'WHISPER' },
  logoImage: { type: String, default: '' },

  // الألوان
  accentColor: { type: String, default: '#c8a97e' },
  bgColor: { type: String, default: '#0a0a0a' },
  cardColor: { type: String, default: '#111111' },
  textColor: { type: String, default: '#f0ece4' },

  // البنر الرئيسي
  heroTitle: { type: String, default: 'التقط اللحظة مع Whisper' },
  heroSubtitle: { type: String, default: 'نوفر لك أحدث معدات التصوير الاحترافية بأسعار تأجير مناسبة. كل ما تحتاجه لمشروعك القادم.' },
  heroTag: { type: String, default: 'خدمة تأجير معدات تصوير احترافية في الدمام' },
  heroBgImage: { type: String, default: '' },
  heroBgOverlay: { type: Number, default: 0.7 },

  // التواصل
  phone: { type: String, default: '+966 5X XXX XXXX' },
  email: { type: String, default: 'info@whisper-rental.com' },
  address: { type: String, default: 'الدمام، المنطقة الشرقية' },
  workingHours: { type: String, default: 'السبت - الخميس: 9 ص - 10 م' },
  instagram: { type: String, default: '@whisper.rental' },
  instagramUrl: { type: String, default: 'https://instagram.com/whisper.rental' },
  whatsapp: { type: String, default: '' },
  tiktok: { type: String, default: '' },
  twitter: { type: String, default: '' },
  googleMapsUrl: { type: String, default: '' },

  features: [{ icon: String, title: String, desc: String }],

  // SEO
  seoTitle: { type: String, default: 'Whisper — تأجير معدات تصوير احترافية في الدمام والمنطقة الشرقية' },
  seoDescription: { type: String, default: 'ويسبر لتأجير معدات التصوير الاحترافية في الدمام والسعودية.' },
  seoKeywords: { type: String, default: 'تأجير معدات تصوير الدمام, تأجير كاميرات السعودية, إيجار عدسات احترافية, rent camera equipment Dammam' },

  footerText: { type: String, default: '© 2026 Whisper — جميع الحقوق محفوظة' },
  currency: { type: String, default: 'ر.س' },
  defaultDeposit: { type: Number, default: 200 },
  minRentalDays: { type: Number, default: 1 },
  termsText: { type: String, default: '' },
  aboutText: { type: String, default: '' },
  announcementBar: { type: String, default: '' },
  whatsappNotify: { type: Boolean, default: false },
  whatsappNotifyNumber: { type: String, default: '' },

  // النافبار
  navLinks: [{
    label: String,
    page: { type: String, default: '' }, // home, products, reviews, contact, about, terms, أو slug صفحة مخصصة
    url: { type: String, default: '' }, // رابط خارجي (اختياري)
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  }],

  // الفوتر
  footerLinks: [{
    label: String,
    page: { type: String, default: '' },
    url: { type: String, default: '' },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  }],
  footerDescription: { type: String, default: '' },
  showSocialInFooter: { type: Boolean, default: true },

  // ترتيب أقسام الصفحة الرئيسية
  homeSections: [{
    id: { type: String },
    label: { type: String },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  }],

  maintenanceMode: { type: Boolean, default: false },
}, { timestamps: true });

settingsSchema.statics.get = async function() {
  let s = await this.findOne();
  if (!s) {
    s = await this.create({
      features: [
        { icon: '🚀', title: 'توصيل سريع', desc: 'نوصل لك في نفس اليوم' },
        { icon: '🛡️', title: 'تأمين شامل', desc: 'معداتك مؤمنة بالكامل' },
        { icon: '💎', title: 'جودة عالية', desc: 'أحدث الموديلات فقط' },
        { icon: '📞', title: 'دعم متواصل', desc: 'فريق دعم على مدار الساعة' },
      ],
      navLinks: [
        { label: 'الرئيسية', page: 'home', order: 0, visible: true },
        { label: 'المعدات', page: 'products', order: 1, visible: true },
        { label: 'التقييمات', page: 'reviews', order: 2, visible: true },
        { label: 'تواصل معنا', page: 'contact', order: 3, visible: true },
      ],
      footerLinks: [
        { label: 'الرئيسية', page: 'home', order: 0, visible: true },
        { label: 'المعدات', page: 'products', order: 1, visible: true },
        { label: 'التقييمات', page: 'reviews', order: 2, visible: true },
        { label: 'تواصل معنا', page: 'contact', order: 3, visible: true },
      ],
      homeSections: [
        { id: 'hero', label: 'البنر الرئيسي', visible: true, order: 0 },
        { id: 'features', label: 'شريط المميزات', visible: true, order: 1 },
        { id: 'products', label: 'المعدات', visible: true, order: 2 },
      ],
    });
  }
  // ضمان وجود القيم الافتراضية
  if (!s.navLinks || !s.navLinks.length) {
    s.navLinks = [
      { label: 'الرئيسية', page: 'home', order: 0, visible: true },
      { label: 'المعدات', page: 'products', order: 1, visible: true },
      { label: 'التقييمات', page: 'reviews', order: 2, visible: true },
      { label: 'تواصل معنا', page: 'contact', order: 3, visible: true },
    ];
    await s.save();
  }
  if (!s.homeSections || !s.homeSections.length) {
    s.homeSections = [
      { id: 'hero', label: 'البنر الرئيسي', visible: true, order: 0 },
      { id: 'features', label: 'شريط المميزات', visible: true, order: 1 },
      { id: 'products', label: 'المعدات', visible: true, order: 2 },
    ];
    await s.save();
  }
  return s;
};

module.exports = mongoose.model('Settings', settingsSchema);
