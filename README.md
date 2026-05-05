# منصتي التعليمية

منصة تعليمية مبنية بـ **Next.js** و **Prisma**، جاهزة للنشر على **Vercel**.

> **إذا ظهر على Vercel:** `Environment variable not found: DATABASE_URL` أو فشل تسجيل الدخول/إنشاء الحساب، أضف المتغيرات من **Vercel → Settings → Environment Variables** (راجع **ENV_VERCEL.md**).

## التقنيات

- **Next.js 16** (App Router)
- **Prisma** مع PostgreSQL
- **Tailwind CSS 4**
- **TypeScript**

## التشغيل محلياً

1. تثبيت الحزم:
   ```bash
   npm install
   ```

2. إعداد قاعدة البيانات:
   - أنشئ ملف `.env` وضَع فيه:
     ```
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
     ```
   - يمكنك استخدام [Vercel Postgres](https://vercel.com/storage/postgres) أو [Neon](https://neon.tech) أو [Supabase](https://supabase.com).

3. تطبيق الـ schema وإنشاء الجداول:
   ```bash
   npm run db:push
   ```

4. (اختياري) إدخال بيانات تجريبية:
   ```bash
   npm run db:seed
   ```

5. تشغيل المشروع:
   ```bash
   npm dev
   ```

افتح [http://localhost:3000](http://localhost:3000).

## النشر على Vercel — وجعل قاعدة البيانات تعمل

بعد رفع المنصة على Vercel والدومين، **يجب** إعداد متغيرات البيئة حتى تعمل قاعدة البيانات والتسجيل والدورات بشكل طبيعي.

### 1) إنشاء قاعدة بيانات (إن لم تكن لديك)

استخدم أحد الخدمات التالية (مجاني للمشاريع الصغيرة):

- **[Neon](https://neon.tech)** — أنشئ مشروعاً، ثم انسخ **Connection string** (اختر النسخة مع **Pooled connection** إن وُجدت).
- **[Supabase](https://supabase.com)** — أنشئ مشروعاً → Settings → Database → **Connection string** (وضع URI).
- **[Vercel Postgres](https://vercel.com/storage/postgres)** — من لوحة Vercel: Storage → Create Database → انسخ `POSTGRES_URL` أو `DATABASE_URL`.

اتصال قاعدة البيانات يكون بهذا الشكل تقريباً:
```text
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

### 2) إضافة المتغيرات في Vercel

من مشروعك على Vercel:

1. ادخل إلى **Project → Settings → Environment Variables**.
2. أضف المتغيرات التالية (لـ **Production** و **Preview** إن أردت):

| المتغير | القيمة | مطلوب |
|--------|--------|--------|
| `DATABASE_URL` | رابط اتصال PostgreSQL من Neon أو Supabase أو Vercel Postgres (ليس من جهازك المحلي) | نعم |
| `NEXTAUTH_SECRET` | أي نص عشوائي طويل (مثلاً من [هذا المولد](https://generate-secret.vercel.app/32)) | نعم |
| `NEXTAUTH_URL` | عنوان موقعك على Vercel، مثل: `https://your-app.vercel.app` أو `https://your-domain.com` | نعم |
| `R2_ACCOUNT_ID` و `R2_ACCESS_KEY_ID` و `R2_SECRET_ACCESS_KEY` و `R2_BUCKET_NAME` و `R2_PUBLIC_URL` | فقط إن أردت رفع الصور/ملفات إلى Cloudflare R2 (اختياري) | لا |

**مهم:**

- **لا تستخدم** `DATABASE_URL` من جهازك (مثل `localhost`) على Vercel؛ الخوادم هناك لا تصل إلى جهازك.
- **NEXTAUTH_URL** يجب أن يكون بالضبط عنوان موقعك بعد النشر (مع `https://`).

### 3) تطبيق الجداول على قاعدة البيانات (مرة واحدة)

من جهازك المحلي (مع `.env` يحتوي على **نفس** `DATABASE_URL` لقاعدة الإنتاج):

```bash
npm run db:push
```

(اختياري) لملء بيانات تجريبية:

```bash
npm run db:seed
```

بعد ذلك لا تحتاج لتشغيل هذه الأوامر على السيرفر؛ Vercel يستخدم نفس القاعدة عبر `DATABASE_URL`.

### 4) إعادة النشر

بعد حفظ المتغيرات في Vercel، من **Deployments** اختر **Redeploy** لأحدث نشر حتى تُحمَّل المتغيرات الجديدة.

### 5) التحقق بعد النشر

افتح في المتصفح: **`https://عنوان-موقعك.vercel.app/api/health`**

- إذا ظهر `"ok": true` و`database.status: "ok"` فقاعدة البيانات والجلسات مضبوطة.
- إذا ظهر خطأ، ستوضح الرسالة ما الناقص (مثلاً إضافة `DATABASE_URL` أو تصحيح `NEXTAUTH_URL`). راجع أيضاً الملف **VERCEL_SETUP.md** للخطوات المفصلة.

---

- ارفع المشروع إلى GitHub واربطه بمشروع جديد في [Vercel](https://vercel.com) إن لم تكن قد فعلت.
- عند كل نشر، سيتم تشغيل `postinstall` (prisma generate) تلقائياً.

## أوامر مفيدة

| الأمر | الوصف |
|--------|--------|
| `npm run dev` | تشغيل وضع التطوير |
| `npm run build` | بناء المشروع للإنتاج |
| `npm run db:generate` | توليد Prisma Client |
| `npm run db:push` | مزامنة الـ schema مع قاعدة البيانات |
| `npm run db:seed` | إدخال البيانات التجريبية |

## هيكل المشروع

- `app/` — صفحات وواجهات API (App Router)
- `components/` — مكونات الواجهة
- `lib/db.ts` — عميل Prisma (Singleton)
- `prisma/schema.prisma` — نموذج البيانات
- `prisma/seed.ts` — سكربت البذرة

## التصميم

- واجهة حديثة مع دعم الوضع الفاتح والداكن
- دعم كامل للعربية (RTL)
- ألوان هادئة ومناسبة للتعلم (أخضر مزرق/teal)
- متجاوب مع الجوال وسهل التصفح
"# test" 
