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
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 86400000 },
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
app.listen(PORT, () => {
  console.log(`\n🎯 WHISPER v3.0`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   لوحة التحكم: http://localhost:${PORT}/admin\n`);
});
