// التحقق من تسجيل دخول الأدمن
const isAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect('/admin/login');
};

module.exports = { isAdmin };
