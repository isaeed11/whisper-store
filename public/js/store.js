const cart = [];
let userRating = 0;
let loggedInUser = null;
let appliedCoupon = null, couponDiscount = 0;

async function api(url, method='GET', body=null) {
  try { const opts = { method, headers: { 'Content-Type': 'application/json' } }; if (body) opts.body = JSON.stringify(body); const res = await fetch(url, opts); return await res.json(); }
  catch (err) { console.error('API Error:', err); return { success: false, message: 'خطأ في الاتصال' }; }
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  window.scrollTo({ top: 0, behavior: 'smooth' }); closeMobileMenu();
  if (page === 'products') loadProducts();
  if (page === 'reviews') loadReviews();
  initRevealAnimations();
}
function toggleMobileMenu() { document.getElementById('navLinks').classList.toggle('mobile-open'); }
function closeMobileMenu() { document.getElementById('navLinks').classList.remove('mobile-open'); }

async function loadProducts() {
  const grid = document.getElementById('allProductsGrid');
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">جاري التحميل...</div>';
  const data = await api('/api/products');
  if (data.success) { grid.innerHTML = data.products.map(p => productCard(p)).join(''); initRevealAnimations(); }
}
function productCard(p) {
  const imgHtml = p.image ? `<img src="${p.image}" alt="تأجير ${p.name}" loading="lazy">` : p.icon;
  return `<div class="product-card reveal"><div class="product-img">${imgHtml}<span class="product-badge ${p.available?'badge-available':'badge-rented'}">${p.available?'متاح':'محجوز'}</span></div><div class="product-info"><h3>${p.name}</h3><div class="specs">${p.specs}</div><p style="font-size:0.83rem;color:var(--text-dim);margin-bottom:16px;">${p.description}</p><div class="product-pricing"><div class="product-price">${p.pricePerDay} ر.س <small>/ يوم</small></div><div class="product-rating">★ ${p.rating}</div></div><button class="btn btn-primary btn-sm btn-block" style="margin-top:16px;" onclick="openBooking('${p._id}','${p.name}','${p.icon}','${p.specs}',${p.pricePerDay},${p.deposit},'${p.image||''}')" ${!p.available?'disabled style="margin-top:16px;opacity:0.4;cursor:not-allowed;"':''}>${p.available?'📅 احجز الآن':'غير متاح حالياً'}</button></div></div>`;
}

