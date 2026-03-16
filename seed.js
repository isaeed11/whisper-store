require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Review = require('./models/Review');
const Admin = require('./models/Admin');
const Settings = require('./models/Settings');

const seedData = async () => {
  await connectDB();

  console.log('🗑️  حذف البيانات القديمة...');
  await Product.deleteMany({});
  await Review.deleteMany({});
  await Admin.deleteMany({});
  await Settings.deleteMany({});

  console.log('📷 إضافة المنتجات...');
  await Product.create([
    {
      name: 'كاميرا سوني الفا 7 IV',
      category: 'equipment',
      icon: '📷',
      specs: 'إطار كامل | غير عاكسة | عدسات قابلة للتبديل',
      description: 'كاميرا سوني الفا 7 IV بإطار كامل غير عاكسة مع عدسات قابلة للتبديل، أسود.',
      pricePerDay: 350,
      rating: 4.9,
      available: true,
      featured: true,
    },
    {
      name: 'عدسة سوني FE 24-70mm F2.8 GM II',
      category: 'equipment',
      icon: '🔭',
      specs: 'الجيل الجديد | F2.8 | G ماستر زووم',
      description: 'عدسة كاميرا سوني FE 24-70 ملم F2.8 GM II الجيل الجديد F2.8 G ماستر زووم بلون أسود، إصدار المملكة العربية السعودية.',
      pricePerDay: 200,
      rating: 4.9,
      available: true,
      featured: true,
    },
    {
      name: 'فلاش نيوير NW700-S TTL',
      category: 'equipment',
      icon: '⚡',
      specs: 'TTL | 1/8000 ثانية | متوافق مع سوني',
      description: 'نيوير فلاش سبيدلايت NW700-S TTL متوافق مع كاميرات سوني، مزامنة عالية السرعة 1/8000 ثانية، مخرج 1/1-1/256، فلاش طاقة كاملة 230.',
      pricePerDay: 80,
      rating: 4.7,
      available: true,
      featured: true,
    },
    {
      name: 'ميكروفون DJI Mini',
      category: 'equipment',
      icon: '🎙️',
      specs: 'TX + 1 RX2 | لاسلكي',
      description: 'ميكروفون دي جي آي ميني لاسلكي (TX + 1 RX2)، مثالي لتصوير الفيديو والمقابلات.',
      pricePerDay: 100,
      rating: 4.8,
      available: true,
      featured: true,
    },
    {
      name: 'عاكس إضاءة للتصوير',
      category: 'equipment',
      icon: '💡',
      specs: 'عاكس وجه | متعدد الاستخدامات',
      description: 'عاكس إضاءة للتصوير الوجه، يوفر إضاءة ناعمة ومتساوية للبورتريه والتصوير الاحترافي.',
      pricePerDay: 40,
      rating: 4.6,
      available: true,
    },
    {
      name: 'خلفية ورق',
      category: 'equipment',
      icon: '🖼️',
      specs: 'خلفية استوديو | ورق',
      description: 'خلفية ورق احترافية للاستوديو، مثالية لتصوير البورتريه والمنتجات.',
      pricePerDay: 50,
      rating: 4.5,
      available: true,
    },
    {
      name: 'منزلق كاميرا دوار 360°',
      category: 'equipment',
      icon: '🔄',
      specs: '360 درجة | قرص دوار احترافي | زاوية قابلة للتعديل',
      description: 'منزلق كاميرا دوار 360 درجة، قرص دوار احترافي للتصوير الفوتوغرافي، زاوية قابلة للتعديل، منصة بانورامية، ثبات كاميرا الفيديو لصانعي الفيديو ويوتيوب.',
      pricePerDay: 70,
      rating: 4.7,
      available: true,
    },
    {
      name: 'حامل ثلاثي القوائم 170 سم',
      category: 'equipment',
      icon: '📐',
      specs: '170 سم | 360 درجة | تحكم عن بعد',
      description: 'حامل ثلاثي القوائم للكاميرا 170 سم 360 درجة للتصوير البانورامي مع شنطة سفر، حامل ثلاثي قوي مع جهاز تحكم عن بعد لاسلكي، يدعم DSLR/بروجكتور/كاميرا ويب من ايوسين.',
      pricePerDay: 60,
      rating: 4.8,
      available: true,
    },
  ]);

  console.log('⭐ إضافة التقييمات...');
  await Review.create([
    { name: 'أحمد الشمري', rating: 5, text: 'تجربة ممتازة! المعدات كانت بحالة ممتازة والتوصيل سريع جداً.' },
    { name: 'سارة القحطاني', rating: 5, text: 'أفضل خدمة تأجير معدات تصوير جربتها. فريق الدعم متعاون.' },
    { name: 'خالد المالكي', rating: 4, text: 'معدات نظيفة واحترافية. الأسعار مناسبة مقارنة بالسوق.' },
    { name: 'نورة العتيبي', rating: 5, text: 'استأجرت كاميرا Sony A7IV لحفل زفاف وكانت النتيجة مذهلة!' },
    { name: 'فهد الدوسري', rating: 4, text: 'خدمة احترافية وسعر مناسب. أنصح فيهم بشدة.' },
  ]);

  console.log('⚙️ إنشاء إعدادات الموقع...');
  await Settings.create({
    features: [
      { icon: '🚀', title: 'توصيل سريع', desc: 'نوصل لك في نفس اليوم' },
      { icon: '🛡️', title: 'تأمين شامل', desc: 'معداتك مؤمنة بالكامل' },
      { icon: '💎', title: 'جودة عالية', desc: 'أحدث الموديلات فقط' },
      { icon: '📞', title: 'دعم متواصل', desc: 'فريق دعم على مدار الساعة' },
    ]
  });

  console.log('👤 إنشاء حساب المدير...');
  await Admin.create({
    email: process.env.ADMIN_EMAIL || 'admin@whisper-rental.com',
    password: process.env.ADMIN_PASSWORD || 'Whisper@2026',
    name: 'مدير Whisper',
  });

  console.log('\n✅ ═══════════════════════════════════');
  console.log('   تم تجهيز قاعدة البيانات!');
  console.log('   📷 8 معدات');
  console.log('   ⭐ 5 تقييمات');
  console.log('   ⚙️ إعدادات الموقع');
  console.log('   👤 حساب المدير');
  console.log('═══════════════════════════════════\n');
  process.exit(0);
};

seedData();
