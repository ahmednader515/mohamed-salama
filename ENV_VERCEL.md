# متغيرات البيئة المطلوبة على Vercel

إذا ظهر الخطأ: **`Environment variable not found: DATABASE_URL`** أو فشل تسجيل الدخول/إنشاء الحساب على النسخة المرفوعة، يجب إضافة المتغيرات التالية في Vercel.

## الخطوات

1. افتح مشروعك على **[Vercel](https://vercel.com)**.
2. ادخل إلى **Settings** → **Environment Variables**.
3. أضف المتغيرات التالية (اضغط **Add** لكل واحد):

| Key | Value | Environment |
|-----|--------|-------------|
| **DATABASE_URL** | الرابط الكامل لقاعدة PostgreSQL (من Neon أو Supabase أو Vercel Postgres). مثال: `postgresql://user:password@host/dbname?sslmode=require` | Production + Preview |
| **NEXTAUTH_SECRET** | نص عشوائي طويل (مثلاً 32 حرفاً). يمكن استخدام: https://generate-secret.vercel.app/32 | Production + Preview |
| **NEXTAUTH_URL** | عنوان موقعك على Vercel بالضبط، مثل: `https://your-app.vercel.app` أو دومينك المخصص | Production + Preview |

4. اضغط **Save** بعد كل متغير.
5. من **Deployments** → اختر آخر نشر → **⋯** → **Redeploy** (لتحميل المتغيرات الجديدة).

## ملاحظات

- **DATABASE_URL** يجب أن يكون رابط قاعدة بيانات **سحابية** (Neon / Supabase / Vercel Postgres)، وليس من جهازك (لا تستخدم `localhost`).
- **NEXTAUTH_URL** يجب أن يطابق عنوان الموقع بعد النشر (مع `https://` وبدون شرطة في النهاية).
- بعد إضافة المتغيرات يجب **Redeploy** حتى تُطبَّق على النسخة المرفوعة.

## التحقق

بعد إعادة النشر، افتح في المتصفح:

```
https://عنوان-موقعك.vercel.app/api/health
```

إذا ظهر `"ok": true` و `"database": { "status": "ok" }` فالإعداد صحيح وتسجيل الدخول وإنشاء الحساب سيعملان.
