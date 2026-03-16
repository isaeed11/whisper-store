# 🎯 دليل تشغيل متجر Whisper — خطوة بخطوة

## مقدمة
هذا الدليل يشرح لك بالتفصيل كيف تشغّل متجر Whisper على جهازك ثم تنشره على الإنترنت.
لا يحتاج أي خبرة برمجية سابقة — فقط اتبع الخطوات.

---

## 📁 هيكلة المشروع

```
whisper/
├── server.js              ← السيرفر الرئيسي
├── seed.js                ← ملء قاعدة البيانات ببيانات أولية
├── package.json           ← الحزم والاعتماديات
├── .env                   ← إعدادات البيئة (سري)
├── .gitignore
├── config/
│   └── db.js              ← إعدادات الاتصال بقاعدة البيانات
├── models/
│   ├── Product.js          ← نموذج المنتجات
│   ├── Order.js            ← نموذج الطلبات
│   ├── Review.js           ← نموذج التقييمات
│   ├── Message.js          ← نموذج الرسائل
│   └── Admin.js            ← نموذج حساب المدير
├── middleware/
│   └── auth.js             ← التحقق من صلاحيات المدير
├── routes/
│   ├── store.js            ← مسارات المتجر + API
│   └── admin.js            ← مسارات لوحة التحكم
├── views/
│   ├── store.ejs           ← واجهة المتجر الرئيسية
│   └── admin/
│       ├── login.ejs       ← صفحة تسجيل الدخول
│       ├── dashboard.ejs   ← لوحة التحكم الرئيسية
│       ├── products.ejs    ← إدارة المنتجات
│       ├── orders.ejs      ← إدارة الطلبات
│       ├── reviews.ejs     ← إدارة التقييمات
│       └── messages.ejs    ← إدارة الرسائل
└── public/                 ← ملفات ثابتة (صور، إلخ)
```

---

## الخطوة 1: تثبيت الأدوات المطلوبة

### 1.1 — تثبيت Node.js
هذا هو المحرك اللي يشغّل السيرفر.

1. روح لموقع: https://nodejs.org
2. حمّل النسخة **LTS** (الأكثر استقراراً)
3. ثبّته بالطريقة العادية (Next → Next → Install)
4. تأكد من التثبيت بفتح **Terminal** (ماك) أو **Command Prompt** (ويندوز) واكتب:
```bash
node --version
npm --version
```
لازم يطلع لك رقم إصدار لكل واحد.

### 1.2 — تثبيت MongoDB
هذي قاعدة البيانات اللي تحفظ المنتجات والطلبات.

**الخيار A — MongoDB Atlas (سحابي، مجاني، الأسهل):**
1. روح لموقع: https://www.mongodb.com/atlas
2. سجّل حساب مجاني
3. أنشئ Cluster جديد (اختر Free Tier)
4. أنشئ Database User (سجّل اليوزرنيم والباسورد)
5. في Network Access، أضف `0.0.0.0/0` (للسماح بالاتصال من أي مكان)
6. اضغط "Connect" → "Connect your application"
7. انسخ رابط الاتصال اللي يبدأ بـ `mongodb+srv://...`

**الخيار B — MongoDB محلي:**
1. حمّل من: https://www.mongodb.com/try/download/community
2. ثبّته على جهازك
3. الرابط بيكون: `mongodb://localhost:27017/whisper`

---

## الخطوة 2: إعداد المشروع

### 2.1 — فك الضغط وفتح المجلد
فك ضغط مجلد `whisper` في أي مكان على جهازك.

### 2.2 — فتح Terminal في مجلد المشروع
- **ويندوز**: افتح المجلد → اضغط على شريط العنوان → اكتب `cmd` → Enter
- **ماك**: كلك يمين على المجلد → "New Terminal at Folder"

### 2.3 — تثبيت الحزم
```bash
npm install
```
انتظر حتى ينتهي (يأخذ دقيقة أو دقيقتين).

### 2.4 — إعداد ملف البيئة (.env)
افتح ملف `.env` بأي محرر نصوص وعدّل:

```
# غيّر الرابط لرابط MongoDB Atlas حقك:
MONGODB_URI=mongodb+srv://اليوزرنيم:الباسورد@cluster.xxxxx.mongodb.net/whisper

# غيّر هذا لأي نص عشوائي طويل:
SESSION_SECRET=اكتب_اي_نص_طويل_وعشوائي_هنا_123

# بيانات حساب المدير (غيّرها):
ADMIN_EMAIL=admin@whisper-rental.com
ADMIN_PASSWORD=كلمة_مرور_قوية
```

### 2.5 — ملء قاعدة البيانات
```bash
npm run seed
```
هذا الأمر يضيف 14 منتج + 5 تقييمات + حساب المدير.

