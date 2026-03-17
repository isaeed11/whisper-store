require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Settings = require('./models/Settings');

const app = express();
connectDB();

// Trust proxy for Railway HTTPS
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'whisper-default-secret',
  resave: false, saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, ttl: 86400 }),
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 86400000, sameSite: 'lax' },
}));

app.get('/sitemap.xml', async (req, res) => {
  const products = await Product.find({ available: true });
  const base = `${req.protocol}://${req.get('host')}`;
  let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`;
  products.forEach(p => xml += `<url><loc>${base}/product/${p._id}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
  xml += '</urlset>';
  res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
});

app.use('/', require('./routes/store'));
app.use('/', require('./routes/customer'));
app.use('/', require('./routes/payment'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).send('<div style="text-align:center;padding:100px;font-family:sans-serif;background:#0a0a0a;color:#f0ece4;min-height:100vh;"><h1 style="font-size:6rem;color:#c8a97e;">404</h1><p>الصفحة غير موجودة</p><a href="/" style="color:#c8a97e;">← الرئيسية</a></div>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n🎯 WHISPER v3.0`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   لوحة التحكم: http://localhost:${PORT}/admin\n`);

  // Auto-seed: لو ما فيه أدمن، ننشئ البيانات الأولية تلقائياً
  try {
    const Admin = require('./models/Admin');
    const Review = require('./models/Review');
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log('🌱 أول تشغيل — جاري إنشاء البيانات الأولية...');

      // إنشاء الأدمن
      await Admin.create({
        email: process.env.ADMIN_EMAIL || 'admin@whisper-rental.com',
        password: process.env.ADMIN_PASSWORD || 'Whisper@2026',
        name: 'مدير Whisper',
      });
      console.log('✅ حساب المدير تم إنشاؤه');

      // إنشاء المنتجات
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        await Product.create([
          { name: 'كاميرا سوني الفا 7 IV', category: 'equipment', icon: '📷', specs: 'إطار كامل | غير عاكسة | عدسات قابلة للتبديل', description: 'كاميرا سوني الفا 7 IV بإطار كامل غير عاكسة.', pricePerDay: 350, rating: 4.9, featured: true },
          { name: 'عدسة سوني FE 24-70mm F2.8 GM II', category: 'equipment', icon: '🔭', specs: 'الجيل الجديد | F2.8 | G ماستر زووم', description: 'عدسة سوني FE 24-70 ملم F2.8 GM II.', pricePerDay: 200, rating: 4.9, featured: true },
          { name: 'فلاش نيوير NW700-S TTL', category: 'equipment', icon: '⚡', specs: 'TTL | 1/8000 ثانية | متوافق مع سوني', description: 'نيوير فلاش سبيدلايت NW700-S TTL.', pricePerDay: 80, rating: 4.7, featured: true },
          { name: 'ميكروفون DJI Mini', category: 'equipment', icon: '🎙️', specs: 'TX + 1 RX2 | لاسلكي', description: 'ميكروفون دي جي آي ميني لاسلكي.', pricePerDay: 100, rating: 4.8, featured: true },
          { name: 'عاكس إضاءة للتصوير', category: 'equipment', icon: '💡', specs: 'عاكس وجه | متعدد الاستخدامات', description: 'عاكس إضاءة للتصوير الوجه.', pricePerDay: 40, rating: 4.6 },
          { name: 'خلفية ورق', category: 'equipment', icon: '🖼️', specs: 'خلفية استوديو | ورق', description: 'خلفية ورق احترافية للاستوديو.', pricePerDay: 50, rating: 4.5 },
          { name: 'منزلق كاميرا دوار 360°', category: 'equipment', icon: '🔄', specs: '360 درجة | قرص دوار احترافي', description: 'منزلق كاميرا دوار 360 درجة.', pricePerDay: 70, rating: 4.7 },
          { name: 'حامل ثلاثي القوائم 170 سم', category: 'equipment', icon: '📐', specs: '170 سم | 360 درجة | تحكم عن بعد', description: 'حامل ثلاثي القوائم للكاميرا 170 سم.', pricePerDay: 60, rating: 4.8 },
        ]);
        console.log('✅ 8 معدات تم إنشاؤها');
      }

      // إنشاء التقييمات
      const reviewCount = await Review.countDocuments();
      if (reviewCount === 0) {
        await Review.create([
          { name: 'أحمد الشمري', rating: 5, text: 'تجربة ممتازة! المعدات كانت بحالة ممتازة.' },
          { name: 'سارة القحطاني', rating: 5, text: 'أفضل خدمة تأجير معدات تصوير جربتها.' },
          { name: 'خالد المالكي', rating: 4, text: 'معدات نظيفة واحترافية. الأسعار مناسبة.' },
        ]);
        console.log('✅ 3 تقييمات تم إنشاؤها');
      }

      // إنشاء الإعدادات
      await Settings.get();
      console.log('✅ إعدادات الموقع تم إنشاؤها');
      console.log('🎉 البيانات الأولية جاهزة!\n');
    }
  } catch (err) { console.error('خطأ في Auto-seed:', err.message); }
});