let bookedDates=[], selectedStart=null, selectedEnd=null, calMonth=new Date().getMonth(), calYear=new Date().getFullYear(), bookingProduct={};
async function openBooking(id,name,icon,specs,price,deposit,image) {
  bookingProduct={id,name,icon,specs,price,deposit,image}; selectedStart=null; selectedEnd=null;
  calMonth=new Date().getMonth(); calYear=new Date().getFullYear();
  const data=await api(`/api/products/${id}/availability`); bookedDates=data.success?data.bookedDates:[];
  const imgHtml=image?`<img src="${image}" alt="${name}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;">`:`<span style="font-size:3rem;">${icon}</span>`;
  document.getElementById('bookingBody').innerHTML=`<div style="text-align:center;margin-bottom:20px;">${imgHtml}<h4 style="margin-top:8px;font-family:var(--font-display);font-weight:700;">${name}</h4><p style="color:var(--text-dim);font-size:0.85rem;">${specs}</p></div><p style="font-size:0.85rem;color:var(--text-dim);text-align:center;margin-bottom:16px;">اختر تاريخ الاستلام ثم تاريخ الإرجاع</p><div class="cal" id="bookingCal"></div><div class="cal-legend"><div class="cal-legend-item"><div class="dot dot-available"></div>متاح</div><div class="cal-legend-item"><div class="dot dot-booked"></div>محجوز</div><div class="cal-legend-item"><div class="dot dot-selected"></div>اختيارك</div></div><div id="selectedDatesInfo" style="display:none;margin-top:16px;"><div class="selected-dates"><div><div class="label">الاستلام</div><div class="value" id="dispStart">—</div></div><div><div class="label">الإرجاع</div><div class="value" id="dispEnd">—</div></div><div><div class="label">الأيام</div><div class="value" id="dispDays">0</div></div></div></div><div class="form-group" style="margin-top:16px;"><label>ملاحظات (اختياري)</label><textarea id="bookNotes" placeholder="أي متطلبات خاصة..."></textarea></div><div class="booking-summary"><div class="item"><span>سعر اليوم</span><span>${price} ر.س</span></div><div class="item"><span>عدد الأيام</span><span id="bookDays">0</span></div><div class="item"><span>تأمين (مسترد)</span><span>${deposit} ر.س</span></div><div class="item total"><span>الإجمالي</span><span id="bookTotal">0 ر.س</span></div></div><button class="btn btn-primary btn-block" id="addCartBtn" disabled style="opacity:0.4;cursor:not-allowed;" onclick="addToCartFromCal()">اختر التواريخ أولاً</button>`;
  renderCalendar(); document.getElementById('bookingModal').classList.add('active');
}
function renderCalendar() {
  const cal=document.getElementById('bookingCal'), firstDay=new Date(calYear,calMonth,1), lastDay=new Date(calYear,calMonth+1,0);
  const startDay=firstDay.getDay(), totalDays=lastDay.getDate(), today=new Date(); today.setHours(0,0,0,0);
  const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dayNames=['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];
  let html=`<div class="cal-header"><button onclick="changeMonth(-1)">→</button><h4>${months[calMonth]} ${calYear}</h4><button onclick="changeMonth(1)">←</button></div><div class="cal-grid">`;
  dayNames.forEach(d=>html+=`<div class="cal-day-name">${d}</div>`);
  for(let i=0;i<startDay;i++) html+='<div class="cal-day empty"></div>';
  for(let day=1;day<=totalDays;day++){const date=new Date(calYear,calMonth,day),dateStr=date.toISOString().split('T')[0];const isPast=date<today,isBooked=bookedDates.includes(dateStr),isToday=date.getTime()===today.getTime(),isSS=selectedStart&&dateStr===selectedStart,isSE=selectedEnd&&dateStr===selectedEnd,isRange=selectedStart&&selectedEnd&&dateStr>selectedStart&&dateStr<selectedEnd;let cls='cal-day';if(isPast)cls+=' disabled';else if(isBooked)cls+=' booked';else if(isSS||isSE)cls+=' selected';else if(isRange)cls+=' in-range';if(isToday)cls+=' today';html+=`<div class="${cls}" ${!isPast&&!isBooked?`onclick="selectDate('${dateStr}')"`:''}>${day}</div>`;}
  html+='</div>';cal.innerHTML=html;
}
function changeMonth(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function selectDate(dateStr){if(bookedDates.includes(dateStr))return;if(!selectedStart||(selectedStart&&selectedEnd)){selectedStart=dateStr;selectedEnd=null;}else{if(dateStr<=selectedStart){selectedStart=dateStr;selectedEnd=null;}else{if(bookedDates.some(bd=>bd>selectedStart&&bd<dateStr)){showToast('يوجد تاريخ محجوز بين التاريخين','error');selectedStart=dateStr;selectedEnd=null;}else{selectedEnd=dateStr;}}}renderCalendar();updateBookingSummary();}
function updateBookingSummary(){const info=document.getElementById('selectedDatesInfo'),btn=document.getElementById('addCartBtn'),{price,deposit}=bookingProduct;if(selectedStart&&selectedEnd){const days=Math.ceil((new Date(selectedEnd)-new Date(selectedStart))/86400000);document.getElementById('dispStart').textContent=formatDate(selectedStart);document.getElementById('dispEnd').textContent=formatDate(selectedEnd);document.getElementById('dispDays').textContent=days+' يوم';document.getElementById('bookDays').textContent=days;document.getElementById('bookTotal').textContent=(price*days+deposit)+' ر.س';info.style.display='block';btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.textContent='أضف للسلة';}else if(selectedStart){document.getElementById('dispStart').textContent=formatDate(selectedStart);document.getElementById('dispEnd').textContent='اختر تاريخ الإرجاع';document.getElementById('dispDays').textContent='—';document.getElementById('bookDays').textContent='0';document.getElementById('bookTotal').textContent='0 ر.س';info.style.display='block';btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='not-allowed';btn.textContent='اختر تاريخ الإرجاع';}else{info.style.display='none';btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='not-allowed';btn.textContent='اختر التواريخ أولاً';}}
function formatDate(str){return new Date(str).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'});}
function addToCartFromCal(){if(!selectedStart||!selectedEnd)return;const{id,name,icon,price,deposit,image}=bookingProduct;if(cart.find(c=>c.productId===id)){showToast('هذه المعدة موجودة بالفعل في السلة','error');return;}const days=Math.ceil((new Date(selectedEnd)-new Date(selectedStart))/86400000);cart.push({productId:id,name,icon,image,price,days,total:price*days,start:selectedStart,end:selectedEnd,deposit,notes:document.getElementById('bookNotes').value});closeBooking();updateCartUI();showToast('تمت الإضافة للسلة ✓','success');}
function closeBooking(){document.getElementById('bookingModal').classList.remove('active');}

function removeFromCart(id){const i=cart.findIndex(c=>c.productId===id);if(i>-1)cart.splice(i,1);updateCartUI();showToast('تم الحذف','error');}
function updateCartUI(){const badge=document.getElementById('cartBadge');badge.textContent=cart.length;badge.classList.toggle('show',cart.length>0);const itemsEl=document.getElementById('cartItems'),footerEl=document.getElementById('cartFooter');if(!cart.length){itemsEl.innerHTML='<div class="cart-empty"><div class="icon">🛒</div><p>السلة فارغة</p></div>';footerEl.style.display='none';return;}footerEl.style.display='block';let total=0;itemsEl.innerHTML=cart.map(item=>{total+=item.total+item.deposit;const ic=item.image?`<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;">`:item.icon;return`<div class="cart-item"><div class="cart-item-icon">${ic}</div><div class="cart-item-info"><h4>${item.name}</h4><p>${item.days} يوم • ${item.start}</p></div><div class="cart-item-price">${item.total+item.deposit} ر.س</div><button class="cart-item-remove" onclick="removeFromCart('${item.productId}')">✕</button></div>`;}).join('');document.getElementById('cartTotal').textContent=total+' ر.س';}
function toggleCart(){document.getElementById('cartOverlay').classList.toggle('active');document.getElementById('cartSidebar').classList.toggle('active');}

function openCheckout(){
  if(!cart.length)return; toggleCart(); appliedCoupon=null; couponDiscount=0;
  let total=cart.reduce((s,i)=>s+i.total+i.deposit,0);
  let subtotal=cart.reduce((s,i)=>s+i.total,0);
  let depositTotal=cart.reduce((s,i)=>s+i.deposit,0);
  let items=cart.map(i=>`<div class="item"><span>${i.name} (${i.days} يوم)</span><span>${i.total} ر.س</span></div>`).join('');
  const u=loggedInUser||{};
  document.getElementById('checkoutBody').innerHTML=`
    ${loggedInUser?`<div style="background:var(--accent-glow);border:1px solid var(--accent);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px;"><span style="font-size:1.3rem;">✅</span><div><div style="font-size:0.85rem;font-weight:700;">مرحباً ${u.name||u.phone}</div><div style="font-size:0.75rem;color:var(--text-dim);">بياناتك معبّأة تلقائياً</div></div></div>`:`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;"><span style="font-size:0.85rem;color:var(--text-dim);">عندك حساب؟</span><button class="btn btn-sm btn-outline" onclick="closeCheckout();openLogin()">تسجيل دخول</button></div>`}
    <h4 style="margin-bottom:20px;font-family:var(--font-display);font-weight:700;">معلومات المستأجر</h4>
    <div class="form-group"><label>الاسم</label><input type="text" id="checkName" value="${u.name||''}" placeholder="الاسم الكامل"></div>
    <div class="form-row"><div class="form-group"><label>الجوال</label><input type="tel" id="checkPhone" value="${u.phone||''}" placeholder="+966" style="direction:ltr;text-align:right;" ${loggedInUser?'readonly style="direction:ltr;text-align:right;opacity:0.7;"':''}></div><div class="form-group"><label>الإيميل</label><input type="email" id="checkEmail" value="${u.email||''}" placeholder="email@example.com" style="direction:ltr;text-align:right;"></div></div>
    <div class="form-group"><label>رقم الهوية</label><input type="text" id="checkId" value="${u.nationalId||''}" placeholder="رقم الهوية"></div>
    <div class="form-group"><label>عنوان التوصيل</label><textarea id="checkAddress" placeholder="المدينة، الحي...">${u.address||''}</textarea></div>
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:16px;margin:20px 0;">
      <label style="font-size:0.85rem;font-weight:600;color:var(--text-dim);margin-bottom:8px;display:block;">🏷️ كود خصم</label>
      <div style="display:flex;gap:8px;">
        <input type="text" id="couponInput" placeholder="مثال: WELCOME20" style="flex:1;text-transform:uppercase;direction:ltr;text-align:right;font-weight:700;letter-spacing:2px;padding:12px 16px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:0.9rem;">
        <button type="button" class="btn btn-sm btn-primary" onclick="applyCoupon()" style="white-space:nowrap;padding:12px 20px;">تطبيق</button>
      </div>
      <div id="couponMsg" style="margin-top:8px;font-size:0.85rem;"></div>
    </div>
    <div class="booking-summary">
      <h4 style="margin-bottom:12px;font-size:0.9rem;font-weight:700;">ملخص الطلب</h4>
      ${items}
      <div class="item"><span>تأمين (مسترد)</span><span>${depositTotal} ر.س</span></div>
      <div class="item" id="discountRow" style="display:none;color:var(--success);"><span>الخصم</span><span id="discountAmount">0</span></div>
      <div class="item total"><span>الإجمالي</span><span id="checkoutTotal">${total} ر.س</span></div>
    </div>
    <div class="form-group"><label>طريقة الدفع</label><select id="checkPayment"><option value="bank">تحويل بنكي</option><option value="card">بطاقة ائتمانية</option><option value="cash">دفع عند الاستلام</option><option value="stc">STC Pay</option></select></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:0.85rem;color:var(--text-dim);margin-bottom:20px;cursor:pointer;"><input type="checkbox" id="checkTerms"> أوافق على الشروط والأحكام</label>
    <button class="btn btn-primary btn-block" onclick="placeOrder()">تأكيد الحجز ✓</button>`;
  document.getElementById('checkoutModal').classList.add('active');
}
function closeCheckout(){document.getElementById('checkoutModal').classList.remove('active');}
async function placeOrder(){const name=document.getElementById('checkName').value.trim(),phone=document.getElementById('checkPhone').value.trim(),terms=document.getElementById('checkTerms').checked;if(!name||!phone){showToast('الرجاء تعبئة الاسم والجوال','error');return;}if(!terms){showToast('الرجاء الموافقة على الشروط','error');return;}if(loggedInUser){await api('/api/auth/update-profile','POST',{name,email:document.getElementById('checkEmail').value,nationalId:document.getElementById('checkId').value,address:document.getElementById('checkAddress').value});}const data=await api('/api/orders','POST',{items:cart.map(c=>({productId:c.productId,days:c.days,startDate:c.start,endDate:c.end,notes:c.notes})),customer:{name,phone,email:document.getElementById('checkEmail').value,nationalId:document.getElementById('checkId').value,address:document.getElementById('checkAddress').value},paymentMethod:document.getElementById('checkPayment').value,couponCode:appliedCoupon?appliedCoupon.code:''});if(data.success){cart.length=0;updateCartUI();document.getElementById('checkoutBody').innerHTML=`<div style="text-align:center;padding:40px 20px;"><div style="font-size:4rem;margin-bottom:20px;">🎉</div><h3 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;margin-bottom:12px;color:var(--success);">تم الحجز بنجاح!</h3><p style="color:var(--text-dim);margin-bottom:8px;">رقم الطلب</p><div style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--accent);background:var(--accent-glow);padding:12px 24px;border-radius:8px;display:inline-block;direction:ltr;letter-spacing:2px;">${data.orderId}</div><p style="color:var(--text-dim);margin-top:20px;font-size:0.9rem;">سنتواصل معك خلال ساعة</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:20px;">
      <button class="btn btn-primary btn-block" onclick="payOnline('${data.orderId}')">💳 ادفع إلكترونياً الحين</button>
      <button class="btn btn-outline btn-block" onclick="sendWhatsApp('${data.orderId}')">💬 أرسل تأكيد واتساب</button>
      <button class="btn btn-outline btn-block" onclick="closeCheckout()">الدفع لاحقاً</button>
    </div></div>`;}else{showToast(data.message||'خطأ','error');}}

// ═══ Payment ═══
async function payOnline(orderId) {
  const btn = event.target;
  btn.textContent = 'جاري التحويل...'; btn.disabled = true;
  const data = await api('/api/payment/create', 'POST', { orderId });
  if (data.success && data.paymentUrl) {
    window.location.href = data.paymentUrl;
  } else {
    showToast(data.message || 'خطأ في إنشاء الدفع', 'error');
    btn.textContent = '💳 ادفع إلكترونياً'; btn.disabled = false;
  }
}

// Handle payment return
function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const orderId = params.get('orderId');
  if (payment === 'success') {
    showToast('تم الدفع بنجاح! شكراً لك 🎉', 'success');
    if (orderId) { history.replaceState(null, '', '/'); }
  } else if (payment === 'cancelled') {
    showToast('تم إلغاء عملية الدفع', 'error');
    history.replaceState(null, '', '/');
  } else if (payment === 'pending') {
    showToast('الدفع قيد المعالجة — سيتم تأكيده قريباً', 'success');
    history.replaceState(null, '', '/');
  } else if (payment === 'error') {
    showToast('حدث خطأ في عملية الدفع', 'error');
    history.replaceState(null, '', '/');
  }
}

// ═══ WhatsApp ═══
async function sendWhatsApp(orderId) {
  const sData = await api('/api/settings');
  if (sData.success && sData.settings.whatsappNotify && sData.settings.whatsappNotifyNumber) {
    const num = sData.settings.whatsappNotifyNumber;
    const msg = encodeURIComponent('طلب جديد من متجر Whisper!\nرقم الطلب: ' + orderId + '\nالرجاء مراجعة لوحة التحكم.');
    window.open('https://wa.me/' + num + '?text=' + msg, '_blank');
  }
}

// ═══ Coupon ═══
let checkoutBaseTotal = 0;
async function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim();
  const msg = document.getElementById('couponMsg');
  if (!code) { msg.innerHTML = '<span style="color:var(--danger);">أدخل كود الكوبون</span>'; return; }
  checkoutBaseTotal = cart.reduce((s, i) => s + i.total, 0);
  const data = await api('/api/coupon/validate', 'POST', { code, orderAmount: checkoutBaseTotal, userPhone: loggedInUser?.phone || '' });
  if (data.success) {
    appliedCoupon = data.coupon;
    couponDiscount = data.discount;
    msg.innerHTML = `<span style="color:var(--success);">✅ ${data.coupon.type === 'percentage' ? data.coupon.value + '%' : data.coupon.value + ' ر.س'} خصم — وفّرت ${data.discount} ر.س</span>`;
    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('discountAmount').textContent = '- ' + data.discount + ' ر.س';
    const totalWithDeposit = checkoutBaseTotal - data.discount + cart.reduce((s, i) => s + i.deposit, 0);
    document.getElementById('checkoutTotal').textContent = totalWithDeposit + ' ر.س';
  } else {
    appliedCoupon = null; couponDiscount = 0;
    msg.innerHTML = `<span style="color:var(--danger);">❌ ${data.message}</span>`;
    document.getElementById('discountRow').style.display = 'none';
  }
}

async function loadReviews(){const data=await api('/api/reviews');if(data.success){document.getElementById('reviewsGrid').innerHTML=data.reviews.map(r=>`<div class="review-card reveal"><div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><div class="review-text">"${r.text}"</div><div class="review-author"><div class="review-avatar">${r.name.charAt(0)}</div><div class="review-author-info"><h4>${r.name}</h4><p>${new Date(r.createdAt).toLocaleDateString('ar-SA')}</p></div></div></div>`).join('');initRevealAnimations();}}
function setRating(n){userRating=n;document.querySelectorAll('#reviewStars span').forEach((s,i)=>{s.textContent=i<n?'★':'☆';s.style.color=i<n?'var(--accent)':'var(--text-muted)';});}
async function submitReview(){const name=document.getElementById('reviewName').value.trim(),text=document.getElementById('reviewText').value.trim();if(!name||!text||!userRating){showToast('الرجاء تعبئة جميع الحقول','error');return;}const data=await api('/api/reviews','POST',{name,rating:userRating,text});if(data.success){document.getElementById('reviewName').value='';document.getElementById('reviewText').value='';setRating(0);loadReviews();showToast('شكراً! تم إضافة تقييمك','success');}}
async function submitContact(){const name=document.getElementById('contactName').value.trim(),email=document.getElementById('contactEmail').value.trim(),message=document.getElementById('contactMessage').value.trim();if(!name||!email||!message){showToast('الرجاء تعبئة الحقول المطلوبة','error');return;}const data=await api('/api/messages','POST',{name,email,phone:document.getElementById('contactPhone').value,subject:document.getElementById('contactSubject').value,message});if(data.success){['contactName','contactEmail','contactPhone','contactMessage','contactSubject'].forEach(id=>document.getElementById(id).value='');showToast('تم إرسال رسالتك!','success');}}

function showToast(msg,type='success'){const c=document.getElementById('toastContainer'),t=document.createElement('div');t.className=`toast ${type}`;t.innerHTML=`<span class="toast-icon">${type==='success'?'✓':'✕'}</span>${msg}`;c.appendChild(t);setTimeout(()=>{t.style.animation='toastOut 0.4s forwards';setTimeout(()=>t.remove(),400)},3000);}
function initRevealAnimations(){const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}}),{threshold:0.1});document.querySelectorAll('.reveal:not(.visible)').forEach(el=>obs.observe(el));}
window.addEventListener('scroll',()=>document.getElementById('navbar').classList.toggle('scrolled',window.scrollY>50));
window.addEventListener('load',()=>{setTimeout(()=>document.getElementById('loader').classList.add('hidden'),1000);updateCartUI();initRevealAnimations();checkLoginStatus();checkPaymentReturn();});

async function checkLoginStatus(){const data=await api('/api/auth/me');if(data.success&&data.loggedIn){loggedInUser=data.customer;document.getElementById('accountBtn').style.borderColor='var(--accent)';document.getElementById('accountBtn').style.background='var(--accent-glow)';}}
function openLogin(){document.getElementById('loginBody').innerHTML=`<p style="color:var(--text-dim);font-size:0.9rem;margin-bottom:20px;text-align:center;">أدخل رقم جوالك وبنرسل لك رمز تحقق</p><div class="form-group"><label>رقم الجوال</label><input type="tel" id="loginPhone" placeholder="05XXXXXXXX" style="direction:ltr;text-align:right;font-size:1.1rem;letter-spacing:1px;" maxlength="15"></div><button class="btn btn-primary btn-block" onclick="sendOTP()">إرسال رمز التحقق</button>`;document.getElementById('loginModal').classList.add('active');}
function closeLogin(){document.getElementById('loginModal').classList.remove('active');}
async function sendOTP(){const phone=document.getElementById('loginPhone').value.trim();if(!phone||phone.length<10){showToast('أدخل رقم جوال صحيح','error');return;}const data=await api('/api/auth/send-otp','POST',{phone});if(data.success){const devMsg=data.devOtp?`<div style="background:rgba(109,181,109,0.1);border:1px solid rgba(109,181,109,0.3);border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;"><p style="font-size:0.8rem;color:var(--success);margin-bottom:4px;">وضع التطوير — الرمز:</p><div style="font-family:var(--font-display);font-size:2rem;font-weight:900;color:var(--accent);letter-spacing:8px;">${data.devOtp}</div></div>`:'';document.getElementById('loginBody').innerHTML=`<p style="color:var(--text-dim);font-size:0.9rem;margin-bottom:16px;text-align:center;">أدخل رمز التحقق المرسل إلى <strong style="color:var(--text);direction:ltr;">${phone}</strong></p>${devMsg}<div class="form-group"><label>رمز التحقق</label><input type="text" id="otpCode" placeholder="XXXX" style="direction:ltr;text-align:center;font-size:1.8rem;letter-spacing:12px;font-family:var(--font-display);font-weight:900;" maxlength="4"></div><button class="btn btn-primary btn-block" onclick="verifyOTP('${phone}')">تحقق</button><button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="openLogin()">← تغيير الرقم</button>`;setTimeout(()=>document.getElementById('otpCode')?.focus(),100);}else{showToast(data.message||'خطأ','error');}}
async function verifyOTP(phone){const otp=document.getElementById('otpCode').value.trim();if(!otp||otp.length!==4){showToast('أدخل الرمز المكوّن من 4 أرقام','error');return;}const data=await api('/api/auth/verify-otp','POST',{phone,otp});if(data.success){loggedInUser=data.customer;closeLogin();document.getElementById('accountBtn').style.borderColor='var(--accent)';document.getElementById('accountBtn').style.background='var(--accent-glow)';showToast('تم تسجيل الدخول! 🎉','success');if(!loggedInUser.name)setTimeout(()=>openProfileEdit(),500);}else{showToast(data.message||'رمز خاطئ','error');}}
function openAccountOrLogin(){if(loggedInUser)openAccount();else openLogin();}
async function openAccount(){const ordersData=await api('/api/auth/my-orders');const orders=ordersData.success?ordersData.orders:[];const statusMap={pending:'بانتظار التأكيد',confirmed:'مؤكد',active:'نشط',returned:'مُرجع',cancelled:'ملغي'};const statusColor={pending:'#d4a843',confirmed:'var(--success)',active:'#64a0ff',returned:'var(--accent)',cancelled:'var(--danger)'};let ordersHtml=!orders.length?'<div style="text-align:center;padding:30px;color:var(--text-dim);"><p style="font-size:2rem;margin-bottom:8px;">📦</p><p>لا توجد طلبات</p></div>':orders.map(o=>`<div style="background:var(--bg-elevated);border-radius:10px;padding:16px;margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-family:var(--font-display);font-weight:700;font-size:0.9rem;direction:ltr;">${o.orderId}</span><span style="padding:3px 10px;border-radius:12px;font-size:0.7rem;font-weight:700;background:${statusColor[o.status]}20;color:${statusColor[o.status]};">${statusMap[o.status]||o.status}</span></div>${o.items.map(item=>`<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;"><span>${item.productName}</span><span style="color:var(--text-dim);">${item.days} يوم</span></div>`).join('')}<div style="display:flex;justify-content:space-between;font-size:0.9rem;font-weight:700;padding-top:8px;margin-top:8px;border-top:1px solid var(--border);"><span>الإجمالي</span><span style="color:var(--accent);">${o.totalAmount+o.totalDeposit} ر.س</span></div></div>`).join('');document.getElementById('accountBody').innerHTML=`<div style="text-align:center;margin-bottom:24px;"><div style="width:60px;height:60px;border-radius:50%;background:var(--accent-glow);border:2px solid var(--accent);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:8px;">👤</div><h4 style="font-family:var(--font-display);font-weight:700;">${loggedInUser.name||'مستخدم جديد'}</h4><p style="color:var(--text-dim);font-size:0.85rem;direction:ltr;">${loggedInUser.phone}</p></div><div style="display:flex;gap:8px;margin-bottom:24px;"><button class="btn btn-outline btn-sm" style="flex:1;" onclick="openProfileEdit()">✏️ تعديل</button><button class="btn btn-outline btn-sm" style="flex:1;color:var(--danger);border-color:rgba(199,80,80,0.3);" onclick="logoutUser()">🚪 خروج</button></div><h4 style="font-family:var(--font-display);font-weight:700;margin-bottom:16px;">📦 طلباتي (${orders.length})</h4>${ordersHtml}`;document.getElementById('accountModal').classList.add('active');}
function closeAccount(){document.getElementById('accountModal').classList.remove('active');}
function openProfileEdit(){closeAccount();const u=loggedInUser||{};document.getElementById('accountBody').innerHTML=`<h4 style="font-family:var(--font-display);font-weight:700;margin-bottom:20px;text-align:center;">✏️ بياناتي</h4><div class="form-group"><label>الاسم</label><input type="text" id="profName" value="${u.name||''}" placeholder="اسمك"></div><div class="form-group"><label>الإيميل</label><input type="email" id="profEmail" value="${u.email||''}" placeholder="email@example.com" style="direction:ltr;text-align:right;"></div><div class="form-group"><label>رقم الهوية</label><input type="text" id="profId" value="${u.nationalId||''}" placeholder="رقم الهوية"></div><div class="form-group"><label>العنوان</label><textarea id="profAddress" placeholder="المدينة، الحي...">${u.address||''}</textarea></div><button class="btn btn-primary btn-block" onclick="saveProfile()">حفظ</button>`;document.getElementById('accountModal').classList.add('active');}
async function saveProfile(){const data=await api('/api/auth/update-profile','POST',{name:document.getElementById('profName').value,email:document.getElementById('profEmail').value,nationalId:document.getElementById('profId').value,address:document.getElementById('profAddress').value});if(data.success){loggedInUser=data.customer;closeAccount();showToast('تم الحفظ ✓','success');}else showToast('خطأ','error');}
async function logoutUser(){await api('/api/auth/logout','POST');loggedInUser=null;document.getElementById('accountBtn').style.borderColor='';document.getElementById('accountBtn').style.background='';closeAccount();showToast('تم تسجيل الخروج','success');}