---

## الخطوة 3: تشغيل المتجر محلياً

```bash
npm run dev
```

بتشوف رسالة:
```
🎯 ═══════════════════════════════════════
   WHISPER متجر
   السيرفر شغّال على: http://localhost:3000
   لوحة التحكم: http://localhost:3000/admin
═══════════════════════════════════════
```

افتح المتصفح:
- **المتجر**: http://localhost:3000
- **لوحة التحكم**: http://localhost:3000/admin

سجّل دخول بالبيانات اللي حطيتها في `.env`

---

## الخطوة 4: نشر المتجر على الإنترنت (Deploy)

### الخيار المُوصى: Railway (مجاني + سهل)

1. **سجّل حساب**: https://railway.app (سجّل بحساب GitHub)

2. **ارفع المشروع على GitHub**:
   - سجّل حساب في https://github.com
   - حمّل GitHub Desktop: https://desktop.github.com
   - أنشئ Repository جديد
   - ارفع مجلد whisper كامل

3. **ربط Railway بـ GitHub**:
   - في Railway، اضغط "New Project"
   - اختر "Deploy from GitHub repo"
   - اختر مشروع whisper

4. **إضافة MongoDB**:
   - في Railway، اضغط "+ New" → "Database" → "MongoDB"
   - انسخ رابط الاتصال MONGODB_URI

5. **إضافة Environment Variables**:
   - في إعدادات المشروع على Railway
   - أضف نفس القيم اللي في ملف `.env`:
     - `MONGODB_URI` = رابط MongoDB من Railway
     - `SESSION_SECRET` = نص عشوائي
     - `ADMIN_EMAIL` = إيميل المدير
     - `ADMIN_PASSWORD` = كلمة المرور
     - `NODE_ENV` = production

6. **Deploy**:
   - Railway بيعطيك رابط مثل: `whisper-production.up.railway.app`
   - هذا رابط متجرك على الإنترنت!

### ربط دومين مخصص (اختياري):

1. اشترِ دومين من:
   - https://www.namecheap.com
   - https://www.godaddy.com
   - مثال: `whisper-rental.com`

2. في Railway → Settings → Custom Domain
   - أضف الدومين حقك
   - غيّر DNS Settings في مسجّل الدومين حسب تعليمات Railway

---

## الخطوة 5: إدارة المتجر

### لوحة التحكم تتيح لك:

| القسم | الوظيفة |
|-------|---------|
| 📊 الرئيسية | إحصائيات عامة + آخر الطلبات |
| 📷 المنتجات | إضافة / تعديل / حذف المعدات |
| 📦 الطلبات | إدارة حالة الطلبات (معلق → مؤكد → نشط → مُرجع) |
| ⭐ التقييمات | إظهار / إخفاء / حذف التقييمات |
| ✉️ الرسائل | قراءة رسائل العملاء |

---

## 📋 واجهات API المتاحة

| المسار | النوع | الوظيفة |
|--------|-------|---------|
| `GET /api/products` | عام | جلب كل المنتجات |
| `GET /api/products?category=cameras` | عام | فلترة بالقسم |
| `GET /api/products/:id` | عام | منتج واحد |
| `POST /api/orders` | عام | إنشاء طلب جديد |
| `GET /api/orders/:orderId` | عام | تتبع طلب |
| `GET /api/reviews` | عام | جلب التقييمات |
| `POST /api/reviews` | عام | إضافة تقييم |
| `POST /api/messages` | عام | إرسال رسالة تواصل |

---

## 🔧 حل المشاكل الشائعة

### "Cannot connect to MongoDB"
- تأكد إن رابط MONGODB_URI صحيح في `.env`
- لو Atlas: تأكد إن IP حقك مضاف في Network Access

### "Port 3000 already in use"
- غيّر المنفذ في `.env`: `PORT=4000`

### الصفحة ما تشتغل
- تأكد إنك شغّلت `npm install` أول
- تأكد إنك شغّلت `npm run seed` عشان البيانات

### نسيت كلمة مرور الأدمن
- غيّرها في `.env` ثم شغّل `npm run seed` مرة ثانية

---

## 🚀 خطوات إضافية متقدمة (اختياري)

- **بوابة دفع**: أضف Moyasar أو Tap Payments للدفع الإلكتروني
- **إشعارات**: أضف Twilio لإرسال SMS عند تأكيد الطلب
- **صور المنتجات**: أضف Cloudinary لرفع صور حقيقية للمعدات
- **SSL**: Railway يوفر HTTPS تلقائياً
- **نطاق سعودي**: اشترِ `.sa` من https://nic.sa

---

**مبروك! 🎉 متجر Whisper جاهز للعمل.**
لو عندك أي سؤال، لا تتردد تسأل!
