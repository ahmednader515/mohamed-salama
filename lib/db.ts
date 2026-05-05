import "dotenv/config";
import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import type {
  User,
  UserRole,
  Course,
  Category,
  Review,
  HomepageSetting,
  Enrollment,
  ActivationCode,
  HomeworkSubmission,
  LessonRating,
  Lesson,
  Quiz,
  Question,
  QuestionOption,
  LiveStream,
  LiveStreamProvider,
  Conversation,
  Message,
  SubscriptionDurationKind,
  PlatformDetailsItem,
} from "./types";
import { generateCopyrightCodeCandidate } from "./copyright-code";
import {
  HOMEPAGE_DEFAULT_CTA_BADGE_AR,
  HOMEPAGE_DEFAULT_CTA_BUTTON_AR,
  HOMEPAGE_DEFAULT_CTA_DESCRIPTION_AR,
  HOMEPAGE_DEFAULT_CTA_TITLE_AR,
  HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
  HOMEPAGE_DEFAULT_HERO3_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_HERO3_TITLE_AR,
  HOMEPAGE_DEFAULT_HERO_SLOGAN_AR,
  HOMEPAGE_DEFAULT_HERO_TITLE_AR,
  HOMEPAGE_DEFAULT_PAGE_TITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_DETAILS_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_DETAILS_TITLE_AR,
  HOMEPAGE_DEFAULT_PLATFORM_NAME_AR,
  HOMEPAGE_DEFAULT_PLATFORM_NEWS_TITLE_AR,
  HOMEPAGE_DEFAULT_REVIEWS_SECTION_SUBTITLE_AR,
  HOMEPAGE_DEFAULT_REVIEWS_SECTION_TITLE_AR,
  HOMEPAGE_DEFAULT_SOCIAL_LEFT_LABEL_AR,
  HOMEPAGE_DEFAULT_SOCIAL_RIGHT_LABEL_AR,
  HOMEPAGE_DEFAULT_STORE_SECTION_DESCRIPTION_AR,
  HOMEPAGE_DEFAULT_STORE_SECTION_TITLE_AR,
} from "./homepage-known-defaults";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL غير معرّف");

/** عميل Neon — الاتصال المباشر بقاعدة البيانات Neon (بدون Prisma) */
export const sql = neon(connectionString);

/**
 * Many pages call "ensure schema" helpers during render.
 * On remote DBs (e.g. Neon), repeating `ALTER TABLE ... IF NOT EXISTS` on every request is very slow.
 * We memoize each ensure() so it runs once per server process.
 */
const ensureOnceMap = new Map<string, Promise<void>>();
function ensureOnce(key: string, fn: () => Promise<void>): Promise<void> {
  const existing = ensureOnceMap.get(key);
  if (existing) return existing;
  const p = (async () => {
    await fn();
  })();
  ensureOnceMap.set(key, p);
  return p;
}

/** تحويل مفتاح snake_case إلى camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** تحويل صف من قاعدة البيانات (snake_case) إلى شكل التطبيق (camelCase) */
function rowToCamel<T = Record<string, unknown>>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = snakeToCamel(k);
    out[key] = v;
  }
  return out as T;
}

function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => rowToCamel(r) as T);
}

/** توليد معرّف فريد متوافق مع CUID */
function generateId(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return "c" + part() + part() + Date.now().toString(36).slice(-6);
}

// ----- User -----
export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE email = ${email} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

/** تحويل الأرقام العربية ٠-٩ إلى إنجليزية */
function normalizeArabicDigits(s: string): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let out = "";
  for (const c of s) {
    const i = arabic.indexOf(c);
    out += i >= 0 ? String(i) : c;
  }
  return out;
}

/** تسجيل الدخول بالبريد أو رقم الهاتف: إذا القيمة تحتوي @ نبحث بالبريد، وإلا بالرقم (مقارنة بعد حذف غير الأرقام وتوحيد صيغ 0 و 20) */
export async function getUserByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
  const trimmed = emailOrPhone.trim();
  if (trimmed.includes("@")) {
    return getUserByEmail(trimmed);
  }
  const withWesternDigits = normalizeArabicDigits(trimmed);
  const digits = withWesternDigits.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const matchByDigits = async (norm: string) => {
    const rows = await sql`
      SELECT * FROM "User"
      WHERE REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(guardian_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
         OR REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(student_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
      LIMIT 1
    `;
    return (rows[0] as User) ?? null;
  };

  let user = await matchByDigits(digits);
  if (user) return user;
  if (digits.startsWith("20") && digits.length === 12) {
    user = await matchByDigits("0" + digits.slice(2));
    if (user) return user;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    user = await matchByDigits("20" + digits.slice(1));
    if (user) return user;
  }
  if (digits.length === 10) {
    user = await matchByDigits("0" + digits);
    if (user) return user;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE id = ${id} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

/** جلسة واحدة نشطة لكل مستخدم — نستخدمها لمنع تسجيل الدخول من أكثر من جهاز */
export async function getCurrentSessionId(userId: string): Promise<string | null> {
  try {
    const rows = await sql`SELECT current_session_id FROM "User" WHERE id = ${userId} LIMIT 1`;
    const val = (rows[0] as { current_session_id?: string | null })?.current_session_id;
    return val ?? null;
  } catch {
    return null;
  }
}

export async function setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
  await sql`UPDATE "User" SET current_session_id = ${sessionId} WHERE id = ${userId}`;
}

export async function clearCurrentSessionId(userId: string): Promise<void> {
  await sql`UPDATE "User" SET current_session_id = NULL WHERE id = ${userId}`;
}

/**
 * يضمن إمكانية حفظ مستخدم بـ role = TEACHER:
 * - إضافة القيمة لنوع Postgres "UserRole" إن وُجد
 * - أعمدة teacher_subject / teacher_avatar_url
 * - إن كان role عمود TEXT مع CHECK قديم (ADMIN, ASSISTANT_ADMIN, STUDENT فقط) يُستبدل القيد
 */
export async function ensureTeacherAccountDbSchema(): Promise<void> {
  return ensureOnce("ensureTeacherAccountDbSchema", async () => {
    try {
      await sql`
        DO $do$
        BEGIN
          ALTER TYPE "UserRole" ADD VALUE 'TEACHER';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
          WHEN undefined_object THEN NULL;
        END
        $do$
      `;
    } catch {
      /* جدول قديم بدون enum UserRole — نكمّل بمسار CHECK */
    }

    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS teacher_subject TEXT`;
    } catch {
      /* تجاهل */
    }
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS teacher_avatar_url TEXT`;
    } catch {
      /* تجاهل */
    }

    await ensureTeacherHomepageOrderColumn().catch(() => {});

    try {
      const meta = await sql`
        SELECT t.typname::text AS typname
        FROM pg_attribute a
        INNER JOIN pg_class c ON c.oid = a.attrelid
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        INNER JOIN pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = 'public' AND c.relname = 'User' AND a.attname = 'role' AND NOT a.attisdropped
        LIMIT 1
      `;
      const typname = String((meta[0] as { typname?: string } | undefined)?.typname ?? "").toLowerCase();
      const isPlainText = typname === "text" || typname === "varchar" || typname.startsWith("varchar");

      if (isPlainText) {
        await sql`
          DO $fix$
          DECLARE r record;
          BEGIN
            FOR r IN
              SELECT con.conname AS cname
              FROM pg_constraint con
              INNER JOIN pg_class rel ON rel.oid = con.conrelid
              INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
              WHERE nsp.nspname = 'public'
                AND rel.relname = 'User'
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) ILIKE '%role%'
                AND pg_get_constraintdef(con.oid) NOT ILIKE '%TEACHER%'
            LOOP
              EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', 'public', 'User', r.cname);
            END LOOP;
          END
          $fix$
        `;
        await sql`ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_allowed_values_check"`;
        await sql`
          ALTER TABLE "User" ADD CONSTRAINT "User_role_allowed_values_check"
          CHECK (role IN ('ADMIN', 'ASSISTANT_ADMIN', 'STUDENT', 'TEACHER'))
        `;
      }
    } catch {
      /* عمود role من نوع enum بالفعل أو القيد محدّث يدوياً */
    }
  });
}

export async function ensureTeacherHomepageOrderColumn(): Promise<void> {
  return ensureOnce("ensureTeacherHomepageOrderColumn", async () => {
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS teacher_homepage_order INTEGER`;
    } catch {
      /* تجاهل */
    }
  });
}

/** عمود كود حقوق الطبع والنشر (فريد لكل طالب) */
export async function ensureCopyrightCodeColumn(): Promise<void> {
  return ensureOnce("ensureCopyrightCodeColumn", async () => {
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS copyright_code VARCHAR(10)`;
    } catch {
      /* */
    }
    try {
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS user_copyright_code_unique
        ON "User" (copyright_code)
        WHERE copyright_code IS NOT NULL AND TRIM(copyright_code) <> ''
      `;
    } catch {
      /* */
    }
  });
}

async function copyrightCodeTaken(code: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM "User" WHERE copyright_code = ${code} LIMIT 1`;
  return rows.length > 0;
}

export async function allocateUniqueCopyrightCode(): Promise<string> {
  await ensureCopyrightCodeColumn();
  for (let i = 0; i < 100; i++) {
    const c = generateCopyrightCodeCandidate();
    if (!(await copyrightCodeTaken(c))) return c;
  }
  throw new Error("تعذر توليد كود حقوق فريد");
}

/** يضمن وجود كود للطالب ويعيده (null لغير الطلاب) */
export async function ensureUserCopyrightCode(userId: string): Promise<string | null> {
  await ensureCopyrightCodeColumn();
  const rows = await sql`SELECT role, copyright_code FROM "User" WHERE id = ${userId} LIMIT 1`;
  const row = rows[0] as { role: string; copyright_code: string | null } | undefined;
  if (!row || row.role !== "STUDENT") return null;
  const existing = (row.copyright_code ?? "").trim();
  if (existing) return existing;
  const code = await allocateUniqueCopyrightCode();
  await sql`UPDATE "User" SET copyright_code = ${code}, updated_at = NOW() WHERE id = ${userId}`;
  return code;
}

/** تعبئة كود لكل الطلاب الذين بلا كود (ترقية قواعد قديمة) */
export async function backfillMissingStudentCopyrightCodes(): Promise<void> {
  await ensureCopyrightCodeColumn();
  const rows = await sql`
    SELECT id FROM "User"
    WHERE role = 'STUDENT' AND (copyright_code IS NULL OR TRIM(copyright_code) = '')
  `;
  for (const r of rows as { id: string }[]) {
    try {
      const code = await allocateUniqueCopyrightCode();
      await sql`UPDATE "User" SET copyright_code = ${code}, updated_at = NOW() WHERE id = ${r.id}`;
    } catch (e) {
      console.error("backfill copyright_code", r.id, e);
    }
  }
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role?: UserRole;
  student_number?: string | null;
  guardian_number?: string | null;
  teacher_subject?: string | null;
  teacher_avatar_url?: string | null;
}): Promise<User> {
  const id = generateId();
  let usedFallbackInsertWithoutTeacherCols = false;
  if (data.role === "TEACHER") {
    await ensureTeacherAccountDbSchema();
  }
  await ensureCopyrightCodeColumn().catch(() => {});
  const studentCopyright =
    (data.role ?? "STUDENT") === "STUDENT" ? await allocateUniqueCopyrightCode() : null;
  try {
    await sql`
      INSERT INTO "User" (id, email, password_hash, name, role, student_number, guardian_number, teacher_subject, teacher_avatar_url, copyright_code)
      VALUES (${id}, ${data.email}, ${data.password_hash}, ${data.name}, ${data.role ?? "STUDENT"}, ${data.student_number ?? null}, ${data.guardian_number ?? null}, ${data.teacher_subject ?? null}, ${data.teacher_avatar_url ?? null}, ${studentCopyright})
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingTeacherCols =
      msg.includes("teacher_subject") ||
      msg.includes("teacher_avatar_url") ||
      (msg.includes("column") && msg.includes("does not exist") && msg.includes("teacher"));
    if (missingTeacherCols) {
      usedFallbackInsertWithoutTeacherCols = true;
      await sql`
        INSERT INTO "User" (id, email, password_hash, name, role, student_number, guardian_number, copyright_code)
        VALUES (${id}, ${data.email}, ${data.password_hash}, ${data.name}, ${data.role ?? "STUDENT"}, ${data.student_number ?? null}, ${data.guardian_number ?? null}, ${studentCopyright})
      `;
    } else {
      throw e;
    }
  }
  if (usedFallbackInsertWithoutTeacherCols && data.role === "TEACHER") {
    await updateUser(id, {
      teacher_subject: data.teacher_subject ?? null,
      teacher_avatar_url: data.teacher_avatar_url ?? null,
    }).catch(() => {
      /* أعمدة المدرس غير متوفرة بعد */
    });
  }
  const u = await getUserById(id);
  if (!u) throw new Error("فشل إنشاء المستخدم");
  return u;
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: UserRole;
    balance?: string;
    password_hash?: string;
    student_number?: string | null;
    guardian_number?: string | null;
    teacher_subject?: string | null;
    teacher_avatar_url?: string | null;
  }
): Promise<void> {
  if (data.name !== undefined) await sql`UPDATE "User" SET name = ${data.name}, updated_at = NOW() WHERE id = ${id}`;
  if (data.email !== undefined) await sql`UPDATE "User" SET email = ${data.email}, updated_at = NOW() WHERE id = ${id}`;
  if (data.role !== undefined) await sql`UPDATE "User" SET role = ${data.role}, updated_at = NOW() WHERE id = ${id}`;
  if (data.balance !== undefined) await sql`UPDATE "User" SET balance = ${data.balance}, updated_at = NOW() WHERE id = ${id}`;
  if (data.password_hash !== undefined) await sql`UPDATE "User" SET password_hash = ${data.password_hash}, updated_at = NOW() WHERE id = ${id}`;
  if (data.student_number !== undefined) await sql`UPDATE "User" SET student_number = ${data.student_number}, updated_at = NOW() WHERE id = ${id}`;
  if (data.guardian_number !== undefined) await sql`UPDATE "User" SET guardian_number = ${data.guardian_number}, updated_at = NOW() WHERE id = ${id}`;
  if (data.teacher_subject !== undefined) {
    try {
      await sql`UPDATE "User" SET teacher_subject = ${data.teacher_subject}, updated_at = NOW() WHERE id = ${id}`;
    } catch {
      /* عمود غير موجود قبل تشغيل سكربت المدرسين */
    }
  }
  if (data.teacher_avatar_url !== undefined) {
    try {
      await sql`UPDATE "User" SET teacher_avatar_url = ${data.teacher_avatar_url}, updated_at = NOW() WHERE id = ${id}`;
    } catch {
      /* عمود غير موجود */
    }
  }
}

// ----- PasswordChangeRequest (طلبات تغيير كلمة المرور) -----
export async function createPasswordChangeRequest(
  userId: string,
  newPasswordHash: string,
  requestedIdentifier?: string | null,
  requestedOldPassword?: string | null,
  requestedNewPasswordPlain?: string | null
): Promise<string> {
  const id = generateId();
  await sql`
    INSERT INTO "PasswordChangeRequest" (id, user_id, new_password_hash, requested_identifier, requested_old_password, requested_new_password_plain, status)
    VALUES (${id}, ${userId}, ${newPasswordHash}, ${requestedIdentifier ?? null}, ${requestedOldPassword ?? null}, ${requestedNewPasswordPlain ?? null}, 'pending')
  `;
  return id;
}

export async function getPasswordChangeRequests(): Promise<
  Array<{
    id: string;
    userId: string;
    newPasswordHash: string;
    requestedIdentifier: string | null;
    requestedOldPassword: string | null;
    requestedNewPasswordPlain: string | null;
    status: string;
    createdAt: Date;
    processedAt: Date | null;
    processedById: string | null;
    userEmail: string;
    userName: string;
  }>
> {
  const rows = await sql`
    SELECT r.id, r.user_id, r.new_password_hash, r.requested_identifier, r.requested_old_password, r.requested_new_password_plain, r.status, r.created_at, r.processed_at, r.processed_by_id,
           u.email as user_email, u.name as user_name
    FROM "PasswordChangeRequest" r
    JOIN "User" u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    newPasswordHash: r.new_password_hash as string,
    requestedIdentifier: (r.requested_identifier as string) ?? null,
    requestedOldPassword: (r.requested_old_password as string) ?? null,
    requestedNewPasswordPlain: (r.requested_new_password_plain as string) ?? null,
    status: r.status as string,
    createdAt: r.created_at as Date,
    processedAt: (r.processed_at as Date) ?? null,
    processedById: (r.processed_by_id as string) ?? null,
    userEmail: (r.user_email as string) ?? "",
    userName: (r.user_name as string) ?? "",
  }));
}

export async function getPasswordChangeRequestById(requestId: string): Promise<{
  id: string;
  userId: string;
  newPasswordHash: string;
  status: string;
} | null> {
  const rows = await sql`SELECT id, user_id, new_password_hash, status FROM "PasswordChangeRequest" WHERE id = ${requestId} LIMIT 1`;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: r.id as string,
    userId: r.user_id as string,
    newPasswordHash: r.new_password_hash as string,
    status: r.status as string,
  };
}

export async function completePasswordChangeRequest(requestId: string, processedByUserId: string): Promise<boolean> {
  const req = await getPasswordChangeRequestById(requestId);
  if (!req || req.status !== "pending") return false;
  await sql`UPDATE "User" SET password_hash = ${req.newPasswordHash}, updated_at = NOW() WHERE id = ${req.userId}`;
  await sql`
    UPDATE "PasswordChangeRequest"
    SET status = 'completed', processed_at = NOW(), processed_by_id = ${processedByUserId}
    WHERE id = ${requestId}
  `;
  return true;
}

export async function deletePasswordChangeRequest(requestId: string): Promise<boolean> {
  if (!requestId?.trim()) return false;
  await sql`DELETE FROM "PasswordChangeRequest" WHERE id = ${requestId.trim()}`;
  return true;
}

// ----- Category -----
let categoryCreatedByColumnEnsured = false;

/** يضيف عمود created_by_id لجدول الأقسام (أقسام المنصة = NULL، قسم المدرس = معرّف المدرس) */
async function ensureCategoryCreatedByColumn(): Promise<void> {
  if (categoryCreatedByColumnEnsured) return;
  try {
    await sql`ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS created_by_id TEXT`;
    categoryCreatedByColumnEnsured = true;
  } catch {
    /* DDL غير متاح */
  }
}

export async function getCategories(): Promise<Category[]> {
  await ensureCategoryCreatedByColumn();
  const rows = await sql`SELECT * FROM "Category" ORDER BY "order" ASC`;
  return rowsToCamel(rows as Record<string, unknown>[]) as Category[];
}

/** أقسام تظهر في لوحة إنشاء/تعديل الدورة: المدرس يرى أقسامه فقط؛ الأدمن يرى أقسام المنصة وأقسام أي أدمن/مساعد */
export async function getCategoriesForDashboard(userId: string, role: UserRole): Promise<Category[]> {
  await ensureCategoryCreatedByColumn();
  if (role === "TEACHER") {
    const rows = await sql`
      SELECT * FROM "Category"
      WHERE created_by_id = ${userId}
      ORDER BY "order" ASC
    `;
    return rowsToCamel(rows as Record<string, unknown>[]) as Category[];
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const rows = await sql`
      SELECT c.* FROM "Category" c
      WHERE c.created_by_id IS NULL
         OR EXISTS (
           SELECT 1 FROM "User" u
           WHERE u.id = c.created_by_id
             AND u.role IN ('ADMIN', 'ASSISTANT_ADMIN')
         )
      ORDER BY c."order" ASC
    `;
    return rowsToCamel(rows as Record<string, unknown>[]) as Category[];
  }
  return [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  await ensureCategoryCreatedByColumn();
  if (!id?.trim()) return null;
  const rows = await sql`SELECT * FROM "Category" WHERE id = ${id.trim()} LIMIT 1`;
  return (rowToCamel(rows[0] as Record<string, unknown>) as Category) ?? null;
}

/** هل يحق لهذا المستخدم اختيار هذا القسم أو حذفه من لوحة الدورات؟ */
export async function categoryIsManageableOnDashboard(
  categoryId: string,
  userId: string,
  role: UserRole
): Promise<boolean> {
  await ensureCategoryCreatedByColumn();
  const id = categoryId.trim();
  if (!id) return false;
  if (role === "TEACHER") {
    const rows = await sql`
      SELECT 1 FROM "Category" c
      WHERE c.id = ${id} AND c.created_by_id = ${userId}
      LIMIT 1
    `;
    return rows.length > 0;
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const rows = await sql`
      SELECT 1 FROM "Category" c
      WHERE c.id = ${id}
        AND (
          c.created_by_id IS NULL
          OR EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = c.created_by_id
              AND u.role IN ('ADMIN', 'ASSISTANT_ADMIN')
          )
        )
      LIMIT 1
    `;
    return rows.length > 0;
  }
  return false;
}

export async function createCategory(data: {
  name: string;
  name_ar?: string | null;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  order?: number;
  created_by_id?: string | null;
}): Promise<Category> {
  await ensureCategoryCreatedByColumn();
  const id = generateId();
  const owner = data.created_by_id ?? null;
  await sql`
    INSERT INTO "Category" (id, name, name_ar, slug, description, image_url, "order", created_by_id)
    VALUES (${id}, ${data.name}, ${data.name_ar ?? null}, ${data.slug}, ${data.description ?? null}, ${data.image_url ?? null}, ${data.order ?? 0}, ${owner})
  `;
  const rows = await sql`SELECT * FROM "Category" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Category;
}

/** بحث عام بالاسم (بدون تقييد مالك) — للبذرة والأدوات القديمة */
export async function getCategoryByName(name: string): Promise<Category | null> {
  await ensureCategoryCreatedByColumn();
  const n = name.trim();
  if (!n) return null;
  const rows = await sql`
    SELECT * FROM "Category"
    WHERE LOWER(TRIM(name)) = LOWER(${n})
       OR (name_ar IS NOT NULL AND LOWER(TRIM(name_ar)) = LOWER(${n}))
    LIMIT 1
  `;
  return (rowToCamel(rows[0] as Record<string, unknown>) as Category) ?? null;
}

/** مطابقة اسم قسم ضمن أقسام المستخدم في لوحة الدورات فقط */
export async function findCategoryByNameForDashboard(
  name: string,
  userId: string,
  role: UserRole
): Promise<Category | null> {
  await ensureCategoryCreatedByColumn();
  const n = name.trim();
  if (!n) return null;
  if (role === "TEACHER") {
    const rows = await sql`
      SELECT * FROM "Category"
      WHERE created_by_id = ${userId}
        AND (
          LOWER(TRIM(name)) = LOWER(${n})
          OR (name_ar IS NOT NULL AND LOWER(TRIM(name_ar)) = LOWER(${n}))
        )
      LIMIT 1
    `;
    return (rowToCamel(rows[0] as Record<string, unknown>) as Category) ?? null;
  }
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") {
    const rows = await sql`
      SELECT c.* FROM "Category" c
      WHERE (
          LOWER(TRIM(c.name)) = LOWER(${n})
          OR (c.name_ar IS NOT NULL AND LOWER(TRIM(c.name_ar)) = LOWER(${n}))
        )
        AND (
          c.created_by_id IS NULL
          OR EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = c.created_by_id
              AND u.role IN ('ADMIN', 'ASSISTANT_ADMIN')
          )
        )
      LIMIT 1
    `;
    return (rowToCamel(rows[0] as Record<string, unknown>) as Category) ?? null;
  }
  return null;
}

/** حذف قسم — الدورات المرتبطة به تصبح بدون قسم (category_id = null) */
export async function deleteCategory(id: string): Promise<boolean> {
  if (!id?.trim()) return false;
  await ensureCategoryCreatedByColumn();
  await sql`DELETE FROM "Category" WHERE id = ${id.trim()}`;
  return true;
}

// ----- Review (تعليقات الطلاب) -----
async function ensureReviewImageUrlColumn(): Promise<void> {
  return ensureOnce("ensureReviewImageUrlColumn", async () => {
    try {
      await sql`ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS image_url TEXT`;
    } catch {
      /* DDL غير متاح أو الجدول غير موجود */
    }
  });
}

async function ensureReviewBilingualColumns(): Promise<void> {
  return ensureOnce("ensureReviewBilingualColumns", async () => {
    try {
      await sql`ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS text_en TEXT`;
      await sql`ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS author_title_en TEXT`;
    } catch {
      /* DDL غير متاح أو الجدول غير موجود */
    }
  });
}

export async function getReviews(): Promise<Review[]> {
  await ensureReviewImageUrlColumn();
  await ensureReviewBilingualColumns();
  const rows = await sql`SELECT * FROM "Review" ORDER BY "order" ASC, created_at DESC`;
  return rowsToCamel(rows as Record<string, unknown>[]) as Review[];
}

export async function getReviewById(id: string): Promise<Review | null> {
  await ensureReviewImageUrlColumn();
  await ensureReviewBilingualColumns();
  const rows = await sql`SELECT * FROM "Review" WHERE id = ${id} LIMIT 1`;
  return (rowToCamel(rows[0] as Record<string, unknown>) as Review) ?? null;
}

export async function createReview(data: {
  text: string;
  text_en?: string | null;
  author_name: string;
  author_title?: string | null;
  author_title_en?: string | null;
  avatar_letter?: string | null;
  image_url?: string | null;
  order?: number;
}): Promise<Review> {
  await ensureReviewImageUrlColumn();
  await ensureReviewBilingualColumns();
  const id = generateId();
  const rows = await sql`
    INSERT INTO "Review" (id, text, text_en, author_name, author_title, author_title_en, avatar_letter, image_url, "order")
    VALUES (${id}, ${data.text}, ${data.text_en ?? null}, ${data.author_name}, ${data.author_title ?? null}, ${data.author_title_en ?? null}, ${data.avatar_letter ?? null}, ${data.image_url ?? null}, ${data.order ?? 0})
    RETURNING *
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("فشل إنشاء التعليق");
  return rowToCamel(row) as Review;
}

export async function updateReview(
  id: string,
  data: {
    text?: string;
    text_en?: string | null;
    author_name?: string;
    author_title?: string | null;
    author_title_en?: string | null;
    avatar_letter?: string | null;
    image_url?: string | null;
    order?: number;
  }
): Promise<void> {
  await ensureReviewImageUrlColumn();
  await ensureReviewBilingualColumns();
  if (data.text !== undefined) await sql`UPDATE "Review" SET text = ${data.text}, updated_at = NOW() WHERE id = ${id}`;
  if (data.text_en !== undefined) await sql`UPDATE "Review" SET text_en = ${data.text_en}, updated_at = NOW() WHERE id = ${id}`;
  if (data.author_name !== undefined) await sql`UPDATE "Review" SET author_name = ${data.author_name}, updated_at = NOW() WHERE id = ${id}`;
  if (data.author_title !== undefined) await sql`UPDATE "Review" SET author_title = ${data.author_title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.author_title_en !== undefined) await sql`UPDATE "Review" SET author_title_en = ${data.author_title_en}, updated_at = NOW() WHERE id = ${id}`;
  if (data.avatar_letter !== undefined) await sql`UPDATE "Review" SET avatar_letter = ${data.avatar_letter}, updated_at = NOW() WHERE id = ${id}`;
  if (data.image_url !== undefined) await sql`UPDATE "Review" SET image_url = ${data.image_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.order !== undefined) await sql`UPDATE "Review" SET "order" = ${data.order}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteReview(id: string): Promise<void> {
  await sql`DELETE FROM "Review" WHERE id = ${id}`;
}

// ----- HomepageSetting (إعدادات الصفحة الرئيسية) -----
const HOMEPAGE_DEFAULTS: HomepageSetting = {
  heroTemplate: "classic",
  teacherImageUrl: "/instructor.png",
  heroTitle: HOMEPAGE_DEFAULT_HERO_TITLE_AR,
  heroTitleEn: null,
  heroSlogan: HOMEPAGE_DEFAULT_HERO_SLOGAN_AR,
  heroSloganEn: null,
  platformName: HOMEPAGE_DEFAULT_PLATFORM_NAME_AR,
  platformNameEn: null,
  headerLogoUrl: null,
  primaryColor: null,
  youtubeUrl: null,
  linkedinUrl: null,
  whatsappUrl: "https://wa.me/966553612356",
  facebookUrl: "https://www.facebook.com/profile.php?id=61562686209159",
  telegramUrl: null,
  teamYoutubeUrl: null,
  teamLinkedinUrl: null,
  teamWhatsappUrl: null,
  teamFacebookUrl: null,
  teamTelegramUrl: null,
  socialRightLabel: HOMEPAGE_DEFAULT_SOCIAL_RIGHT_LABEL_AR,
  socialRightLabelEn: null,
  socialLeftLabel: HOMEPAGE_DEFAULT_SOCIAL_LEFT_LABEL_AR,
  socialLeftLabelEn: null,
  socialLeftEnabled: true,
  pageTitle: HOMEPAGE_DEFAULT_PAGE_TITLE_AR,
  pageTitleEn: null,
  heroBgPreset: "navy",
  heroBgCustomFrom: null,
  heroBgCustomTo: null,
  heroFloatImage1: "/images/ruler.png",
  heroFloatImage2: "/images/notebook.png",
  heroFloatImage3: "/images/pencil.png",
  heroSliderImage1: null,
  heroSliderImage2: null,
  heroSliderImage3: null,
  heroSliderImage4: null,
  heroSliderImage5: null,
  heroSliderCourseId1: null,
  heroSliderCourseId2: null,
  heroSliderCourseId3: null,
  heroSliderCourseId4: null,
  heroSliderCourseId5: null,
  heroSliderIntervalMs: 5000,
  hero3Title: HOMEPAGE_DEFAULT_HERO3_TITLE_AR,
  hero3TitleEn: null,
  hero3Subtitle: HOMEPAGE_DEFAULT_HERO3_SUBTITLE_AR,
  hero3SubtitleEn: null,
  hero3PhoneImageUrl: null,
  hero3PhoneBgColor: "#FACC15",
  hero3StoreBadge1ImageUrl: null,
  hero3StoreBadge1Link: null,
  hero3StoreBadge2ImageUrl: null,
  hero3StoreBadge2Link: null,
  footerTitle: HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
  footerTitleEn: null,
  footerTagline: HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  footerTaglineEn: null,
  footerCopyright: HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  footerCopyrightEn: null,
  reviewsSectionTitle: HOMEPAGE_DEFAULT_REVIEWS_SECTION_TITLE_AR,
  reviewsSectionTitleEn: null,
  reviewsSectionSubtitle: HOMEPAGE_DEFAULT_REVIEWS_SECTION_SUBTITLE_AR,
  reviewsSectionSubtitleEn: null,
  ctaBadgeText: HOMEPAGE_DEFAULT_CTA_BADGE_AR,
  ctaBadgeTextEn: null,
  ctaTitle: HOMEPAGE_DEFAULT_CTA_TITLE_AR,
  ctaTitleEn: null,
  ctaDescription: HOMEPAGE_DEFAULT_CTA_DESCRIPTION_AR,
  ctaDescriptionEn: null,
  ctaButtonText: HOMEPAGE_DEFAULT_CTA_BUTTON_AR,
  ctaButtonTextEn: null,
  teachersEnabled: false,
  subscriptionsEnabled: false,
  storeEnabled: false,
  storeSectionTitle: HOMEPAGE_DEFAULT_STORE_SECTION_TITLE_AR,
  storeSectionTitleEn: null,
  storeSectionDescription: HOMEPAGE_DEFAULT_STORE_SECTION_DESCRIPTION_AR,
  storeSectionDescriptionEn: null,
  platformDetailsEnabled: false,
  platformDetailsTitle: HOMEPAGE_DEFAULT_PLATFORM_DETAILS_TITLE_AR,
  platformDetailsTitleEn: null,
  platformDetailsSubtitle: HOMEPAGE_DEFAULT_PLATFORM_DETAILS_SUBTITLE_AR,
  platformDetailsSubtitleEn: null,
  platformDetailsBackgroundColor: null,
  platformDetailsItems: JSON.stringify([
    {
      id: "platform-detail-1",
      title: "فصول افتراضية فورية",
      description: "تصميم الفصول والمعلومات خلال الفصول الافتراضية.",
      iconType: "preset",
      presetIcon: "book",
      customIconUrl: null,
    },
    {
      id: "platform-detail-2",
      title: "محتوى جذاب في دقائق",
      description: "تصميم وإنشاء المحتوى التعليمي بشكل سريع ومميز.",
      iconType: "preset",
      presetIcon: "pencil",
      customIconUrl: null,
    },
    {
      id: "platform-detail-3",
      title: "أنشطة وفعاليات رائعة",
      description: "تجذب الطلاب وتنشئ تفاعلهم بعد أو داخل الصف الدراسي.",
      iconType: "preset",
      presetIcon: "bulb",
      customIconUrl: null,
    },
    {
      id: "platform-detail-4",
      title: "تواصل فعال",
      description: "أدوات للتواصل والتعاون الفعال بين كل أطراف العملية التعليمية.",
      iconType: "preset",
      presetIcon: "chat",
      customIconUrl: null,
    },
  ] satisfies PlatformDetailsItem[]),
  platformNewsEnabled: false,
  platformNewsItems: "[]",
  platformNewsSectionTitle: HOMEPAGE_DEFAULT_PLATFORM_NEWS_TITLE_AR,
  platformNewsSectionTitleEn: null,
  addBalanceTitle: "إضافة رصيد",
  addBalanceTitleEn: null,
  addBalanceSubtitle: "اختر طريقة الدفع ثم اتبع التعليمات",
  addBalanceSubtitleEn: null,
  addBalanceMethodTitle: "فودافون كاش",
  addBalanceMethodTitleEn: null,
  addBalanceTransferInstruction: "قم بتحويل المبلغ المطلوب إلى رقم المحفظة التالي:",
  addBalanceTransferInstructionEn: null,
  addBalanceWalletNumber: "01023005622",
  addBalanceConfirmationNote:
    "بعد التحويل، يجب إرسال صورة تأكيد التحويل على واتساب على الرقم",
  addBalanceConfirmationNoteEn: null,
  addBalanceWhatsappNumber: "966553612356",
  addBalanceWhatsappButtonText: "إرسال صورة التأكيد على واتساب",
  addBalanceWhatsappButtonTextEn: null,
  addBalanceWaitingNote:
    "بعد إرسال صورة التأكيد، يكون رصيدك في انتظار وصوله إلى حسابك. سيتم إضافة الرصيد خلال أقرب وقت.",
  addBalanceWaitingNoteEn: null,
  copyrightOverlayStyle: "floating",
};

/** أعمدة نص قسم التعليقات في الصفحة الرئيسية */
async function ensureHomepageReviewsSectionCopyColumns(): Promise<void> {
  return ensureOnce("ensureHomepageReviewsSectionCopyColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_subtitle TEXT`;
    } catch {
      /* DDL غير متاح أو الجدول غير موجود */
    }
  });
}

/** ربط شرائح السلايدر بمعرفات كورسات منشورة */
async function ensureHomepageHeroSliderCourseIdColumns(): Promise<void> {
  return ensureOnce("ensureHomepageHeroSliderCourseIdColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_1 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_2 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_3 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_4 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_5 TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** لون المنصة الأساسي (hex) */
async function ensureHomepagePrimaryColorColumn(): Promise<void> {
  return ensureOnce("ensureHomepagePrimaryColorColumn", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS primary_color TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** لوجو الهيدر */
async function ensureHomepageHeaderLogoColumn(): Promise<void> {
  return ensureOnce("ensureHomepageHeaderLogoColumn", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS header_logo_url TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** روابط السوشيال للدعم (يمين + يسار) — أزرار ثابتة أسفل الصفحة الرئيسية */
async function ensureHomepageTeamSupportLinksColumns(): Promise<void> {
  return ensureOnce("ensureHomepageTeamSupportLinksColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS youtube_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS linkedin_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_whatsapp_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS telegram_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_facebook_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_youtube_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_linkedin_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_telegram_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_right_label TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_label TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_enabled BOOLEAN NOT NULL DEFAULT true`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** نصوص قسم CTA أسفل الصفحة الرئيسية */
async function ensureHomepageCtaCopyColumns(): Promise<void> {
  return ensureOnce("ensureHomepageCtaCopyColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_badge_text TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_description TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_button_text TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** حقول النصوص الإنجليزية الموازية للنصوص العربية القابلة للتعديل من لوحة التحكم */
async function ensureHomepageBilingualTextColumns(): Promise<void> {
  return ensureOnce("ensureHomepageBilingualTextColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_name_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slogan_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS page_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_right_label_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_label_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_subtitle_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_tagline_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_copyright_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_subtitle_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_badge_text_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_description_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_button_text_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_subtitle_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_section_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_subtitle_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_method_title_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_transfer_instruction_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_confirmation_note_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_button_text_en TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_waiting_note_en TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** تدرج لوني مخصّص للهيرو (لونان hex) */
async function ensureHomepageHeroCustomBgColumns(): Promise<void> {
  return ensureOnce("ensureHomepageHeroCustomBgColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_from TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_to TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** قالب الهيرو وصور سلايدر الصورة الكبيرة */
async function ensureHomepageHeroTemplateColumns(): Promise<void> {
  return ensureOnce("ensureHomepageHeroTemplateColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_template TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_1 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_2 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_3 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_4 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_5 TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_interval_ms INTEGER`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_subtitle TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_image_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_bg_color TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_image_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_link TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_image_url TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_link TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** يضمن وجود عمود teachers_enabled إن كان جدول HomepageSetting موجوداً ولم يُشغَّل سكربت SQL بعد */
async function ensureHomepageTeachersEnabledColumn(): Promise<void> {
  return ensureOnce("ensureHomepageTeachersEnabledColumn", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS teachers_enabled BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* ربما لا صلاحية DDL — يُفترض أن العمود أُضيف يدوياً */
    }
  });
}

async function ensureHomepageSubscriptionsEnabledColumn(): Promise<void> {
  return ensureOnce("ensureHomepageSubscriptionsEnabledColumn", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS subscriptions_enabled BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

async function ensureHomepageStoreEnabledColumn(): Promise<void> {
  return ensureOnce("ensureHomepageStoreEnabledColumn", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** عنوان ووصف قسم المتجر في الصفحة الرئيسية */
async function ensureHomepageStoreSectionCopyColumns(): Promise<void> {
  return ensureOnce("ensureHomepageStoreSectionCopyColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** قسم تفاصيل المنصة (إظهار/إخفاء + عنوان + وصف + بطاقات) */
async function ensureHomepagePlatformDetailsColumns(): Promise<void> {
  return ensureOnce("ensureHomepagePlatformDetailsColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_enabled BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_subtitle TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_background_color TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_items TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** قسم الأخبار في الصفحة الرئيسية (تفعيل + JSON) */
async function ensureHomepagePlatformNewsColumns(): Promise<void> {
  return ensureOnce("ensureHomepagePlatformNewsColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_enabled BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_items TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_section_title TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** أعمدة إعدادات صفحة إضافة الرصيد (قابلة لتعديل الأدمن) */
async function ensureAddBalanceSettingsColumns(): Promise<void> {
  return ensureOnce("ensureAddBalanceSettingsColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_subtitle TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_method_title TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_transfer_instruction TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_wallet_number TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_confirmation_note TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_number TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_button_text TEXT`;
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_waiting_note TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** إعدادات شكل علامة كود حقوق الطبع داخل مشغّل الحصص */
async function ensureHomepageCopyrightOverlayColumns(): Promise<void> {
  return ensureOnce("ensureHomepageCopyrightOverlayColumns", async () => {
    try {
      await sql`ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS copyright_overlay_style TEXT`;
    } catch {
      /* DDL غير متاح */
    }
  });
}

/** تفعيل عرض «اختر المدرسين» وحسابات المدرسين */
export async function getTeachersFeatureEnabled(): Promise<boolean> {
  try {
    const rows = await sql`SELECT teachers_enabled FROM "HomepageSetting" WHERE id = 'default' LIMIT 1`;
    const v = (rows[0] as { teachers_enabled?: boolean } | undefined)?.teachers_enabled;
    return !!v;
  } catch {
    return false;
  }
}

export async function setTeachersFeatureEnabled(enabled: boolean): Promise<void> {
  await ensureHomepageTeachersEnabledColumn();
  /* UPSERT: يعمل حتى لو لم يكن صف default موجوداً، ولا يعتمد على نجاح UPDATE بلا صفوف */
  await sql`
    INSERT INTO "HomepageSetting" (id, teachers_enabled, updated_at)
    VALUES ('default', ${enabled}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      teachers_enabled = EXCLUDED.teachers_enabled,
      updated_at = NOW()
  `;
}

/** مدرسون يظهرون في الصفحة العامة (لهم كورس منشور على الأقل) */
export async function listTeachersPublic(categoryId?: string | null): Promise<
  Array<{ id: string; name: string; teacherSubject: string | null; teacherAvatarUrl: string | null }>
> {
  const cat = categoryId?.trim() || null;
  const rows = cat
    ? await sql`
        SELECT DISTINCT u.id, u.name, u.teacher_subject, u.teacher_avatar_url
        FROM "User" u
        INNER JOIN "Course" c ON c.created_by_id = u.id AND c.is_published = true
        WHERE u.role = 'TEACHER' AND c.category_id = ${cat}
        ORDER BY u.name ASC
      `
    : await sql`
        SELECT DISTINCT u.id, u.name, u.teacher_subject, u.teacher_avatar_url
        FROM "User" u
        INNER JOIN "Course" c ON c.created_by_id = u.id AND c.is_published = true
        WHERE u.role = 'TEACHER'
        ORDER BY u.name ASC
      `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    teacherSubject: (r.teacher_subject as string | null) ?? (r.teacherSubject as string | null) ?? null,
    teacherAvatarUrl: (r.teacher_avatar_url as string | null) ?? (r.teacherAvatarUrl as string | null) ?? null,
  }));
}

/** دورة منشورة تظهر ضمن بطاقة المدرس العامة */
export type TeacherHomepageCourse = { id: string; slug: string; title: string };

export type TeacherHomepageRow = {
  id: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  createdAt: string;
  /** 1–4 إن حُدّد من لوحة التحكم؛ وإلا null */
  homepageOrder: number | null;
  courses: TeacherHomepageCourse[];
};

export const HOME_TEACHER_PREVIEW_MAX = 4;

/** ترتيب بطاقات الرئيسية: المحددون بالترتيب 1–4 ثم الباقون أبجدياً، حتى `max` */
export function selectTeachersForHomepagePreview<T extends { id: string; name: string; homepageOrder: number | null }>(
  teachers: T[],
  max: number = HOME_TEACHER_PREVIEW_MAX,
): T[] {
  if (teachers.length === 0) return [];
  const slot = (o: number | null) =>
    o != null && Number.isFinite(o) && o >= 1 && o <= max ? Math.floor(o) : null;
  const featured = [...teachers]
    .filter((t) => slot(t.homepageOrder) != null)
    .sort(
      (a, b) =>
        slot(a.homepageOrder)! - slot(b.homepageOrder)! || String(a.id).localeCompare(String(b.id)),
    );
  const seen = new Set(featured.map((t) => t.id));
  const rest = [...teachers]
    .filter((t) => !seen.has(t.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  return [...featured, ...rest].slice(0, max);
}

/** حفظ المدرسين الظاهرين أولاً في قسم الرئيسية (0–4 معرفات بالترتيب) */
export async function setTeacherHomepageFeaturedSlots(orderedIds: string[]): Promise<void> {
  await ensureTeacherHomepageOrderColumn();
  const cleaned = orderedIds.map((x) => String(x ?? "").trim()).filter(Boolean);
  const unique: string[] = [];
  for (const id of cleaned) {
    if (unique.includes(id)) throw new Error("لا يمكن تكرار نفس المدرس");
    unique.push(id);
  }
  if (unique.length > HOME_TEACHER_PREVIEW_MAX) {
    throw new Error(`لا يزيد عن ${HOME_TEACHER_PREVIEW_MAX} مدرسين في الرئيسية`);
  }
  for (const id of unique) {
    const u = await getUserById(id);
    if (!u || u.role !== "TEACHER") throw new Error("معرّف مدرس غير صالح");
  }
  await sql`UPDATE "User" SET teacher_homepage_order = NULL, updated_at = NOW() WHERE role = 'TEACHER'`;
  for (let i = 0; i < unique.length; i++) {
    const ord = i + 1;
    await sql`
      UPDATE "User" SET teacher_homepage_order = ${ord}, updated_at = NOW()
      WHERE id = ${unique[i]} AND role = 'TEACHER'
    `;
  }
}

/** كل حسابات المدرسين — للصفحة الرئيسية (حتى من دون كورس منشور) + دوراته المنشورة داخل البطاقة */
export async function listTeachersForHomepage(): Promise<TeacherHomepageRow[]> {
  try {
    await ensureTeacherHomepageOrderColumn().catch(() => {});
    const rows = await sql`
      SELECT id, name, teacher_subject, teacher_avatar_url, created_at, teacher_homepage_order
      FROM "User"
      WHERE role = 'TEACHER'
      ORDER BY name ASC
    `;
    const teachers = (rows as Record<string, unknown>[]).map((r) => {
      const ho = r.teacher_homepage_order;
      const n = typeof ho === "number" ? ho : Number(ho);
      const homepageOrder =
        Number.isFinite(n) && n >= 1 && n <= HOME_TEACHER_PREVIEW_MAX ? Math.floor(n) : null;
      return {
        id: String(r.id),
        name: String(r.name ?? ""),
        teacherSubject: (r.teacher_subject as string | null) ?? null,
        teacherAvatarUrl: (r.teacher_avatar_url as string | null) ?? null,
        createdAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String((r.created_at as string) ?? new Date().toISOString()),
        homepageOrder,
        courses: [] as TeacherHomepageCourse[],
      };
    });
    if (teachers.length === 0) return [];

    const courseRows = await sql`
      SELECT c.id, c.slug, c.title, c.title_ar, c.created_by_id
      FROM "Course" c
      INNER JOIN "User" u ON u.id = c.created_by_id AND u.role = 'TEACHER'
      WHERE c.is_published = true
      ORDER BY c."order" ASC, c.created_at DESC
    `;
    const byTeacher = new Map<string, TeacherHomepageCourse[]>();
    for (const r of courseRows as Record<string, unknown>[]) {
      const tid = String(r.created_by_id ?? "");
      if (!tid) continue;
      const titleAr = (r.title_ar as string | null)?.trim();
      const title = (r.title as string | null)?.trim() || "دورة";
      const display = titleAr || title;
      const list = byTeacher.get(tid);
      const item: TeacherHomepageCourse = {
        id: String(r.id),
        slug: String(r.slug ?? ""),
        title: display,
      };
      if (list) list.push(item);
      else byTeacher.set(tid, [item]);
    }
    return teachers.map((t) => ({
      ...t,
      courses: byTeacher.get(t.id) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * عند تفعيل «تعدد المدرسين»: معرفات حسابات TEACHER التي يُستبعد دوراتها من القوائم العامة
 * (تُعرض ضمن بطاقة المدرس أو عند ?teacher= فقط).
 */
export async function getTeacherIdsExcludedFromPublicCourseLists(): Promise<Set<string>> {
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) return new Set();
  try {
    const rows = await sql`SELECT id FROM "User" WHERE role = 'TEACHER'`;
    return new Set((rows as { id: unknown }[]).map((r) => String(r.id)));
  } catch {
    return new Set();
  }
}

async function getHomepageSettingsUncached(): Promise<HomepageSetting> {
  try {
    await ensureHomepageHeroTemplateColumns();
    await ensureHomepageHeroSliderCourseIdColumns();
    await ensureHomepageReviewsSectionCopyColumns();
    await ensureHomepageHeroCustomBgColumns();
    await ensureAddBalanceSettingsColumns();
    await ensureHomepageStoreEnabledColumn();
    await ensureHomepageStoreSectionCopyColumns();
    await ensureHomepagePrimaryColorColumn();
    await ensureHomepageHeaderLogoColumn();
    await ensureHomepageTeamSupportLinksColumns();
    await ensureHomepageCtaCopyColumns();
    await ensureHomepageBilingualTextColumns();
    await ensureHomepagePlatformDetailsColumns();
    await ensureHomepagePlatformNewsColumns();
    await ensureHomepageCopyrightOverlayColumns();
    const rows = await sql`SELECT * FROM "HomepageSetting" WHERE id = 'default' LIMIT 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return HOMEPAGE_DEFAULTS;
    const c = rowToCamel(row) as Record<string, unknown>;
    /* أعمدة hero_float_image_1/2/3 تتحول إلى heroFloatImage_1 لا heroFloatImage1 فنقرأ من الصف الخام */
    const heroFloat1 = row.hero_float_image_1 != null && String(row.hero_float_image_1).trim() !== "" ? String(row.hero_float_image_1).trim() : null;
    const heroFloat2 = row.hero_float_image_2 != null && String(row.hero_float_image_2).trim() !== "" ? String(row.hero_float_image_2).trim() : null;
    const heroFloat3 = row.hero_float_image_3 != null && String(row.hero_float_image_3).trim() !== "" ? String(row.hero_float_image_3).trim() : null;
    const sliderImage1 =
      row.hero_slider_image_1 != null && String(row.hero_slider_image_1).trim() !== ""
        ? String(row.hero_slider_image_1).trim().slice(0, 4000)
        : null;
    const sliderImage2 =
      row.hero_slider_image_2 != null && String(row.hero_slider_image_2).trim() !== ""
        ? String(row.hero_slider_image_2).trim().slice(0, 4000)
        : null;
    const sliderImage3 =
      row.hero_slider_image_3 != null && String(row.hero_slider_image_3).trim() !== ""
        ? String(row.hero_slider_image_3).trim().slice(0, 4000)
        : null;
    const sliderImage4 =
      row.hero_slider_image_4 != null && String(row.hero_slider_image_4).trim() !== ""
        ? String(row.hero_slider_image_4).trim().slice(0, 4000)
        : null;
    const sliderImage5 =
      row.hero_slider_image_5 != null && String(row.hero_slider_image_5).trim() !== ""
        ? String(row.hero_slider_image_5).trim().slice(0, 4000)
        : null;
    const readSliderCourseId = (snake: string) => {
      const v = row[snake];
      if (v == null) return null;
      const s = String(v).trim();
      return s.length > 0 ? s.slice(0, 128) : null;
    };
    const sliderIntervalRaw =
      row.hero_slider_interval_ms ??
      (c as { heroSliderIntervalMs?: unknown }).heroSliderIntervalMs;
    const sliderIntervalNum = Number(sliderIntervalRaw);
    const heroSliderIntervalMs =
      Number.isFinite(sliderIntervalNum) && sliderIntervalNum >= 1500 && sliderIntervalNum <= 20000
        ? Math.round(sliderIntervalNum)
        : (HOMEPAGE_DEFAULTS.heroSliderIntervalMs ?? 5000);
    return {
      heroTemplate: (() => {
        const raw = row.hero_template ?? (c as { heroTemplate?: unknown }).heroTemplate;
        const s = raw != null ? String(raw).trim() : "";
        if (s === "classic" || s === "image_slider" || s === "coming_soon") return s;
        return HOMEPAGE_DEFAULTS.heroTemplate ?? "classic";
      })(),
      teacherImageUrl: (c.teacherImageUrl as string) ?? HOMEPAGE_DEFAULTS.teacherImageUrl,
      heroTitle: (c.heroTitle as string) ?? HOMEPAGE_DEFAULTS.heroTitle,
      heroTitleEn:
        row.hero_title_en != null && String(row.hero_title_en).trim() !== ""
          ? String(row.hero_title_en).trim().slice(0, 300)
          : null,
      heroSlogan: (c.heroSlogan as string) ?? HOMEPAGE_DEFAULTS.heroSlogan,
      heroSloganEn:
        row.hero_slogan_en != null && String(row.hero_slogan_en).trim() !== ""
          ? String(row.hero_slogan_en).trim().slice(0, 600)
          : null,
      platformName:
        row.platform_name != null && String(row.platform_name).trim() !== ""
          ? String(row.platform_name).trim()
          : null,
      platformNameEn:
        row.platform_name_en != null && String(row.platform_name_en).trim() !== ""
          ? String(row.platform_name_en).trim().slice(0, 200)
          : null,
      headerLogoUrl: (() => {
        const raw =
          row.header_logo_url ?? (c as { headerLogoUrl?: unknown }).headerLogoUrl;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      primaryColor: (() => {
        const raw = row.primary_color ?? (c as { primaryColor?: unknown }).primaryColor;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 16) : null;
      })(),
      /* لا نستخدم الافتراضي عند الحذف — لو القيمة null أو فارغة نرجع null حتى يختفي الزر */
      youtubeUrl:
        row.youtube_url != null && String(row.youtube_url).trim() !== ""
          ? String(row.youtube_url).trim().slice(0, 4000)
          : null,
      linkedinUrl:
        row.linkedin_url != null && String(row.linkedin_url).trim() !== ""
          ? String(row.linkedin_url).trim().slice(0, 4000)
          : null,
      whatsappUrl: c.whatsappUrl != null && String(c.whatsappUrl).trim() !== "" ? String(c.whatsappUrl).trim() : null,
      facebookUrl: c.facebookUrl != null && String(c.facebookUrl).trim() !== "" ? String(c.facebookUrl).trim() : null,
      telegramUrl:
        row.telegram_url != null && String(row.telegram_url).trim() !== ""
          ? String(row.telegram_url).trim().slice(0, 4000)
          : null,
      teamYoutubeUrl:
        row.team_youtube_url != null && String(row.team_youtube_url).trim() !== ""
          ? String(row.team_youtube_url).trim().slice(0, 4000)
          : null,
      teamLinkedinUrl:
        row.team_linkedin_url != null && String(row.team_linkedin_url).trim() !== ""
          ? String(row.team_linkedin_url).trim().slice(0, 4000)
          : null,
      teamWhatsappUrl:
        row.team_whatsapp_url != null && String(row.team_whatsapp_url).trim() !== ""
          ? String(row.team_whatsapp_url).trim().slice(0, 4000)
          : null,
      teamFacebookUrl:
        row.team_facebook_url != null && String(row.team_facebook_url).trim() !== ""
          ? String(row.team_facebook_url).trim().slice(0, 4000)
          : null,
      teamTelegramUrl:
        row.team_telegram_url != null && String(row.team_telegram_url).trim() !== ""
          ? String(row.team_telegram_url).trim().slice(0, 4000)
          : null,
      socialRightLabel:
        row.social_right_label != null && String(row.social_right_label).trim() !== ""
          ? String(row.social_right_label).trim().slice(0, 120)
          : HOMEPAGE_DEFAULTS.socialRightLabel ?? "الدعم",
      socialRightLabelEn:
        row.social_right_label_en != null && String(row.social_right_label_en).trim() !== ""
          ? String(row.social_right_label_en).trim().slice(0, 120)
          : null,
      socialLeftLabel:
        row.social_left_label != null && String(row.social_left_label).trim() !== ""
          ? String(row.social_left_label).trim().slice(0, 120)
          : HOMEPAGE_DEFAULTS.socialLeftLabel ?? "دعم الفريق",
      socialLeftLabelEn:
        row.social_left_label_en != null && String(row.social_left_label_en).trim() !== ""
          ? String(row.social_left_label_en).trim().slice(0, 120)
          : null,
      socialLeftEnabled:
        row.social_left_enabled === null || row.social_left_enabled === undefined
          ? true
          : Boolean(row.social_left_enabled),
      pageTitle: (c.pageTitle as string) ?? HOMEPAGE_DEFAULTS.pageTitle,
      pageTitleEn:
        row.page_title_en != null && String(row.page_title_en).trim() !== ""
          ? String(row.page_title_en).trim().slice(0, 300)
          : null,
      heroBgPreset: (c.heroBgPreset as string) ?? HOMEPAGE_DEFAULTS.heroBgPreset,
      heroBgCustomFrom: (() => {
        const raw =
          row.hero_bg_custom_from ?? (c as { heroBgCustomFrom?: unknown }).heroBgCustomFrom;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 16) : null;
      })(),
      heroBgCustomTo: (() => {
        const raw = row.hero_bg_custom_to ?? (c as { heroBgCustomTo?: unknown }).heroBgCustomTo;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 16) : null;
      })(),
      heroFloatImage1: heroFloat1 ?? HOMEPAGE_DEFAULTS.heroFloatImage1,
      heroFloatImage2: heroFloat2 ?? HOMEPAGE_DEFAULTS.heroFloatImage2,
      heroFloatImage3: heroFloat3 ?? HOMEPAGE_DEFAULTS.heroFloatImage3,
      heroSliderImage1: sliderImage1,
      heroSliderImage2: sliderImage2,
      heroSliderImage3: sliderImage3,
      heroSliderImage4: sliderImage4,
      heroSliderImage5: sliderImage5,
      heroSliderCourseId1: readSliderCourseId("hero_slider_course_id_1"),
      heroSliderCourseId2: readSliderCourseId("hero_slider_course_id_2"),
      heroSliderCourseId3: readSliderCourseId("hero_slider_course_id_3"),
      heroSliderCourseId4: readSliderCourseId("hero_slider_course_id_4"),
      heroSliderCourseId5: readSliderCourseId("hero_slider_course_id_5"),
      heroSliderIntervalMs,
      hero3Title: (() => {
        const raw = row.hero3_title ?? (c as { hero3Title?: unknown }).hero3Title;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 300);
        return HOMEPAGE_DEFAULTS.hero3Title ?? null;
      })(),
      hero3TitleEn: (() => {
        const raw = row.hero3_title_en ?? (c as { hero3TitleEn?: unknown }).hero3TitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 300) : null;
      })(),
      hero3Subtitle: (() => {
        const raw = row.hero3_subtitle ?? (c as { hero3Subtitle?: unknown }).hero3Subtitle;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 600);
        return HOMEPAGE_DEFAULTS.hero3Subtitle ?? null;
      })(),
      hero3SubtitleEn: (() => {
        const raw = row.hero3_subtitle_en ?? (c as { hero3SubtitleEn?: unknown }).hero3SubtitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 600) : null;
      })(),
      hero3PhoneImageUrl: (() => {
        const raw =
          row.hero3_phone_image_url ??
          (c as { hero3PhoneImageUrl?: unknown }).hero3PhoneImageUrl;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      hero3PhoneBgColor: (() => {
        const raw =
          row.hero3_phone_bg_color ?? (c as { hero3PhoneBgColor?: unknown }).hero3PhoneBgColor;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 16);
        return HOMEPAGE_DEFAULTS.hero3PhoneBgColor ?? null;
      })(),
      hero3StoreBadge1ImageUrl: (() => {
        const raw =
          row.hero3_store_badge_1_image_url ??
          (c as { hero3StoreBadge1ImageUrl?: unknown }).hero3StoreBadge1ImageUrl;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      hero3StoreBadge1Link: (() => {
        const raw =
          row.hero3_store_badge_1_link ??
          (c as { hero3StoreBadge1Link?: unknown }).hero3StoreBadge1Link;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      hero3StoreBadge2ImageUrl: (() => {
        const raw =
          row.hero3_store_badge_2_image_url ??
          (c as { hero3StoreBadge2ImageUrl?: unknown }).hero3StoreBadge2ImageUrl;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      hero3StoreBadge2Link: (() => {
        const raw =
          row.hero3_store_badge_2_link ??
          (c as { hero3StoreBadge2Link?: unknown }).hero3StoreBadge2Link;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 4000) : null;
      })(),
      footerTitle: (c.footerTitle as string) ?? HOMEPAGE_DEFAULTS.footerTitle,
      footerTitleEn:
        row.footer_title_en != null && String(row.footer_title_en).trim() !== ""
          ? String(row.footer_title_en).trim().slice(0, 300)
          : null,
      footerTagline: (c.footerTagline as string) ?? HOMEPAGE_DEFAULTS.footerTagline,
      footerTaglineEn:
        row.footer_tagline_en != null && String(row.footer_tagline_en).trim() !== ""
          ? String(row.footer_tagline_en).trim().slice(0, 500)
          : null,
      footerCopyright: (c.footerCopyright as string) ?? HOMEPAGE_DEFAULTS.footerCopyright,
      footerCopyrightEn:
        row.footer_copyright_en != null && String(row.footer_copyright_en).trim() !== ""
          ? String(row.footer_copyright_en).trim().slice(0, 500)
          : null,
      reviewsSectionTitle: pickReviewsSectionString(
        row,
        c,
        "reviews_section_title",
        "reviewsSectionTitle",
        HOMEPAGE_DEFAULTS.reviewsSectionTitle,
      ),
      reviewsSectionTitleEn: pickReviewsSectionString(
        row,
        c,
        "reviews_section_title_en",
        "reviewsSectionTitleEn",
        null,
      ),
      reviewsSectionSubtitle: pickReviewsSectionString(
        row,
        c,
        "reviews_section_subtitle",
        "reviewsSectionSubtitle",
        HOMEPAGE_DEFAULTS.reviewsSectionSubtitle,
      ),
      reviewsSectionSubtitleEn: pickReviewsSectionString(
        row,
        c,
        "reviews_section_subtitle_en",
        "reviewsSectionSubtitleEn",
        null,
      ),
      ctaBadgeText: (() => {
        const raw = row.cta_badge_text ?? (c as { ctaBadgeText?: unknown }).ctaBadgeText;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 120);
        return HOMEPAGE_DEFAULTS.ctaBadgeText ?? null;
      })(),
      ctaBadgeTextEn: (() => {
        const raw = row.cta_badge_text_en ?? (c as { ctaBadgeTextEn?: unknown }).ctaBadgeTextEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 120) : null;
      })(),
      ctaTitle: (() => {
        const raw = row.cta_title ?? (c as { ctaTitle?: unknown }).ctaTitle;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 300);
        return HOMEPAGE_DEFAULTS.ctaTitle ?? null;
      })(),
      ctaTitleEn: (() => {
        const raw = row.cta_title_en ?? (c as { ctaTitleEn?: unknown }).ctaTitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 300) : null;
      })(),
      ctaDescription: (() => {
        const raw = row.cta_description ?? (c as { ctaDescription?: unknown }).ctaDescription;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 2000);
        return HOMEPAGE_DEFAULTS.ctaDescription ?? null;
      })(),
      ctaDescriptionEn: (() => {
        const raw = row.cta_description_en ?? (c as { ctaDescriptionEn?: unknown }).ctaDescriptionEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 2000) : null;
      })(),
      ctaButtonText: (() => {
        const raw = row.cta_button_text ?? (c as { ctaButtonText?: unknown }).ctaButtonText;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 120);
        return HOMEPAGE_DEFAULTS.ctaButtonText ?? null;
      })(),
      ctaButtonTextEn: (() => {
        const raw = row.cta_button_text_en ?? (c as { ctaButtonTextEn?: unknown }).ctaButtonTextEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 120) : null;
      })(),
      teachersEnabled: Boolean(
        (row as { teachers_enabled?: boolean }).teachers_enabled ??
          (c as { teachersEnabled?: boolean }).teachersEnabled,
      ),
      subscriptionsEnabled: Boolean(
        (row as { subscriptions_enabled?: boolean }).subscriptions_enabled ??
          (c as { subscriptionsEnabled?: boolean }).subscriptionsEnabled,
      ),
      storeEnabled: Boolean(
        (row as { store_enabled?: boolean }).store_enabled ??
          (c as { storeEnabled?: boolean }).storeEnabled,
      ),
      storeSectionTitle: pickReviewsSectionString(
        row,
        c,
        "store_section_title",
        "storeSectionTitle",
        HOMEPAGE_DEFAULTS.storeSectionTitle ?? "متجر المنصة",
      ),
      storeSectionTitleEn: pickReviewsSectionString(
        row,
        c,
        "store_section_title_en",
        "storeSectionTitleEn",
        null,
      ),
      storeSectionDescription: (() => {
        const raw =
          row.store_section_description ??
          (c as { storeSectionDescription?: unknown }).storeSectionDescription;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 2000);
        return HOMEPAGE_DEFAULTS.storeSectionDescription ?? null;
      })(),
      storeSectionDescriptionEn: (() => {
        const raw =
          row.store_section_description_en ??
          (c as { storeSectionDescriptionEn?: unknown }).storeSectionDescriptionEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 2000) : null;
      })(),
      platformDetailsEnabled: Boolean(
        (row as { platform_details_enabled?: boolean }).platform_details_enabled ??
          (c as { platformDetailsEnabled?: boolean }).platformDetailsEnabled,
      ),
      platformDetailsTitle: (() => {
        const raw =
          row.platform_details_title ??
          (c as { platformDetailsTitle?: unknown }).platformDetailsTitle;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 240);
        return HOMEPAGE_DEFAULTS.platformDetailsTitle ?? null;
      })(),
      platformDetailsTitleEn: (() => {
        const raw =
          row.platform_details_title_en ??
          (c as { platformDetailsTitleEn?: unknown }).platformDetailsTitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 240) : null;
      })(),
      platformDetailsSubtitle: (() => {
        const raw =
          row.platform_details_subtitle ??
          (c as { platformDetailsSubtitle?: unknown }).platformDetailsSubtitle;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 500);
        return HOMEPAGE_DEFAULTS.platformDetailsSubtitle ?? null;
      })(),
      platformDetailsSubtitleEn: (() => {
        const raw =
          row.platform_details_subtitle_en ??
          (c as { platformDetailsSubtitleEn?: unknown }).platformDetailsSubtitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 500) : null;
      })(),
      platformDetailsBackgroundColor: (() => {
        const raw =
          row.platform_details_background_color ??
          (c as { platformDetailsBackgroundColor?: unknown }).platformDetailsBackgroundColor;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 16);
        return HOMEPAGE_DEFAULTS.platformDetailsBackgroundColor ?? null;
      })(),
      platformDetailsItems: (() => {
        const raw =
          row.platform_details_items ??
          (c as { platformDetailsItems?: unknown }).platformDetailsItems;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 12000);
        return HOMEPAGE_DEFAULTS.platformDetailsItems ?? "[]";
      })(),
      platformNewsEnabled: Boolean(
        (row as { platform_news_enabled?: boolean }).platform_news_enabled ??
          (c as { platformNewsEnabled?: boolean }).platformNewsEnabled,
      ),
      platformNewsItems: (() => {
        const raw =
          row.platform_news_items ?? (c as { platformNewsItems?: unknown }).platformNewsItems;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 12000);
        return HOMEPAGE_DEFAULTS.platformNewsItems ?? "[]";
      })(),
      platformNewsSectionTitle: (() => {
        const raw =
          row.platform_news_section_title ??
          (c as { platformNewsSectionTitle?: unknown }).platformNewsSectionTitle;
        const s = raw != null ? String(raw).trim() : "";
        if (s.length > 0) return s.slice(0, 240);
        return HOMEPAGE_DEFAULTS.platformNewsSectionTitle ?? "أخبار المنصة";
      })(),
      platformNewsSectionTitleEn: (() => {
        const raw =
          row.platform_news_section_title_en ??
          (c as { platformNewsSectionTitleEn?: unknown }).platformNewsSectionTitleEn;
        const s = raw != null ? String(raw).trim() : "";
        return s.length > 0 ? s.slice(0, 240) : null;
      })(),
      addBalanceTitle: (c.addBalanceTitle as string) ?? HOMEPAGE_DEFAULTS.addBalanceTitle,
      addBalanceTitleEn:
        row.add_balance_title_en != null && String(row.add_balance_title_en).trim() !== ""
          ? String(row.add_balance_title_en).trim().slice(0, 300)
          : null,
      addBalanceSubtitle:
        (c.addBalanceSubtitle as string) ?? HOMEPAGE_DEFAULTS.addBalanceSubtitle,
      addBalanceSubtitleEn:
        row.add_balance_subtitle_en != null && String(row.add_balance_subtitle_en).trim() !== ""
          ? String(row.add_balance_subtitle_en).trim().slice(0, 600)
          : null,
      addBalanceMethodTitle:
        (c.addBalanceMethodTitle as string) ?? HOMEPAGE_DEFAULTS.addBalanceMethodTitle,
      addBalanceMethodTitleEn:
        row.add_balance_method_title_en != null &&
        String(row.add_balance_method_title_en).trim() !== ""
          ? String(row.add_balance_method_title_en).trim().slice(0, 300)
          : null,
      addBalanceTransferInstruction:
        (c.addBalanceTransferInstruction as string) ??
        HOMEPAGE_DEFAULTS.addBalanceTransferInstruction,
      addBalanceTransferInstructionEn:
        row.add_balance_transfer_instruction_en != null &&
        String(row.add_balance_transfer_instruction_en).trim() !== ""
          ? String(row.add_balance_transfer_instruction_en).trim().slice(0, 1000)
          : null,
      addBalanceWalletNumber:
        (c.addBalanceWalletNumber as string) ?? HOMEPAGE_DEFAULTS.addBalanceWalletNumber,
      addBalanceConfirmationNote:
        (c.addBalanceConfirmationNote as string) ??
        HOMEPAGE_DEFAULTS.addBalanceConfirmationNote,
      addBalanceConfirmationNoteEn:
        row.add_balance_confirmation_note_en != null &&
        String(row.add_balance_confirmation_note_en).trim() !== ""
          ? String(row.add_balance_confirmation_note_en).trim().slice(0, 1000)
          : null,
      addBalanceWhatsappNumber:
        (c.addBalanceWhatsappNumber as string) ??
        HOMEPAGE_DEFAULTS.addBalanceWhatsappNumber,
      addBalanceWhatsappButtonText:
        (c.addBalanceWhatsappButtonText as string) ??
        HOMEPAGE_DEFAULTS.addBalanceWhatsappButtonText,
      addBalanceWhatsappButtonTextEn:
        row.add_balance_whatsapp_button_text_en != null &&
        String(row.add_balance_whatsapp_button_text_en).trim() !== ""
          ? String(row.add_balance_whatsapp_button_text_en).trim().slice(0, 200)
          : null,
      addBalanceWaitingNote:
        (c.addBalanceWaitingNote as string) ?? HOMEPAGE_DEFAULTS.addBalanceWaitingNote,
      addBalanceWaitingNoteEn:
        row.add_balance_waiting_note_en != null &&
        String(row.add_balance_waiting_note_en).trim() !== ""
          ? String(row.add_balance_waiting_note_en).trim().slice(0, 1000)
          : null,
      copyrightOverlayStyle: (() => {
        const raw =
          row.copyright_overlay_style ??
          (c as { copyrightOverlayStyle?: unknown }).copyrightOverlayStyle;
        const s = raw != null ? String(raw).trim().toLowerCase() : "";
        return s === "watermark" ? "watermark" : "floating";
      })(),
    };
  } catch {
    return HOMEPAGE_DEFAULTS;
  }
}

/** نفس الطلب (layout + metadata + الصفحة) يقرأ الإعدادات مرة واحدة فقط */
export const getHomepageSettings = cache(getHomepageSettingsUncached);

function pickReviewsSectionString(
  row: Record<string, unknown>,
  camel: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  fallback: string | null,
): string | null {
  const raw = row[snakeKey] ?? camel[camelKey];
  const s = raw != null ? String(raw).trim() : "";
  if (s.length > 0) return s.slice(0, 400);
  return fallback ?? null;
}

export async function updateHomepageSettings(data: {
  hero_template?: string | null;
  teacher_image_url?: string | null;
  hero_title?: string | null;
  hero_title_en?: string | null;
  hero_slogan?: string | null;
  hero_slogan_en?: string | null;
  platform_name?: string | null;
  platform_name_en?: string | null;
  header_logo_url?: string | null;
  primary_color?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
  whatsapp_url?: string | null;
  facebook_url?: string | null;
  telegram_url?: string | null;
  team_youtube_url?: string | null;
  team_linkedin_url?: string | null;
  team_whatsapp_url?: string | null;
  team_facebook_url?: string | null;
  team_telegram_url?: string | null;
  social_right_label?: string | null;
  social_right_label_en?: string | null;
  social_left_label?: string | null;
  social_left_label_en?: string | null;
  social_left_enabled?: boolean;
  page_title?: string | null;
  page_title_en?: string | null;
  hero_bg_preset?: string | null;
  hero_bg_custom_from?: string | null;
  hero_bg_custom_to?: string | null;
  hero_float_image_1?: string | null;
  hero_float_image_2?: string | null;
  hero_float_image_3?: string | null;
  hero_slider_image_1?: string | null;
  hero_slider_image_2?: string | null;
  hero_slider_image_3?: string | null;
  hero_slider_image_4?: string | null;
  hero_slider_image_5?: string | null;
  hero_slider_course_id_1?: string | null;
  hero_slider_course_id_2?: string | null;
  hero_slider_course_id_3?: string | null;
  hero_slider_course_id_4?: string | null;
  hero_slider_course_id_5?: string | null;
  hero_slider_interval_ms?: number | null;
  hero3_title?: string | null;
  hero3_title_en?: string | null;
  hero3_subtitle?: string | null;
  hero3_subtitle_en?: string | null;
  hero3_phone_image_url?: string | null;
  hero3_phone_bg_color?: string | null;
  hero3_store_badge_1_image_url?: string | null;
  hero3_store_badge_1_link?: string | null;
  hero3_store_badge_2_image_url?: string | null;
  hero3_store_badge_2_link?: string | null;
  footer_title?: string | null;
  footer_title_en?: string | null;
  footer_tagline?: string | null;
  footer_tagline_en?: string | null;
  footer_copyright?: string | null;
  footer_copyright_en?: string | null;
  reviews_section_title?: string | null;
  reviews_section_title_en?: string | null;
  reviews_section_subtitle?: string | null;
  reviews_section_subtitle_en?: string | null;
  cta_badge_text?: string | null;
  cta_badge_text_en?: string | null;
  cta_title?: string | null;
  cta_title_en?: string | null;
  cta_description?: string | null;
  cta_description_en?: string | null;
  cta_button_text?: string | null;
  cta_button_text_en?: string | null;
  teachers_enabled?: boolean;
  subscriptions_enabled?: boolean;
  store_enabled?: boolean;
  store_section_title?: string | null;
  store_section_title_en?: string | null;
  store_section_description?: string | null;
  store_section_description_en?: string | null;
  platform_details_enabled?: boolean;
  platform_details_title?: string | null;
  platform_details_title_en?: string | null;
  platform_details_subtitle?: string | null;
  platform_details_subtitle_en?: string | null;
  platform_details_background_color?: string | null;
  platform_details_items?: string | null;
  add_balance_title?: string | null;
  add_balance_title_en?: string | null;
  add_balance_subtitle?: string | null;
  add_balance_subtitle_en?: string | null;
  add_balance_method_title?: string | null;
  add_balance_method_title_en?: string | null;
  add_balance_transfer_instruction?: string | null;
  add_balance_transfer_instruction_en?: string | null;
  add_balance_wallet_number?: string | null;
  add_balance_confirmation_note?: string | null;
  add_balance_confirmation_note_en?: string | null;
  add_balance_whatsapp_number?: string | null;
  add_balance_whatsapp_button_text?: string | null;
  add_balance_whatsapp_button_text_en?: string | null;
  add_balance_waiting_note?: string | null;
  add_balance_waiting_note_en?: string | null;
  copyright_overlay_style?: "floating" | "watermark" | null;
  platform_news_enabled?: boolean;
  platform_news_items?: string | null;
  platform_news_section_title?: string | null;
  platform_news_section_title_en?: string | null;
}): Promise<void> {
  await ensureHomepageHeroTemplateColumns();
  await ensureHomepageHeroSliderCourseIdColumns();
  await ensureHomepageReviewsSectionCopyColumns();
  await ensureHomepageHeroCustomBgColumns();
  await ensureAddBalanceSettingsColumns();
  await ensureHomepagePrimaryColorColumn();
  await ensureHomepageHeaderLogoColumn();
  await ensureHomepageTeamSupportLinksColumns();
  await ensureHomepageCtaCopyColumns();
  await ensureHomepageBilingualTextColumns();
  await ensureHomepagePlatformDetailsColumns();
  await ensureHomepagePlatformNewsColumns();
  await ensureHomepageCopyrightOverlayColumns();
  if (data.hero_template !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_template = ${data.hero_template}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.teacher_image_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET teacher_image_url = ${data.teacher_image_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_title = ${data.hero_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_title_en = ${data.hero_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slogan !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slogan = ${data.hero_slogan}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slogan_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slogan_en = ${data.hero_slogan_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_name !== undefined) {
    await sql`UPDATE "HomepageSetting" SET platform_name = ${data.platform_name}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_name_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET platform_name_en = ${data.platform_name_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.header_logo_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET header_logo_url = ${data.header_logo_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.primary_color !== undefined) {
    await sql`UPDATE "HomepageSetting" SET primary_color = ${data.primary_color}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.youtube_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET youtube_url = ${data.youtube_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.linkedin_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET linkedin_url = ${data.linkedin_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.whatsapp_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET whatsapp_url = ${data.whatsapp_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.facebook_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET facebook_url = ${data.facebook_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.telegram_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET telegram_url = ${data.telegram_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.team_youtube_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET team_youtube_url = ${data.team_youtube_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.team_linkedin_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET team_linkedin_url = ${data.team_linkedin_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.team_whatsapp_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET team_whatsapp_url = ${data.team_whatsapp_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.team_facebook_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET team_facebook_url = ${data.team_facebook_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.team_telegram_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET team_telegram_url = ${data.team_telegram_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.social_right_label !== undefined) {
    await sql`UPDATE "HomepageSetting" SET social_right_label = ${data.social_right_label}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.social_right_label_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET social_right_label_en = ${data.social_right_label_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.social_left_label !== undefined) {
    await sql`UPDATE "HomepageSetting" SET social_left_label = ${data.social_left_label}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.social_left_label_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET social_left_label_en = ${data.social_left_label_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.social_left_enabled !== undefined) {
    await sql`UPDATE "HomepageSetting" SET social_left_enabled = ${data.social_left_enabled}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.page_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET page_title = ${data.page_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.page_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET page_title_en = ${data.page_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_bg_preset !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_bg_preset = ${data.hero_bg_preset}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_bg_custom_from !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_bg_custom_from = ${data.hero_bg_custom_from}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_bg_custom_to !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_bg_custom_to = ${data.hero_bg_custom_to}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_float_image_1 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_float_image_1 = ${data.hero_float_image_1}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_float_image_2 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_float_image_2 = ${data.hero_float_image_2}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_float_image_3 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_float_image_3 = ${data.hero_float_image_3}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_image_1 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_image_1 = ${data.hero_slider_image_1}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_image_2 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_image_2 = ${data.hero_slider_image_2}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_image_3 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_image_3 = ${data.hero_slider_image_3}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_image_4 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_image_4 = ${data.hero_slider_image_4}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_image_5 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_image_5 = ${data.hero_slider_image_5}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_course_id_1 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_course_id_1 = ${data.hero_slider_course_id_1}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_course_id_2 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_course_id_2 = ${data.hero_slider_course_id_2}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_course_id_3 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_course_id_3 = ${data.hero_slider_course_id_3}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_course_id_4 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_course_id_4 = ${data.hero_slider_course_id_4}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_course_id_5 !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_course_id_5 = ${data.hero_slider_course_id_5}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slider_interval_ms !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slider_interval_ms = ${data.hero_slider_interval_ms}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_title = ${data.hero3_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_title_en = ${data.hero3_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_subtitle !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_subtitle = ${data.hero3_subtitle}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_subtitle_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_subtitle_en = ${data.hero3_subtitle_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_phone_image_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_phone_image_url = ${data.hero3_phone_image_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_phone_bg_color !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_phone_bg_color = ${data.hero3_phone_bg_color}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_store_badge_1_image_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_store_badge_1_image_url = ${data.hero3_store_badge_1_image_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_store_badge_1_link !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_store_badge_1_link = ${data.hero3_store_badge_1_link}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_store_badge_2_image_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_store_badge_2_image_url = ${data.hero3_store_badge_2_image_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero3_store_badge_2_link !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero3_store_badge_2_link = ${data.hero3_store_badge_2_link}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_title = ${data.footer_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_title_en = ${data.footer_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_tagline !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_tagline = ${data.footer_tagline}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_tagline_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_tagline_en = ${data.footer_tagline_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_copyright !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_copyright = ${data.footer_copyright}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_copyright_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_copyright_en = ${data.footer_copyright_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.reviews_section_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET reviews_section_title = ${data.reviews_section_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.reviews_section_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET reviews_section_title_en = ${data.reviews_section_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.reviews_section_subtitle !== undefined) {
    await sql`UPDATE "HomepageSetting" SET reviews_section_subtitle = ${data.reviews_section_subtitle}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.reviews_section_subtitle_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET reviews_section_subtitle_en = ${data.reviews_section_subtitle_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_badge_text !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_badge_text = ${data.cta_badge_text}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_badge_text_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_badge_text_en = ${data.cta_badge_text_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_title = ${data.cta_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_title_en = ${data.cta_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_description !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_description = ${data.cta_description}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_description_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_description_en = ${data.cta_description_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_button_text !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_button_text = ${data.cta_button_text}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.cta_button_text_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET cta_button_text_en = ${data.cta_button_text_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.teachers_enabled !== undefined) {
    await ensureHomepageTeachersEnabledColumn();
    await sql`
      INSERT INTO "HomepageSetting" (id, teachers_enabled, updated_at)
      VALUES ('default', ${data.teachers_enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        teachers_enabled = EXCLUDED.teachers_enabled,
        updated_at = NOW()
    `;
  }
  if (data.subscriptions_enabled !== undefined) {
    await ensureHomepageSubscriptionsEnabledColumn();
    await sql`
      INSERT INTO "HomepageSetting" (id, subscriptions_enabled, updated_at)
      VALUES ('default', ${data.subscriptions_enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        subscriptions_enabled = EXCLUDED.subscriptions_enabled,
        updated_at = NOW()
    `;
  }
  if (data.store_enabled !== undefined) {
    await ensureHomepageStoreEnabledColumn();
    await sql`
      INSERT INTO "HomepageSetting" (id, store_enabled, updated_at)
      VALUES ('default', ${data.store_enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        store_enabled = EXCLUDED.store_enabled,
        updated_at = NOW()
    `;
  }
  if (data.store_section_title !== undefined) {
    await ensureHomepageStoreSectionCopyColumns();
    await sql`UPDATE "HomepageSetting" SET store_section_title = ${data.store_section_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.store_section_title_en !== undefined) {
    await ensureHomepageStoreSectionCopyColumns();
    await sql`UPDATE "HomepageSetting" SET store_section_title_en = ${data.store_section_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.store_section_description !== undefined) {
    await ensureHomepageStoreSectionCopyColumns();
    await sql`UPDATE "HomepageSetting" SET store_section_description = ${data.store_section_description}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.store_section_description_en !== undefined) {
    await ensureHomepageStoreSectionCopyColumns();
    await sql`UPDATE "HomepageSetting" SET store_section_description_en = ${data.store_section_description_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_enabled !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`
      INSERT INTO "HomepageSetting" (id, platform_details_enabled, updated_at)
      VALUES ('default', ${data.platform_details_enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        platform_details_enabled = EXCLUDED.platform_details_enabled,
        updated_at = NOW()
    `;
  }
  if (data.platform_details_title !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_title = ${data.platform_details_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_title_en !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_title_en = ${data.platform_details_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_subtitle !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_subtitle = ${data.platform_details_subtitle}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_subtitle_en !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_subtitle_en = ${data.platform_details_subtitle_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_background_color !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_background_color = ${data.platform_details_background_color}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_details_items !== undefined) {
    await ensureHomepagePlatformDetailsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_details_items = ${data.platform_details_items}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_news_enabled !== undefined) {
    await ensureHomepagePlatformNewsColumns();
    await sql`
      INSERT INTO "HomepageSetting" (id, platform_news_enabled, updated_at)
      VALUES ('default', ${data.platform_news_enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        platform_news_enabled = EXCLUDED.platform_news_enabled,
        updated_at = NOW()
    `;
  }
  if (data.platform_news_items !== undefined) {
    await ensureHomepagePlatformNewsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_news_items = ${data.platform_news_items}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_news_section_title !== undefined) {
    await ensureHomepagePlatformNewsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_news_section_title = ${data.platform_news_section_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_news_section_title_en !== undefined) {
    await ensureHomepagePlatformNewsColumns();
    await sql`UPDATE "HomepageSetting" SET platform_news_section_title_en = ${data.platform_news_section_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_title = ${data.add_balance_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_title_en = ${data.add_balance_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_subtitle !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_subtitle = ${data.add_balance_subtitle}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_subtitle_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_subtitle_en = ${data.add_balance_subtitle_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_method_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_method_title = ${data.add_balance_method_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_method_title_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_method_title_en = ${data.add_balance_method_title_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_transfer_instruction !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_transfer_instruction = ${data.add_balance_transfer_instruction}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_transfer_instruction_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_transfer_instruction_en = ${data.add_balance_transfer_instruction_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_wallet_number !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_wallet_number = ${data.add_balance_wallet_number}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_confirmation_note !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_confirmation_note = ${data.add_balance_confirmation_note}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_confirmation_note_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_confirmation_note_en = ${data.add_balance_confirmation_note_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_whatsapp_number !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_whatsapp_number = ${data.add_balance_whatsapp_number}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_whatsapp_button_text !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_whatsapp_button_text = ${data.add_balance_whatsapp_button_text}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_whatsapp_button_text_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_whatsapp_button_text_en = ${data.add_balance_whatsapp_button_text_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_waiting_note !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_waiting_note = ${data.add_balance_waiting_note}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.add_balance_waiting_note_en !== undefined) {
    await sql`UPDATE "HomepageSetting" SET add_balance_waiting_note_en = ${data.add_balance_waiting_note_en}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.copyright_overlay_style !== undefined) {
    await ensureHomepageCopyrightOverlayColumns();
    await sql`UPDATE "HomepageSetting" SET copyright_overlay_style = ${data.copyright_overlay_style}, updated_at = NOW() WHERE id = 'default'`;
  }
}

// ----- اشتراكات المنصة الشاملة (كل الدورات المدفوعة أثناء الاشتراك النشط) -----
let platformSubscriptionSchemaEnsured = false;

async function ensurePlatformSubscriptionSchema(): Promise<void> {
  if (platformSubscriptionSchemaEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        duration_kind TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT subscription_plan_duration_chk CHECK (duration_kind IN ('week', 'month', 'year'))
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS "UserPlatformSubscription" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        plan_id TEXT REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL,
        price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "UserPlatformSubscription_user_expires_idx" ON "UserPlatformSubscription"(user_id, expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS "SubscriptionPlan_active_sort_idx" ON "SubscriptionPlan"(is_active, sort_order)`;
    platformSubscriptionSchemaEnsured = true;
  } catch {
    /* إنشاء الجداول قد يفشل بدون صلاحية CREATE */
  }
}

export async function getSubscriptionsFeatureEnabled(): Promise<boolean> {
  try {
    await ensureHomepageSubscriptionsEnabledColumn();
    const rows = await sql`SELECT subscriptions_enabled FROM "HomepageSetting" WHERE id = 'default' LIMIT 1`;
    const v = (rows[0] as { subscriptions_enabled?: boolean } | undefined)?.subscriptions_enabled;
    return !!v;
  } catch {
    return false;
  }
}

export async function setSubscriptionsFeatureEnabled(enabled: boolean): Promise<void> {
  await ensureHomepageSubscriptionsEnabledColumn();
  await sql`
    INSERT INTO "HomepageSetting" (id, subscriptions_enabled, updated_at)
    VALUES ('default', ${enabled}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      subscriptions_enabled = EXCLUDED.subscriptions_enabled,
      updated_at = NOW()
  `;
}

export async function getStoreFeatureEnabled(): Promise<boolean> {
  try {
    await ensureHomepageStoreEnabledColumn();
    const rows = await sql`SELECT store_enabled FROM "HomepageSetting" WHERE id = 'default' LIMIT 1`;
    const v = (rows[0] as { store_enabled?: boolean } | undefined)?.store_enabled;
    return !!v;
  } catch {
    return false;
  }
}

export async function setStoreFeatureEnabled(enabled: boolean): Promise<void> {
  await ensureHomepageStoreEnabledColumn();
  await sql`
    INSERT INTO "HomepageSetting" (id, store_enabled, updated_at)
    VALUES ('default', ${enabled}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      store_enabled = EXCLUDED.store_enabled,
      updated_at = NOW()
  `;
}

let storeProductsSchemaEnsured = false;

async function ensureStoreProductsSchema(): Promise<void> {
  if (storeProductsSchemaEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "StoreProduct" (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        image_url TEXT,
        pdf_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "StoreProduct_active_sort_idx" ON "StoreProduct"(is_active, sort_order, created_at DESC)`;
    await sql`ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0`;
    storeProductsSchemaEnsured = true;
  } catch {
    /* DDL غير متاح */
  }
}

export type StoreProductRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  /** تكلفة الوحدة (للأدمن) — تُستخدم في تقدير الربح لكل عملية بيع */
  costPrice: number;
  imageUrl: string | null;
  pdfUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

function mapStoreProduct(r: Record<string, unknown>): StoreProductRow {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    price: Number(r.price ?? 0),
    costPrice: Number(r.cost_price ?? 0),
    imageUrl: r.image_url ? String(r.image_url) : null,
    pdfUrl: r.pdf_url ? String(r.pdf_url) : null,
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at ?? new Date().toISOString()),
  };
}

export async function listStoreProductsPublic(): Promise<StoreProductRow[]> {
  try {
    await ensureStoreProductsSchema();
    const rows = await sql`
      SELECT id, title, description, price, image_url, pdf_url, is_active, sort_order, created_at
      FROM "StoreProduct"
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map(mapStoreProduct);
  } catch {
    return [];
  }
}

export async function listStoreProductsAll(): Promise<StoreProductRow[]> {
  await ensureStoreProductsSchema();
  const rows = await sql`
    SELECT id, title, description, price, cost_price, image_url, pdf_url, is_active, sort_order, created_at
    FROM "StoreProduct"
    ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapStoreProduct);
}

export async function createStoreProduct(data: {
  title: string;
  description: string;
  price: number;
  cost_price?: number;
  image_url?: string | null;
  pdf_url?: string | null;
  is_active?: boolean;
}): Promise<{ id: string }> {
  await ensureStoreProductsSchema();
  const id = generateId();
  const unitCost =
    data.cost_price !== undefined && Number.isFinite(data.cost_price) ? Math.max(0, data.cost_price) : 0;
  await sql`
    INSERT INTO "StoreProduct" (id, title, description, price, cost_price, image_url, pdf_url, is_active, sort_order)
    VALUES (
      ${id},
      ${data.title.trim()},
      ${data.description.trim() || ""},
      ${Math.max(0, data.price)},
      ${unitCost},
      ${data.image_url?.trim() || null},
      ${data.pdf_url?.trim() || null},
      ${data.is_active !== false},
      0
    )
  `;
  return { id };
}

export async function updateStoreProduct(
  id: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    cost_price?: number;
    image_url?: string | null;
    pdf_url?: string | null;
    is_active?: boolean;
  },
): Promise<void> {
  await ensureStoreProductsSchema();
  const pid = id.trim();
  if (!pid) throw new Error("معرّف المنتج مطلوب");
  if (data.title !== undefined) await sql`UPDATE "StoreProduct" SET title = ${data.title.trim()}, updated_at = NOW() WHERE id = ${pid}`;
  if (data.description !== undefined) await sql`UPDATE "StoreProduct" SET description = ${data.description.trim()}, updated_at = NOW() WHERE id = ${pid}`;
  if (data.price !== undefined) await sql`UPDATE "StoreProduct" SET price = ${Math.max(0, data.price)}, updated_at = NOW() WHERE id = ${pid}`;
  if (data.cost_price !== undefined) {
    await sql`UPDATE "StoreProduct" SET cost_price = ${Math.max(0, data.cost_price)}, updated_at = NOW() WHERE id = ${pid}`;
  }
  if (data.image_url !== undefined) await sql`UPDATE "StoreProduct" SET image_url = ${data.image_url?.trim() || null}, updated_at = NOW() WHERE id = ${pid}`;
  if (data.pdf_url !== undefined) await sql`UPDATE "StoreProduct" SET pdf_url = ${data.pdf_url?.trim() || null}, updated_at = NOW() WHERE id = ${pid}`;
  if (data.is_active !== undefined) await sql`UPDATE "StoreProduct" SET is_active = ${data.is_active}, updated_at = NOW() WHERE id = ${pid}`;
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await ensureStoreProductsSchema();
  await sql`DELETE FROM "StoreProduct" WHERE id = ${id.trim()}`;
}

let storePurchasesSchemaEnsured = false;

async function ensureStorePurchasesSchema(): Promise<void> {
  if (storePurchasesSchemaEnsured) return;
  try {
    await ensureStoreProductsSchema();
    await sql`
      CREATE TABLE IF NOT EXISTS "UserStorePurchase" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES "StoreProduct"(id) ON DELETE CASCADE,
        price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "UserStorePurchase_user_idx" ON "UserStorePurchase"(user_id, created_at DESC)`;
    storePurchasesSchemaEnsured = true;
  } catch {
    /* DDL غير متاح */
  }
}

export type StudentStorePurchaseRow = {
  purchaseId: string;
  productId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  pdfUrl: string | null;
  pricePaid: number;
  createdAt: string;
};

export type AdminStorePurchaseRow = {
  purchaseId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  productId: string;
  productTitle: string;
  pricePaid: number;
  createdAt: string;
};

export type StoreProductProfitRow = {
  productId: string;
  productTitle: string;
  unitsSold: number;
  revenue: number;
  costTotal: number;
  profit: number;
};

export type StoreSalesStats = {
  purchasesCount: number;
  buyersCount: number;
  soldProductsCount: number;
  revenue: number;
  /** مجموع (تكلفة الوحدة × عدد القطع المباعة) حسب آخر تكلفة مسجّلة للمنتج */
  totalCost: number;
  /** مجموع (السعر المدفوع − تكلفة الوحدة) لكل عملية شراء */
  totalProfit: number;
  /** نسبة الربح إلى الإيراد (%)، أو null عند عدم وجود إيراد */
  profitMarginPercent: number | null;
  byProduct: StoreProductProfitRow[];
};

export async function listStudentStorePurchases(userId: string): Promise<StudentStorePurchaseRow[]> {
  try {
    await ensureStorePurchasesSchema();
    const rows = await sql`
      SELECT
        usp.id AS purchase_id,
        usp.product_id,
        usp.price_paid,
        usp.created_at,
        sp.title,
        sp.description,
        sp.image_url,
        sp.pdf_url
      FROM "UserStorePurchase" usp
      INNER JOIN "StoreProduct" sp ON sp.id = usp.product_id
      WHERE usp.user_id = ${userId}
      ORDER BY usp.created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      purchaseId: String(r.purchase_id),
      productId: String(r.product_id),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
      imageUrl: r.image_url ? String(r.image_url) : null,
      pdfUrl: r.pdf_url ? String(r.pdf_url) : null,
      pricePaid: Number(r.price_paid ?? 0),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function listStorePurchasesForAdmin(): Promise<AdminStorePurchaseRow[]> {
  try {
    await ensureStorePurchasesSchema();
    const rows = await sql`
      SELECT
        usp.id AS purchase_id,
        usp.user_id,
        usp.product_id,
        usp.price_paid,
        usp.created_at,
        u.name AS student_name,
        u.email AS student_email,
        sp.title AS product_title
      FROM "UserStorePurchase" usp
      INNER JOIN "User" u ON u.id = usp.user_id
      INNER JOIN "StoreProduct" sp ON sp.id = usp.product_id
      ORDER BY usp.created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      purchaseId: String(r.purchase_id),
      userId: String(r.user_id),
      studentName: String(r.student_name ?? ""),
      studentEmail: String(r.student_email ?? ""),
      productId: String(r.product_id),
      productTitle: String(r.product_title ?? ""),
      pricePaid: Number(r.price_paid ?? 0),
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function getStoreSalesStats(): Promise<StoreSalesStats> {
  try {
    await ensureStorePurchasesSchema();
    await ensureStoreProductsSchema();
    const [aggRows, byProductRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS purchases_count,
          COUNT(DISTINCT usp.user_id)::int AS buyers_count,
          COUNT(DISTINCT usp.product_id)::int AS sold_products_count,
          COALESCE(SUM(usp.price_paid), 0)::numeric AS revenue,
          COALESCE(SUM(COALESCE(sp.cost_price, 0)), 0)::numeric AS total_cost,
          COALESCE(SUM(usp.price_paid - COALESCE(sp.cost_price, 0)), 0)::numeric AS total_profit
        FROM "UserStorePurchase" usp
        INNER JOIN "StoreProduct" sp ON sp.id = usp.product_id
      `,
      sql`
        SELECT
          sp.id AS product_id,
          sp.title AS product_title,
          COUNT(*)::int AS units_sold,
          COALESCE(SUM(usp.price_paid), 0)::numeric AS revenue,
          COALESCE(SUM(COALESCE(sp.cost_price, 0)), 0)::numeric AS cost_total,
          COALESCE(SUM(usp.price_paid - COALESCE(sp.cost_price, 0)), 0)::numeric AS profit
        FROM "UserStorePurchase" usp
        INNER JOIN "StoreProduct" sp ON sp.id = usp.product_id
        GROUP BY sp.id, sp.title
        ORDER BY profit DESC NULLS LAST, revenue DESC
      `,
    ]);
    const row = (aggRows[0] as Record<string, unknown> | undefined) ?? {};
    const revenue = Number(row.revenue ?? 0);
    const totalProfit = Number(row.total_profit ?? 0);
    const profitMarginPercent = revenue > 0 ? (totalProfit / revenue) * 100 : null;
    const byProduct = (byProductRows as Record<string, unknown>[]).map((r) => ({
      productId: String(r.product_id),
      productTitle: String(r.product_title ?? ""),
      unitsSold: Number(r.units_sold ?? 0),
      revenue: Number(r.revenue ?? 0),
      costTotal: Number(r.cost_total ?? 0),
      profit: Number(r.profit ?? 0),
    }));
    return {
      purchasesCount: Number(row.purchases_count ?? 0),
      buyersCount: Number(row.buyers_count ?? 0),
      soldProductsCount: Number(row.sold_products_count ?? 0),
      revenue,
      totalCost: Number(row.total_cost ?? 0),
      totalProfit,
      profitMarginPercent,
      byProduct,
    };
  } catch {
    return {
      purchasesCount: 0,
      buyersCount: 0,
      soldProductsCount: 0,
      revenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMarginPercent: null,
      byProduct: [],
    };
  }
}

export async function deleteStorePurchaseById(purchaseId: string): Promise<void> {
  await ensureStorePurchasesSchema();
  await sql`DELETE FROM "UserStorePurchase" WHERE id = ${purchaseId.trim()}`;
}

export async function buyStoreProduct(userId: string, productId: string): Promise<{ purchased: boolean; alreadyOwned: boolean }> {
  await ensureStorePurchasesSchema();
  const uid = userId.trim();
  const pid = productId.trim();
  if (!uid || !pid) throw new Error("بيانات غير صالحة");

  const existing = await sql`
    SELECT id FROM "UserStorePurchase" WHERE user_id = ${uid} AND product_id = ${pid} LIMIT 1
  `;
  if ((existing as unknown[]).length > 0) return { purchased: true, alreadyOwned: true };

  const productRows = await sql`
    SELECT id, price, is_active FROM "StoreProduct" WHERE id = ${pid} LIMIT 1
  `;
  const product = productRows[0] as { id?: string; price?: unknown; is_active?: boolean } | undefined;
  if (!product?.id || !product.is_active) throw new Error("المنتج غير متاح");
  const price = Number(product.price ?? 0);

  const subActive = await userHasActivePlatformSubscription(uid);
  const payable = subActive ? 0 : Math.max(0, price);

  if (payable > 0) {
    const user = await getUserById(uid);
    if (!user) throw new Error("المستخدم غير موجود");
    const bal = Number(user.balance ?? 0);
    if (bal < payable) throw new Error("رصيدك غير كافٍ لشراء هذا المنتج");
    await updateUser(uid, { balance: String(Math.max(0, bal - payable)) });
  }

  const purchaseId = generateId();
  await sql`
    INSERT INTO "UserStorePurchase" (id, user_id, product_id, price_paid)
    VALUES (${purchaseId}, ${uid}, ${pid}, ${payable})
    ON CONFLICT (user_id, product_id) DO NOTHING
  `;
  return { purchased: true, alreadyOwned: false };
}

export type SubscriptionPlanPublic = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  durationKind: SubscriptionDurationKind;
  price: number;
};

export type SubscriptionPlanAdmin = SubscriptionPlanPublic & { isActive: boolean };

function addSubscriptionDuration(from: Date, kind: SubscriptionDurationKind): Date {
  const d = new Date(from.getTime());
  if (kind === "week") d.setUTCDate(d.getUTCDate() + 7);
  else if (kind === "month") d.setUTCDate(d.getUTCDate() + 30);
  else d.setUTCDate(d.getUTCDate() + 365);
  return d;
}

export async function listActiveSubscriptionPlansPublic(): Promise<SubscriptionPlanPublic[]> {
  try {
    await ensurePlatformSubscriptionSchema();
    const rows = await sql`
      SELECT id, name, description, image_url, duration_kind, price
      FROM "SubscriptionPlan"
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      description: String(r.description ?? ""),
      imageUrl: r.image_url ? String(r.image_url) : null,
      durationKind: String(r.duration_kind) as SubscriptionDurationKind,
      price: Number(r.price ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function listSubscriptionPlansAll(): Promise<SubscriptionPlanAdmin[]> {
  await ensurePlatformSubscriptionSchema();
    const rows = await sql`
      SELECT id, name, description, image_url, duration_kind, price, is_active
      FROM "SubscriptionPlan"
      ORDER BY created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      description: String(r.description ?? ""),
      imageUrl: r.image_url ? String(r.image_url) : null,
      durationKind: String(r.duration_kind) as SubscriptionDurationKind,
      price: Number(r.price ?? 0),
      isActive: Boolean(r.is_active),
    }));
}

export async function createSubscriptionPlan(data: {
  name: string;
  description: string;
  image_url: string | null;
  duration_kind: SubscriptionDurationKind;
  price: number;
  is_active?: boolean;
}): Promise<{ id: string }> {
  await ensurePlatformSubscriptionSchema();
  const id = generateId();
  const dk = data.duration_kind;
  if (dk !== "week" && dk !== "month" && dk !== "year") throw new Error("مدة غير صالحة");
  await sql`
    INSERT INTO "SubscriptionPlan" (id, name, description, image_url, duration_kind, price, is_active, sort_order)
    VALUES (
      ${id},
      ${data.name.trim()},
      ${data.description.trim() || ""},
      ${data.image_url?.trim() || null},
      ${dk},
      ${Math.max(0, data.price)},
      ${data.is_active !== false},
      0
    )
  `;
  return { id };
}

export async function updateSubscriptionPlan(
  id: string,
  data: {
    name?: string;
    description?: string;
    image_url?: string | null;
    duration_kind?: SubscriptionDurationKind;
    price?: number;
    is_active?: boolean;
  },
): Promise<void> {
  await ensurePlatformSubscriptionSchema();
  if (data.name !== undefined) await sql`UPDATE "SubscriptionPlan" SET name = ${data.name.trim()}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined)
    await sql`UPDATE "SubscriptionPlan" SET description = ${data.description.trim()}, updated_at = NOW() WHERE id = ${id}`;
  if (data.image_url !== undefined)
    await sql`UPDATE "SubscriptionPlan" SET image_url = ${data.image_url?.trim() || null}, updated_at = NOW() WHERE id = ${id}`;
  if (data.duration_kind !== undefined) {
    const dk = data.duration_kind;
    if (dk !== "week" && dk !== "month" && dk !== "year") throw new Error("مدة غير صالحة");
    await sql`UPDATE "SubscriptionPlan" SET duration_kind = ${dk}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (data.price !== undefined) await sql`UPDATE "SubscriptionPlan" SET price = ${Math.max(0, data.price)}, updated_at = NOW() WHERE id = ${id}`;
  if (data.is_active !== undefined) await sql`UPDATE "SubscriptionPlan" SET is_active = ${data.is_active}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  await ensurePlatformSubscriptionSchema();
  await sql`DELETE FROM "SubscriptionPlan" WHERE id = ${id}`;
}

export async function getSubscriptionPlanById(id: string): Promise<{
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  duration_kind: SubscriptionDurationKind;
  price: number;
  is_active: boolean;
} | null> {
  await ensurePlatformSubscriptionSchema();
  const rows = await sql`SELECT * FROM "SubscriptionPlan" WHERE id = ${id} LIMIT 1`;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    image_url: r.image_url ? String(r.image_url) : null,
    duration_kind: String(r.duration_kind) as SubscriptionDurationKind,
    price: Number(r.price ?? 0),
    is_active: Boolean(r.is_active),
  };
}

/** هل للمستخدم اشتراك منصة نشط (أي وقت انتهاء في المستقبل) */
export async function userHasActivePlatformSubscription(userId: string): Promise<boolean> {
  try {
    await ensurePlatformSubscriptionSchema();
    const rows = await sql`
      SELECT 1 FROM "UserPlatformSubscription"
      WHERE user_id = ${userId} AND expires_at > NOW()
      LIMIT 1
    `;
    return (rows as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/** اشتراك نشط + دورة منشورة + سعرها > 0 ⇒ وصول كامل كمسجّل */
export async function userHasActivePlatformSubscriptionForPaidCourse(userId: string, courseId: string): Promise<boolean> {
  const active = await userHasActivePlatformSubscription(userId);
  if (!active) return false;
  const course = await getCourseById(courseId);
  if (!course) return false;
  const pub = (course as { isPublished?: boolean }).isPublished ?? (course as { is_published?: boolean }).is_published;
  if (!pub) return false;
  const price = Number((course as { price?: unknown }).price) || 0;
  return price > 0;
}

/** تسجيل في الدورة أو اشتراك منصة نشط على دورة مدفوعة منشورة */
export async function hasFullCourseAccessAsStudent(userId: string, courseId: string): Promise<boolean> {
  const en = await getEnrollment(userId, courseId);
  if (en) return true;
  return userHasActivePlatformSubscriptionForPaidCourse(userId, courseId);
}

export async function getLatestPlatformSubscriptionExpiry(userId: string): Promise<Date | null> {
  try {
    await ensurePlatformSubscriptionSchema();
    const rows = await sql`
      SELECT MAX(expires_at) as m FROM "UserPlatformSubscription"
      WHERE user_id = ${userId} AND expires_at > NOW()
    `;
    const m = (rows[0] as { m?: Date | string | null } | undefined)?.m;
    if (!m) return null;
    return m instanceof Date ? m : new Date(String(m));
  } catch {
    return null;
  }
}

export async function purchasePlatformSubscription(userId: string, planId: string): Promise<{ expiresAt: Date }> {
  await ensurePlatformSubscriptionSchema();
  const plan = await getSubscriptionPlanById(planId);
  if (!plan || !plan.is_active) throw new Error("الباقة غير متاحة");
  const price = plan.price;
  const user = await getUserById(userId);
  if (!user) throw new Error("المستخدم غير موجود");
  if (user.role !== "STUDENT") throw new Error("الاشتراك متاح للطلاب فقط");

  if (await userHasActivePlatformSubscription(userId)) {
    const exp = await getLatestPlatformSubscriptionExpiry(userId);
    const expLine = exp
      ? `ينتهي اشتراكك الحالي في ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(exp)}. `
      : "";
    throw new Error(
      `${expLine}أنت مشترك في المنصة بالفعل ولا تحتاج لدفع مرة أخرى إلا بعد انتهاء هذه المدة.`,
    );
  }

  const balance = Number(user.balance) || 0;
  if (price > 0 && balance < price) throw new Error("رصيدك غير كافٍ لشراء هذه الباقة");

  const now = new Date();
  const expiresAt = addSubscriptionDuration(now, plan.duration_kind);

  const subId = generateId();
  if (price > 0) {
    const newBal = String(Math.max(0, balance - price));
    await updateUser(userId, { balance: newBal });
  }
  await sql`
    INSERT INTO "UserPlatformSubscription" (id, user_id, plan_id, price_paid, expires_at)
    VALUES (${subId}, ${userId}, ${planId}, ${price}, ${expiresAt})
  `;
  return { expiresAt };
}

export type PlatformSubscriptionAdminRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string | null;
  planName: string | null;
  pricePaid: number;
  expiresAtIso: string;
  createdAtIso: string;
  isActive: boolean;
};

/** سجلات اشتراك المنصة للطلاب — للأدمن (مع بيانات الطالب والباقة) */
export async function listUserPlatformSubscriptionsForAdmin(): Promise<PlatformSubscriptionAdminRow[]> {
  try {
    await ensurePlatformSubscriptionSchema();
    const rows = await sql`
      SELECT
        ups.id,
        ups.user_id,
        u.name AS user_name,
        u.email AS user_email,
        ups.plan_id,
        sp.name AS plan_name,
        ups.price_paid,
        ups.expires_at,
        ups.created_at
      FROM "UserPlatformSubscription" ups
      JOIN "User" u ON u.id = ups.user_id
      LEFT JOIN "SubscriptionPlan" sp ON sp.id = ups.plan_id
      ORDER BY ups.expires_at DESC, ups.created_at DESC
    `;
    const now = Date.now();
    return (rows as Record<string, unknown>[]).map((r) => {
      const expRaw = r.expires_at;
      const expD = expRaw instanceof Date ? expRaw : new Date(String(expRaw));
      const creRaw = r.created_at;
      const creD = creRaw instanceof Date ? creRaw : new Date(String(creRaw ?? expD));
      return {
        id: String(r.id),
        userId: String(r.user_id),
        userName: String(r.user_name ?? ""),
        userEmail: String(r.user_email ?? ""),
        planId: r.plan_id ? String(r.plan_id) : null,
        planName: r.plan_name ? String(r.plan_name) : null,
        pricePaid: Number(r.price_paid ?? 0),
        expiresAtIso: expD.toISOString(),
        createdAtIso: creD.toISOString(),
        isActive: expD.getTime() > now,
      };
    });
  } catch {
    return [];
  }
}

export async function updateUserPlatformSubscriptionExpiresAt(id: string, expiresAt: Date): Promise<void> {
  await ensurePlatformSubscriptionSchema();
  const rows = await sql`SELECT id FROM "UserPlatformSubscription" WHERE id = ${id} LIMIT 1`;
  if ((rows as unknown[]).length === 0) throw new Error("سجل الاشتراك غير موجود");
  await sql`UPDATE "UserPlatformSubscription" SET expires_at = ${expiresAt} WHERE id = ${id}`;
}

export async function deleteUserPlatformSubscriptionById(id: string): Promise<void> {
  await ensurePlatformSubscriptionSchema();
  await sql`DELETE FROM "UserPlatformSubscription" WHERE id = ${id}`;
}

let lessonRatingsSchemaAvailable = true;

async function ensureLessonRatingsSchema(): Promise<void> {
  return ensureOnce("ensureLessonRatingsSchema", async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "LessonRating" (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT lesson_rating_unique_lesson_user UNIQUE (lesson_id, user_id)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS "LessonRating_lesson_id_idx" ON "LessonRating"(lesson_id)`;
      await sql`CREATE INDEX IF NOT EXISTS "LessonRating_course_id_idx" ON "LessonRating"(course_id)`;
      await sql`CREATE INDEX IF NOT EXISTS "LessonRating_user_id_idx" ON "LessonRating"(user_id)`;
      lessonRatingsSchemaAvailable = true;
    } catch {
      try {
        await sql`SELECT 1 FROM "LessonRating" LIMIT 1`;
        lessonRatingsSchemaAvailable = true;
      } catch {
        lessonRatingsSchemaAvailable = false;
      }
    }
  });
}

function courseRatingSelectSql() {
  if (!lessonRatingsSchemaAvailable) {
    return sql`NULL::numeric AS course_rating, 0::int AS course_rating_count`;
  }
  return sql`
    (
      SELECT ROUND(AVG(lr.rating)::numeric, 2)
      FROM "LessonRating" lr
      JOIN "Lesson" l ON l.id = lr.lesson_id
      WHERE l.course_id = c.id
    ) AS course_rating,
    (
      SELECT COUNT(*)::int
      FROM "LessonRating" lr
      JOIN "Lesson" l ON l.id = lr.lesson_id
      WHERE l.course_id = c.id
    ) AS course_rating_count
  `;
}

export async function getCourseBySlug(slug: string): Promise<(Course & { category?: Category }) | null> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.slug = ${slug} AND c.is_published = true
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  const category = r.cat_id
    ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
    : null;
  const { cat_id, cat_name, cat_name_ar, cat_slug, ...courseRow } = r;
  const base = rowToCamel(courseRow) ?? {};
  return { ...base, category } as unknown as Course & { category?: Category };
}

export async function getCourseById(id: string): Promise<Course | null> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}
    FROM "Course" c
    WHERE c.id = ${id}
    LIMIT 1
  `;
  return rowToCamel(rows[0] as Record<string, unknown>) as Course | null;
}

export async function getCourseBySlugOrId(slugOrId: string): Promise<Course | null> {
  if (/^c[a-z0-9]{24}$/i.test(slugOrId)) {
    return getCourseById(slugOrId);
  }
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}
    FROM "Course" c
    WHERE c.slug = ${slugOrId} AND c.is_published = true
    LIMIT 1
  `;
  return rowToCamel(rows[0] as Record<string, unknown>) as Course | null;
}

export async function getCoursesPublished(withCategory = true): Promise<(Course & { category?: Category })[]> {
  await ensureLessonRatingsSchema();
  if (!withCategory) {
    const rows = await sql`
      SELECT c.*, ${courseRatingSelectSql()}
      FROM "Course" c
      WHERE c.is_published = true
      ORDER BY c."order" ASC, c.created_at DESC
    `;
    return rowsToCamel(rows as Record<string, unknown>[]) as (Course & { category?: Category })[];
  }
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.is_published = true
    ORDER BY c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

/** يعيد خريطة معرف كورس → slug للكورسات المنشورة فقط (لروابط السلايدر في الصفحة الرئيسية). */
export async function getPublishedCourseSlugsByIds(ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const results = await Promise.all(
    uniq.map((id) =>
      sql`SELECT id, slug FROM "Course" WHERE id = ${id} AND is_published = true LIMIT 1`,
    ),
  );
  for (const rows of results) {
    const r = rows[0] as { id?: unknown; slug?: unknown } | undefined;
    if (r?.id != null && r?.slug != null) {
      map.set(String(r.id), String(r.slug));
    }
  }
  return map;
}

export async function getCoursesWithCounts(): Promise<
  Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >
> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*,
      ${courseRatingSelectSql()},
      (SELECT COUNT(*)::int FROM "Lesson" WHERE course_id = c.id) as lessons_count,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE course_id = c.id) as enrollments_count,
      cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug, cat."order" as cat_order
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    ORDER BY cat."order" ASC NULLS LAST, c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category =
      r.cat_id != null
        ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
        : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, cat_order, ...rest } = r;
    return {
      ...rowToCamel(rest),
      lessonsCount: Number((r as { lessons_count?: number }).lessons_count ?? 0),
      enrollmentsCount: Number((r as { enrollments_count?: number }).enrollments_count ?? 0),
      category: category as { id: string; name: string; nameAr?: string | null; slug: string } | null,
    };
  }) as Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >;
}

/** كورسات منشأة من مستخدم معيّن (لوحة مدرس) */
export async function getCoursesWithCountsForCreator(
  creatorId: string,
): Promise<
  Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >
> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*,
      ${courseRatingSelectSql()},
      (SELECT COUNT(*)::int FROM "Lesson" WHERE course_id = c.id) as lessons_count,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE course_id = c.id) as enrollments_count,
      cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug, cat."order" as cat_order
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.created_by_id = ${creatorId}
    ORDER BY cat."order" ASC NULLS LAST, c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category =
      r.cat_id != null
        ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
        : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, cat_order, ...rest } = r;
    return {
      ...rowToCamel(rest),
      lessonsCount: Number((r as { lessons_count?: number }).lessons_count ?? 0),
      enrollmentsCount: Number((r as { enrollments_count?: number }).enrollments_count ?? 0),
      category: category as { id: string; name: string; nameAr?: string | null; slug: string } | null,
    };
  }) as Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >;
}

export async function getCoursesAll(): Promise<(Course & { category?: Category })[]> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    ORDER BY c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export async function courseExistsBySlug(slug: string): Promise<boolean> {
  const rows = await sql`SELECT id FROM "Course" WHERE slug = ${slug} LIMIT 1`;
  return rows.length > 0;
}

async function ensureCourseBilingualColumns(): Promise<void> {
  return ensureOnce("ensureCourseBilingualColumns", async () => {
    try {
      await sql`ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS description_en TEXT`;
      await sql`ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS short_desc_en VARCHAR(300)`;
    } catch {
      /* DDL may be unavailable */
    }
  });
}

export async function createCourse(data: {
  title: string;
  title_ar: string;
  slug: string;
  description: string;
  description_en?: string | null;
  short_desc?: string | null;
  short_desc_en?: string | null;
  image_url?: string | null;
  price: number;
  is_published: boolean;
  created_by_id: string;
  max_quiz_attempts?: number | null;
  category_id?: string | null;
  accepts_homework?: boolean;
}): Promise<Course> {
  await ensureCourseBilingualColumns();
  const id = generateId();
  const catId = data.category_id ?? null;
  const acceptsHomework = data.accepts_homework ?? false;
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
      INSERT INTO "Course" (id, title, title_ar, slug, description, description_en, short_desc, short_desc_en, image_url, price, is_published, created_by_id, max_quiz_attempts, category_id, accepts_homework)
      VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.description_en ?? null}, ${data.short_desc ?? null}, ${data.short_desc_en ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${data.max_quiz_attempts ?? null}, ${catId}, ${acceptsHomework})
      RETURNING *
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("description_en") || msg.includes("short_desc_en")) {
      rows = await sql`
        INSERT INTO "Course" (id, title, title_ar, slug, description, description_en, short_desc, short_desc_en, image_url, price, is_published, created_by_id, max_quiz_attempts, category_id, accepts_homework)
        VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.description_en ?? null}, ${data.short_desc ?? null}, ${data.short_desc_en ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${data.max_quiz_attempts ?? null}, ${catId}, ${acceptsHomework})
        RETURNING *
      `;
    } else if (msg.includes("accepts_homework") || msg.includes("column") && msg.includes("does not exist")) {
      rows = await sql`
        INSERT INTO "Course" (id, title, title_ar, slug, description, description_en, short_desc, short_desc_en, image_url, price, is_published, created_by_id, max_quiz_attempts, category_id)
        VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.description_en ?? null}, ${data.short_desc ?? null}, ${data.short_desc_en ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${data.max_quiz_attempts ?? null}, ${catId})
        RETURNING *
      `;
    } else if (msg.includes("max_quiz_attempts") || msg.includes("category_id")) {
      rows = await sql`
        INSERT INTO "Course" (id, title, title_ar, slug, description, description_en, short_desc, short_desc_en, image_url, price, is_published, created_by_id, category_id)
        VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.description_en ?? null}, ${data.short_desc ?? null}, ${data.short_desc_en ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${catId})
        RETURNING *
      `;
    } else {
      throw err;
    }
  }
  const row = rows?.[0] as Record<string, unknown> | undefined;
  const c = row ? rowToCamel(row) as Course : null;
  if (!c) throw new Error("فشل إنشاء الدورة");
  return c;
}

export async function updateCourse(
  id: string,
  data: {
    title?: string;
    title_ar?: string;
    description?: string;
    description_en?: string | null;
    short_desc?: string | null;
    short_desc_en?: string | null;
    image_url?: string | null;
    price?: number;
    is_published?: boolean;
    max_quiz_attempts?: number | null;
    category_id?: string | null;
    accepts_homework?: boolean;
  }
): Promise<void> {
  await ensureCourseBilingualColumns();
  if (data.title !== undefined) await sql`UPDATE "Course" SET title = ${data.title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title_ar !== undefined) await sql`UPDATE "Course" SET title_ar = ${data.title_ar}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "Course" SET description = ${data.description}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description_en !== undefined) await sql`UPDATE "Course" SET description_en = ${data.description_en}, updated_at = NOW() WHERE id = ${id}`;
  if (data.short_desc !== undefined) await sql`UPDATE "Course" SET short_desc = ${data.short_desc}, updated_at = NOW() WHERE id = ${id}`;
  if (data.short_desc_en !== undefined) await sql`UPDATE "Course" SET short_desc_en = ${data.short_desc_en}, updated_at = NOW() WHERE id = ${id}`;
  if (data.image_url !== undefined) await sql`UPDATE "Course" SET image_url = ${data.image_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.price !== undefined) await sql`UPDATE "Course" SET price = ${data.price}, updated_at = NOW() WHERE id = ${id}`;
  if (data.is_published !== undefined) await sql`UPDATE "Course" SET is_published = ${data.is_published}, updated_at = NOW() WHERE id = ${id}`;
  if (data.max_quiz_attempts !== undefined) await sql`UPDATE "Course" SET max_quiz_attempts = ${data.max_quiz_attempts}, updated_at = NOW() WHERE id = ${id}`;
  if (data.category_id !== undefined) await sql`UPDATE "Course" SET category_id = ${data.category_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.accepts_homework !== undefined) {
    try {
      await sql`UPDATE "Course" SET accepts_homework = ${data.accepts_homework}, updated_at = NOW() WHERE id = ${id}`;
    } catch {
      /* العمود قد يكون غير موجود قبل تشغيل scripts/add-homework.sql */
    }
  }
}

export async function deleteCourse(id: string): Promise<void> {
  await sql`DELETE FROM "Course" WHERE id = ${id}`;
}

// ----- Lesson -----
export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  return rows as Lesson[];
}

export async function getLessonBySlug(courseId: string, lessonSlug: string): Promise<Lesson | null> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} AND slug = ${lessonSlug} LIMIT 1`;
  return (rows[0] as Lesson) ?? null;
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE id = ${lessonId} LIMIT 1`;
  return (rows[0] as Lesson) ?? null;
}

export async function createLesson(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  slug: string;
  content?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  order: number;
  accepts_homework?: boolean;
}): Promise<Lesson> {
  const id = generateId();
  const acceptsHomework = data.accepts_homework ?? false;
  try {
    await sql`
      INSERT INTO "Lesson" (id, course_id, title, title_ar, slug, content, video_url, pdf_url, "order", accepts_homework)
      VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.slug}, ${data.content ?? null}, ${data.video_url ?? null}, ${data.pdf_url ?? null}, ${data.order}, ${acceptsHomework})
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const columnMissing = msg.includes("accepts_homework") || (msg.includes("column") && msg.includes("does not exist"));
    if (columnMissing) {
      await sql`ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS accepts_homework BOOLEAN NOT NULL DEFAULT false`;
      await sql`
        INSERT INTO "Lesson" (id, course_id, title, title_ar, slug, content, video_url, pdf_url, "order", accepts_homework)
        VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.slug}, ${data.content ?? null}, ${data.video_url ?? null}, ${data.pdf_url ?? null}, ${data.order}, ${acceptsHomework})
      `;
    } else throw err;
  }
  const l = await getLessonById(id);
  if (!l) throw new Error("فشل إنشاء الحصة");
  return l;
}

export async function deleteLessonsByCourseId(courseId: string): Promise<void> {
  await sql`DELETE FROM "Lesson" WHERE course_id = ${courseId}`;
}

/** جلب كورس مع الحصص والاختبارات (عدد أسئلة كل اختبار) — للصفحة التفصيلية */
export async function getCourseWithContent(segment: string): Promise<{
  course: (Course & { category?: Record<string, unknown> }) | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { _count: { questions: number } }>;
} | null> {
  const isId = /^c[a-z0-9]{22}$/i.test(segment);
  let courseRow: Record<string, unknown> | null = null;
  if (isId) {
    const rows = await sql`
      SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
      FROM "Course" c
      LEFT JOIN "Category" cat ON c.category_id = cat.id
      WHERE c.id = ${segment} AND c.is_published = true LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    courseRow = { ...rowToCamel(rest), category: r.cat_id ? rowToCamel({ id: cat_id, name: cat_name, name_ar: cat_name_ar, slug: cat_slug }) : null };
  } else {
    const c = await getCourseBySlug(segment);
    if (!c) return null;
    courseRow = c as unknown as Record<string, unknown>;
  }
  const courseId = courseRow.id as string;
  const lessonRows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizRows = await sql`
    SELECT q.*, (SELECT COUNT(*)::int FROM "Question" WHERE quiz_id = q.id) as question_count
    FROM "Quiz" q WHERE q.course_id = ${courseId} ORDER BY q."order" ASC
  `;
  const lessons = rowsToCamel(lessonRows as Record<string, unknown>[]);
  const quizzes = (quizRows as Record<string, unknown>[]).map((q) => ({
    ...rowToCamel(q),
    _count: { questions: Number((q as { question_count?: number }).question_count ?? 0) },
  })) as Array<Record<string, unknown> & { _count: { questions: number } }>;

  return {
    course: courseRow as unknown as Course & { category?: Record<string, unknown> },
    lessons,
    quizzes,
  };
}

/** جلب دورة كاملة مع حصص واختبارات (أسئلة + خيارات) — لصفحة التعديل */
export async function getCourseForEdit(courseId: string): Promise<{
  course: Record<string, unknown> | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }>;
} | null> {
  const courseRows = await sql`SELECT * FROM "Course" WHERE id = ${courseId} LIMIT 1`;
  const courseRow = courseRows[0] as Record<string, unknown> | undefined;
  if (!courseRow) return null;

  const lessonRows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizRows = await sql`SELECT * FROM "Quiz" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizzes: Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }> = [];

  for (const q of quizRows as Record<string, unknown>[]) {
    const questionRows = await sql`SELECT * FROM "Question" WHERE quiz_id = ${q.id} ORDER BY "order" ASC`;
    const questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> = [];
    for (const qu of questionRows as Record<string, unknown>[]) {
      const optRows = await sql`SELECT * FROM "QuestionOption" WHERE question_id = ${qu.id} ORDER BY id`;
      questions.push({ ...rowToCamel(qu)!, options: rowsToCamel(optRows as Record<string, unknown>[]) });
    }
    quizzes.push({ ...rowToCamel(q)!, questions });
  }

  return {
    course: rowToCamel(courseRow)!,
    lessons: rowsToCamel(lessonRows as Record<string, unknown>[]),
    quizzes,
  };
}

// ----- Quiz / Question / QuestionOption -----
export async function getQuizById(quizId: string): Promise<{
  quiz: Record<string, unknown>;
  course: Record<string, unknown>;
  questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }>;
} | null> {
  const quizRows = await sql`SELECT * FROM "Quiz" WHERE id = ${quizId} LIMIT 1`;
  const quizRow = quizRows[0] as Record<string, unknown> | undefined;
  if (!quizRow) return null;

  const courseId = quizRow.course_id as string;
  const courseRows = await sql`SELECT * FROM "Course" WHERE id = ${courseId} LIMIT 1`;
  const courseRow = courseRows[0] as Record<string, unknown> | undefined;
  if (!courseRow) return null;

  const questionRows = await sql`SELECT * FROM "Question" WHERE quiz_id = ${quizId} ORDER BY "order" ASC`;
  const questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> = [];

  for (const q of questionRows as Record<string, unknown>[]) {
    const optRows = await sql`SELECT * FROM "QuestionOption" WHERE question_id = ${q.id} ORDER BY id`;
    questions.push({
      ...rowToCamel(q)!,
      options: rowsToCamel(optRows as Record<string, unknown>[]),
    } as Record<string, unknown> & { options: Record<string, unknown>[] });
  }

  return {
    quiz: rowToCamel(quizRow)!,
    course: rowToCamel(courseRow)!,
    questions,
  };
}

export async function createQuiz(data: { course_id: string; title: string; order: number; time_limit_minutes?: number | null }): Promise<Quiz> {
  const id = generateId();
  const runInsert = async () => {
    await sql`
      INSERT INTO "Quiz" (id, course_id, title, "order", time_limit_minutes)
      VALUES (${id}, ${data.course_id}, ${data.title}, ${data.order}, ${data.time_limit_minutes ?? null})
    `;
  };
  try {
    await runInsert();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = typeof (err as { code?: string })?.code === "string" ? (err as { code: string }).code : "";
    const isMissingColumn = code === "42703" || /time_limit_minutes|does not exist|column.*not exist/i.test(msg);
    if (isMissingColumn) {
      await sql`ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS time_limit_minutes INT`;
      await runInsert();
    } else {
      throw err;
    }
  }
  const rows = await sql`SELECT * FROM "Quiz" WHERE id = ${id} LIMIT 1`;
  const q = rows[0] as Quiz;
  if (!q) throw new Error("فشل إنشاء الاختبار");
  return q;
}

export async function createQuestion(data: {
  quiz_id: string;
  type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
  question_text: string;
  order: number;
}): Promise<Question> {
  const id = generateId();
  await sql`
    INSERT INTO "Question" (id, quiz_id, type, question_text, "order")
    VALUES (${id}, ${data.quiz_id}, ${data.type}, ${data.question_text}, ${data.order})
  `;
  const rows = await sql`SELECT * FROM "Question" WHERE id = ${id} LIMIT 1`;
  const q = rows[0] as Question;
  if (!q) throw new Error("فشل إنشاء السؤال");
  return q;
}

export async function createQuestionOption(data: {
  question_id: string;
  text: string;
  is_correct: boolean;
}): Promise<QuestionOption> {
  const id = generateId();
  await sql`
    INSERT INTO "QuestionOption" (id, question_id, text, is_correct)
    VALUES (${id}, ${data.question_id}, ${data.text}, ${data.is_correct})
  `;
  const rows = await sql`SELECT * FROM "QuestionOption" WHERE id = ${id} LIMIT 1`;
  const o = rows[0] as QuestionOption;
  if (!o) throw new Error("فشل إنشاء الخيار");
  return o;
}

export async function deleteQuizzesByCourseId(courseId: string): Promise<void> {
  const quizzes = await sql`SELECT id FROM "Quiz" WHERE course_id = ${courseId}`;
  for (const q of quizzes as { id: string }[]) {
    const questions = await sql`SELECT id FROM "Question" WHERE quiz_id = ${q.id}`;
    for (const qu of questions as { id: string }[]) {
      await sql`DELETE FROM "QuestionOption" WHERE question_id = ${qu.id}`;
    }
    await sql`DELETE FROM "Question" WHERE quiz_id = ${q.id}`;
  }
  await sql`DELETE FROM "Quiz" WHERE course_id = ${courseId}`;
}

// ----- Enrollment -----
export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const rows = await sql`
    SELECT * FROM "Enrollment" WHERE user_id = ${userId} AND course_id = ${courseId} LIMIT 1
  `;
  return (rows[0] as Enrollment) ?? null;
}

export async function createEnrollment(userId: string, courseId: string): Promise<Enrollment> {
  const id = generateId();
  await sql`
    INSERT INTO "Enrollment" (id, user_id, course_id)
    VALUES (${id}, ${userId}, ${courseId})
  `;
  const rows = await sql`SELECT * FROM "Enrollment" WHERE id = ${id} LIMIT 1`;
  const e = rows[0] as Enrollment;
  if (!e) throw new Error("فشل إنشاء التسجيل");
  return e;
}

export async function deleteEnrollment(userId: string, courseId: string): Promise<void> {
  await sql`DELETE FROM "Enrollment" WHERE user_id = ${userId} AND course_id = ${courseId}`;
}

// ----- ActivationCode (أكواد التفعيل المجانية للدورات) -----
function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createActivationCodes(
  courseId: string,
  count: number,
  lessonIds?: string[] | null,
  quizIds?: string[] | null
): Promise<{ id: string; code: string }[]> {
  const created: { id: string; code: string }[] = [];
  const seen = new Set<string>();
  const scopedLessonIds = Array.isArray(lessonIds)
    ? Array.from(new Set(lessonIds.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())))
    : [];
  const scopedQuizIds = Array.isArray(quizIds)
    ? Array.from(new Set(quizIds.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())))
    : [];
  for (let i = 0; i < count; i++) {
    let code = generateCodeString();
    while (seen.has(code)) code = generateCodeString();
    seen.add(code);
    const id = generateId();
    await sql`
      INSERT INTO "ActivationCode" (id, course_id, code, used_at, used_by_user_id)
      VALUES (${id}, ${courseId}, ${code}, NULL, NULL)
    `;
    if (scopedLessonIds.length > 0) {
      for (const lessonId of scopedLessonIds) {
        await sql`
          INSERT INTO "ActivationCodeLesson" (activation_code_id, lesson_id)
          VALUES (${id}, ${lessonId})
          ON CONFLICT (activation_code_id, lesson_id) DO NOTHING
        `;
      }
    }
    if (scopedQuizIds.length > 0) {
      for (const quizId of scopedQuizIds) {
        await sql`
          INSERT INTO "ActivationCodeQuiz" (activation_code_id, quiz_id)
          VALUES (${id}, ${quizId})
          ON CONFLICT (activation_code_id, quiz_id) DO NOTHING
        `;
      }
    }
    created.push({ id, code });
  }
  return created;
}

export type ActivationCodeWithCourse = ActivationCode & {
  course_title?: string;
  course_title_ar?: string;
  lessonCount?: number;
  quizCount?: number;
};

export async function listActivationCodes(courseId?: string | null): Promise<ActivationCodeWithCourse[]> {
  const rows = courseId
    ? await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar,
               (SELECT COUNT(*)::int FROM "ActivationCodeLesson" acl WHERE acl.activation_code_id = ac.id) as lesson_count,
               (SELECT COUNT(*)::int FROM "ActivationCodeQuiz" acq WHERE acq.activation_code_id = ac.id) as quiz_count
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id
        WHERE ac.course_id = ${courseId}
        ORDER BY ac.created_at DESC
      `
    : await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar,
               (SELECT COUNT(*)::int FROM "ActivationCodeLesson" acl WHERE acl.activation_code_id = ac.id) as lesson_count,
               (SELECT COUNT(*)::int FROM "ActivationCodeQuiz" acq WHERE acq.activation_code_id = ac.id) as quiz_count
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id
        ORDER BY ac.created_at DESC
      `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as ActivationCodeWithCourse);
}

export async function listActivationCodesForTeacher(
  teacherId: string,
  courseId?: string | null
): Promise<ActivationCodeWithCourse[]> {
  const cid = courseId?.trim() || null;
  const rows = cid
    ? await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar,
               (SELECT COUNT(*)::int FROM "ActivationCodeLesson" acl WHERE acl.activation_code_id = ac.id) as lesson_count,
               (SELECT COUNT(*)::int FROM "ActivationCodeQuiz" acq WHERE acq.activation_code_id = ac.id) as quiz_count
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id AND c.created_by_id = ${teacherId}
        WHERE ac.course_id = ${cid}
        ORDER BY ac.created_at DESC
      `
    : await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar,
               (SELECT COUNT(*)::int FROM "ActivationCodeLesson" acl WHERE acl.activation_code_id = ac.id) as lesson_count,
               (SELECT COUNT(*)::int FROM "ActivationCodeQuiz" acq WHERE acq.activation_code_id = ac.id) as quiz_count
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id AND c.created_by_id = ${teacherId}
        ORDER BY ac.created_at DESC
      `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as ActivationCodeWithCourse);
}

export async function getActivationCodeByCode(code: string): Promise<(ActivationCode & { courseId: string; lessonIds: string[]; quizIds: string[] }) | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const rows = await sql`
    SELECT * FROM "ActivationCode" WHERE UPPER(TRIM(code)) = ${trimmed} AND used_at IS NULL LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  const base = rowToCamel(r) as ActivationCode & { courseId: string };
  try {
    const codeId = String((r as { id?: string }).id ?? "");
    const lessonRows = await sql`SELECT lesson_id FROM "ActivationCodeLesson" WHERE activation_code_id = ${codeId}`;
    const quizRows = await sql`SELECT quiz_id FROM "ActivationCodeQuiz" WHERE activation_code_id = ${codeId}`;
    const lessonIds = (lessonRows as { lesson_id?: string }[]).map((x) => String(x.lesson_id ?? "")).filter(Boolean);
    const quizIds = (quizRows as { quiz_id?: string }[]).map((x) => String(x.quiz_id ?? "")).filter(Boolean);
    return { ...base, lessonIds, quizIds };
  } catch {
    return { ...base, lessonIds: [], quizIds: [] };
  }
}

export async function useActivationCode(codeId: string, userId: string): Promise<{ courseId: string; lessonIds: string[]; quizIds: string[] } | null> {
  // تحديث آمن لمنع تفعيل نفس الكود مرتين
  const updated = await sql`
    UPDATE "ActivationCode"
    SET used_at = NOW(), used_by_user_id = ${userId}
    WHERE id = ${codeId} AND used_at IS NULL
    RETURNING course_id
  `;
  const row = updated[0] as { course_id?: string } | undefined;
  if (!row?.course_id) return null;

  let lessonIds: string[] = [];
  let quizIds: string[] = [];
  try {
    const lessonRows = await sql`SELECT lesson_id FROM "ActivationCodeLesson" WHERE activation_code_id = ${codeId}`;
    lessonIds = (lessonRows as { lesson_id?: string }[]).map((x) => String(x.lesson_id ?? "")).filter(Boolean);
    const quizRows = await sql`SELECT quiz_id FROM "ActivationCodeQuiz" WHERE activation_code_id = ${codeId}`;
    quizIds = (quizRows as { quiz_id?: string }[]).map((x) => String(x.quiz_id ?? "")).filter(Boolean);
  } catch {
    lessonIds = [];
    quizIds = [];
  }

  // إذا لم يتم تحديد حصص ولا اختبارات => تسجيل كامل في الدورة (السلوك القديم)
  if (lessonIds.length === 0 && quizIds.length === 0) {
    await createEnrollment(userId, row.course_id);
  }
  return { courseId: row.course_id, lessonIds, quizIds };
}

/** الحصص المسموح بها لطالب داخل كورس عبر أكواد حصص محددة */
export async function getAllowedLessonIdsForUserCourse(userId: string, courseId: string): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT acl.lesson_id
      FROM "ActivationCode" ac
      JOIN "ActivationCodeLesson" acl ON acl.activation_code_id = ac.id
      WHERE ac.used_by_user_id = ${userId} AND ac.course_id = ${courseId} AND ac.used_at IS NOT NULL
    `;
    return (rows as { lesson_id?: string }[]).map((r) => String(r.lesson_id ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

/** الاختبارات المسموح بها لطالب داخل كورس عبر أكواد اختبارات محددة */
export async function getAllowedQuizIdsForUserCourse(userId: string, courseId: string): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT acq.quiz_id
      FROM "ActivationCode" ac
      JOIN "ActivationCodeQuiz" acq ON acq.activation_code_id = ac.id
      WHERE ac.used_by_user_id = ${userId} AND ac.course_id = ${courseId} AND ac.used_at IS NOT NULL
    `;
    return (rows as { quiz_id?: string }[]).map((r) => String(r.quiz_id ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

/** هل الطالب لديه وصول جزئي (حصص أو اختبارات محددة) للكورس عبر كود؟ */
export async function hasPartialCourseAccess(userId: string, courseId: string): Promise<boolean> {
  const [lessons, quizzes] = await Promise.all([
    getAllowedLessonIdsForUserCourse(userId, courseId),
    getAllowedQuizIdsForUserCourse(userId, courseId),
  ]);
  return lessons.length > 0 || quizzes.length > 0;
}

/** دورات الطالب: المسجّل فيها + الدورات المتاحة عبر أكواد (حصص/اختبارات محددة) + كل الدورات المدفوعة المنشورة عند اشتراك منصة نشط */
export async function getAccessibleCoursesForUser(userId: string): Promise<(Course & { category?: Category })[]> {
  await ensurePlatformSubscriptionSchema();
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.id IN (
      SELECT course_id FROM "Enrollment" WHERE user_id = ${userId}
      UNION
      SELECT ac.course_id
      FROM "ActivationCode" ac
      JOIN "ActivationCodeLesson" acl ON acl.activation_code_id = ac.id
      WHERE ac.used_by_user_id = ${userId} AND ac.used_at IS NOT NULL
      UNION
      SELECT ac.course_id
      FROM "ActivationCode" ac
      JOIN "ActivationCodeQuiz" acq ON acq.activation_code_id = ac.id
      WHERE ac.used_by_user_id = ${userId} AND ac.used_at IS NOT NULL
    )
    OR (
      EXISTS (
        SELECT 1 FROM "UserPlatformSubscription" ups
        WHERE ups.user_id = ${userId} AND ups.expires_at > NOW()
      )
      AND c.is_published = true
      AND COALESCE(c.price, 0) > 0
    )
    ORDER BY c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export type LessonRatingSummary = {
  lessonId: string;
  courseId: string;
  averageRating: number | null;
  ratingCount: number;
  courseAverageRating: number | null;
  courseRatingCount: number;
  userRating: number | null;
};

export async function getLessonRatingSummary(
  lessonId: string,
  userId?: string | null,
): Promise<LessonRatingSummary | null> {
  await ensureLessonRatingsSchema();
  if (!lessonRatingsSchemaAvailable) {
    const lesson = await getLessonById(lessonId);
    if (!lesson) return null;
    return {
      lessonId: lesson.id,
      courseId: lesson.course_id,
      averageRating: null,
      ratingCount: 0,
      courseAverageRating: null,
      courseRatingCount: 0,
      userRating: null,
    };
  }
  const rows = await sql`
    SELECT
      l.id AS lesson_id,
      l.course_id,
      (SELECT AVG(r.rating)::float8 FROM "LessonRating" r WHERE r.lesson_id = l.id) AS lesson_avg_rating,
      (SELECT COUNT(*)::int FROM "LessonRating" r WHERE r.lesson_id = l.id) AS lesson_rating_count,
      (
        SELECT AVG(r.rating)::float8
        FROM "LessonRating" r
        JOIN "Lesson" lx ON lx.id = r.lesson_id
        WHERE lx.course_id = l.course_id
      ) AS course_avg_rating,
      (
        SELECT COUNT(*)::int
        FROM "LessonRating" r
        JOIN "Lesson" lx ON lx.id = r.lesson_id
        WHERE lx.course_id = l.course_id
      ) AS course_rating_count,
      (
        SELECT r.rating::int
        FROM "LessonRating" r
        WHERE r.lesson_id = l.id AND r.user_id = ${userId ?? null}
        LIMIT 1
      ) AS user_rating
    FROM "Lesson" l
    WHERE l.id = ${lessonId}
    LIMIT 1
  `;
  const row = rows[0] as
    | {
        lesson_id?: string;
        course_id?: string;
        lesson_avg_rating?: number | null;
        lesson_rating_count?: number | null;
        course_avg_rating?: number | null;
        course_rating_count?: number | null;
        user_rating?: number | null;
      }
    | undefined;
  if (!row?.lesson_id || !row.course_id) return null;
  return {
    lessonId: String(row.lesson_id),
    courseId: String(row.course_id),
    averageRating:
      row.lesson_avg_rating == null || Number.isNaN(Number(row.lesson_avg_rating))
        ? null
        : Number(row.lesson_avg_rating),
    ratingCount: Number(row.lesson_rating_count ?? 0),
    courseAverageRating:
      row.course_avg_rating == null || Number.isNaN(Number(row.course_avg_rating))
        ? null
        : Number(row.course_avg_rating),
    courseRatingCount: Number(row.course_rating_count ?? 0),
    userRating: row.user_rating == null ? null : Number(row.user_rating),
  };
}

export async function upsertLessonRating(data: {
  lesson_id: string;
  user_id: string;
  course_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
}): Promise<LessonRating> {
  await ensureLessonRatingsSchema();
  if (!lessonRatingsSchemaAvailable) {
    throw new Error("ميزة التقييم غير متاحة حالياً");
  }
  const existingRows = await sql`
    SELECT id FROM "LessonRating" WHERE lesson_id = ${data.lesson_id} AND user_id = ${data.user_id} LIMIT 1
  `;
  const existingId = (existingRows[0] as { id?: string } | undefined)?.id;
  const id = existingId ?? generateId();
  const rows = await sql`
    INSERT INTO "LessonRating" (id, lesson_id, user_id, course_id, rating, created_at, updated_at)
    VALUES (${id}, ${data.lesson_id}, ${data.user_id}, ${data.course_id}, ${data.rating}, NOW(), NOW())
    ON CONFLICT (lesson_id, user_id) DO UPDATE SET
      rating = EXCLUDED.rating,
      course_id = EXCLUDED.course_id,
      updated_at = NOW()
    RETURNING *
  `;
  return rowToCamel(rows[0] as Record<string, unknown>) as LessonRating;
}

export async function deleteActivationCode(id: string): Promise<void> {
  await sql`DELETE FROM "ActivationCode" WHERE id = ${id}`;
}

export async function deleteActivationCodes(ids: string[]): Promise<void> {
  for (const id of ids) await deleteActivationCode(id);
}

// ----- HomeworkSubmission (استلام واجبات الطلاب — مرتبط بحصة أو بالكورس) -----
let homeworkSubmissionSchemaEnsured = false;

/** يطابق scripts/add-homework.sql و add-homework-lesson.sql — إنشاء تلقائي إن لم يُشغَّل السكربت يدوياً */
async function ensureHomeworkSubmissionSchema(): Promise<void> {
  if (homeworkSubmissionSchemaEnsured) return;
  try {
    await sql`ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS accepts_homework BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS accepts_homework BOOLEAN NOT NULL DEFAULT false`;
    await sql`
      CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
        id            TEXT PRIMARY KEY,
        course_id     TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
        user_id       TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        submission_type TEXT NOT NULL CHECK (submission_type IN ('link', 'pdf', 'image')),
        link_url      TEXT,
        file_url      TEXT,
        file_name     TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "HomeworkSubmission_course_id_idx" ON "HomeworkSubmission"(course_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "HomeworkSubmission_user_id_idx" ON "HomeworkSubmission"(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS "HomeworkSubmission_created_at_idx" ON "HomeworkSubmission"(created_at)`;
    await sql`
      ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS lesson_id TEXT REFERENCES "Lesson"(id) ON DELETE CASCADE
    `;
    await sql`CREATE INDEX IF NOT EXISTS "HomeworkSubmission_lesson_id_idx" ON "HomeworkSubmission"(lesson_id)`;
    homeworkSubmissionSchemaEnsured = true;
  } catch {
    /* إنشاء الجدول أو الأعمدة قد يفشل بدون صلاحية */
  }
}

export async function createHomeworkSubmission(data: {
  course_id: string;
  user_id: string;
  submission_type: "link" | "pdf" | "image";
  lesson_id?: string | null;
  link_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
}): Promise<HomeworkSubmission> {
  await ensureHomeworkSubmissionSchema();
  const id = generateId();
  const lessonId = data.lesson_id ?? null;
  try {
    await sql`
      INSERT INTO "HomeworkSubmission" (id, course_id, user_id, lesson_id, submission_type, link_url, file_url, file_name)
      VALUES (${id}, ${data.course_id}, ${data.user_id}, ${lessonId}, ${data.submission_type}, ${data.link_url ?? null}, ${data.file_url ?? null}, ${data.file_name ?? null})
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      await sql`
        INSERT INTO "HomeworkSubmission" (id, course_id, user_id, submission_type, link_url, file_url, file_name)
        VALUES (${id}, ${data.course_id}, ${data.user_id}, ${data.submission_type}, ${data.link_url ?? null}, ${data.file_url ?? null}, ${data.file_name ?? null})
      `;
    } else throw err;
  }
  const rows = await sql`SELECT * FROM "HomeworkSubmission" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as HomeworkSubmission;
}

export type HomeworkSubmissionWithDetails = HomeworkSubmission & {
  course_title?: string;
  course_title_ar?: string;
  user_name?: string;
  lesson_title?: string;
  lesson_title_ar?: string;
};

export async function listHomeworkSubmissionsForAdmin(studentNameSearch?: string | null): Promise<HomeworkSubmissionWithDetails[]> {
  await ensureHomeworkSubmissionSchema();
  const search = studentNameSearch?.trim();
  const likePattern = search ? "%" + search + "%" : null;

  async function runWithLessonJoin(): Promise<Record<string, unknown>[]> {
    if (likePattern) {
      const rows = await sql`
        SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
               l.title as lesson_title, l.title_ar as lesson_title_ar
        FROM "HomeworkSubmission" hs
        JOIN "Course" c ON c.id = hs.course_id
        JOIN "User" u ON u.id = hs.user_id
        LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
        WHERE u.name ILIKE ${likePattern}
        ORDER BY hs.created_at DESC
      `;
      return rows as Record<string, unknown>[];
    }
    const rows = await sql`
      SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
             l.title as lesson_title, l.title_ar as lesson_title_ar
      FROM "HomeworkSubmission" hs
      JOIN "Course" c ON c.id = hs.course_id
      JOIN "User" u ON u.id = hs.user_id
      LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
      ORDER BY hs.created_at DESC
    `;
    return rows as Record<string, unknown>[];
  }

  async function runWithoutLessonJoin(): Promise<Record<string, unknown>[]> {
    if (likePattern) {
      const rows = await sql`
        SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name
        FROM "HomeworkSubmission" hs
        JOIN "Course" c ON c.id = hs.course_id
        JOIN "User" u ON u.id = hs.user_id
        WHERE u.name ILIKE ${likePattern}
        ORDER BY hs.created_at DESC
      `;
      return rows as Record<string, unknown>[];
    }
    const rows = await sql`
      SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name
      FROM "HomeworkSubmission" hs
      JOIN "Course" c ON c.id = hs.course_id
      JOIN "User" u ON u.id = hs.user_id
      ORDER BY hs.created_at DESC
    `;
    return rows as Record<string, unknown>[];
  }

  let rows: Record<string, unknown>[];
  try {
    rows = await runWithLessonJoin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      await sql`ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS lesson_id TEXT REFERENCES "Lesson"(id) ON DELETE CASCADE`;
      try {
        rows = await runWithLessonJoin();
      } catch {
        rows = await runWithoutLessonJoin();
      }
    } else {
      rows = await runWithoutLessonJoin();
    }
  }
  return rows.map((r) => rowToCamel(r) as HomeworkSubmissionWithDetails);
}

export async function listHomeworkSubmissionsForTeacher(
  teacherId: string,
  studentNameSearch?: string | null,
): Promise<HomeworkSubmissionWithDetails[]> {
  await ensureHomeworkSubmissionSchema();
  const search = studentNameSearch?.trim();
  const likePattern = search ? "%" + search + "%" : null;
  if (likePattern) {
    const rows = await sql`
      SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
             l.title as lesson_title, l.title_ar as lesson_title_ar
      FROM "HomeworkSubmission" hs
      JOIN "Course" c ON c.id = hs.course_id AND c.created_by_id = ${teacherId}
      JOIN "User" u ON u.id = hs.user_id
      LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
      WHERE u.name ILIKE ${likePattern}
      ORDER BY hs.created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmissionWithDetails);
  }
  const rows = await sql`
    SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
           l.title as lesson_title, l.title_ar as lesson_title_ar
    FROM "HomeworkSubmission" hs
    JOIN "Course" c ON c.id = hs.course_id AND c.created_by_id = ${teacherId}
    JOIN "User" u ON u.id = hs.user_id
    LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
    ORDER BY hs.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmissionWithDetails);
}

export async function deleteHomeworkSubmissionsByIdsForTeacher(
  teacherId: string,
  ids: string[],
): Promise<number> {
  await ensureHomeworkSubmissionSchema();
  if (ids.length === 0) return 0;
  let n = 0;
  for (const id of ids) {
    const rows = await sql`
      DELETE FROM "HomeworkSubmission" hs
      USING "Course" c
      WHERE hs.id = ${id} AND hs.course_id = c.id AND c.created_by_id = ${teacherId}
      RETURNING hs.id
    `;
    n += rows.length;
  }
  return n;
}

export async function getHomeworkSubmissionsByCourseAndUser(courseId: string, userId: string): Promise<HomeworkSubmission[]> {
  await ensureHomeworkSubmissionSchema();
  const rows = await sql`
    SELECT * FROM "HomeworkSubmission" WHERE course_id = ${courseId} AND user_id = ${userId} ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmission);
}

export async function getHomeworkSubmissionsByLessonAndUser(lessonId: string, userId: string): Promise<HomeworkSubmission[]> {
  await ensureHomeworkSubmissionSchema();
  try {
    const rows = await sql`
      SELECT * FROM "HomeworkSubmission" WHERE lesson_id = ${lessonId} AND user_id = ${userId} ORDER BY created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmission);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      return [];
    }
    throw err;
  }
}

export async function deleteHomeworkSubmissionsByIds(ids: string[]): Promise<number> {
  await ensureHomeworkSubmissionSchema();
  const validIds = ids.filter((id) => id && String(id).trim());
  if (validIds.length === 0) return 0;
  for (const id of validIds) {
    await sql`DELETE FROM "HomeworkSubmission" WHERE id = ${id}`;
  }
  return validIds.length;
}

export async function deleteAllHomeworkSubmissions(): Promise<void> {
  await ensureHomeworkSubmissionSchema();
  await sql`DELETE FROM "HomeworkSubmission"`;
}

// ----- QuizAttempt (يتطلب تشغيل scripts/add-quiz-attempts.sql) -----
export async function countQuizAttemptsByUserAndCourse(userId: string, courseId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int as c FROM "QuizAttempt" qa
    JOIN "Quiz" q ON q.id = qa.quiz_id
    WHERE qa.user_id = ${userId} AND q.course_id = ${courseId}
  `;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function createQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  totalQuestions: number
): Promise<void> {
  const id = generateId();
  await sql`
    INSERT INTO "QuizAttempt" (id, user_id, quiz_id, score, total_questions, updated_at)
    VALUES (${id}, ${userId}, ${quizId}, ${score}, ${totalQuestions}, NOW())
  `;
}

/** إنشاء محاولة وإرجاع معرّفها (لاستخدامها عند بدء الاختبار) */
export async function createQuizAttemptReturningId(
  userId: string,
  quizId: string,
  score: number,
  totalQuestions: number
): Promise<string> {
  const id = generateId();
  await sql`
    INSERT INTO "QuizAttempt" (id, user_id, quiz_id, score, total_questions, updated_at)
    VALUES (${id}, ${userId}, ${quizId}, ${score}, ${totalQuestions}, NOW())
  `;
  return id;
}

/** تحديث محاولة قائمة — تُستخدم عند تسليم نتيجة محاولة بدأت مسبقاً */
export async function updateQuizAttemptById(params: {
  attemptId: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
}): Promise<boolean> {
  const { attemptId, userId, quizId, score, totalQuestions } = params;
  const rows = await sql`
    UPDATE "QuizAttempt"
    SET score = ${score}, total_questions = ${totalQuestions}, updated_at = NOW()
    WHERE id = ${attemptId} AND user_id = ${userId} AND quiz_id = ${quizId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getQuizAttemptsByUserId(userId: string): Promise<
  Array<{ quizTitle: string; courseTitle: string; score: number; totalQuestions: number; createdAt: Date }>
> {
  const rows = await sql`
    SELECT q.title as quiz_title, c.title as course_title, qa.score, qa.total_questions, qa.created_at
    FROM "QuizAttempt" qa
    JOIN "Quiz" q ON q.id = qa.quiz_id
    JOIN "Course" c ON c.id = q.course_id
    WHERE qa.user_id = ${userId}
    ORDER BY qa.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    quizTitle: String(r.quiz_title ?? ""),
    courseTitle: String(r.course_title ?? ""),
    score: Number(r.score),
    totalQuestions: Number(r.total_questions),
    createdAt: r.created_at as Date,
  }));
}

export async function getAllQuizAttemptsForAdmin(): Promise<
  Array<{
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    createdAt: Date;
  }>
> {
  const rows = await sql`
    SELECT u.id as user_id, u.name as user_name, u.email as user_email,
           qa.quiz_id, q.title as quiz_title, c.id as course_id, c.title as course_title,
           qa.score, qa.total_questions, qa.created_at
    FROM "QuizAttempt" qa
    JOIN "User" u ON u.id = qa.user_id
    JOIN "Quiz" q ON q.id = qa.quiz_id
    JOIN "Course" c ON c.id = q.course_id
    ORDER BY qa.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    userName: r.user_name as string,
    userEmail: r.user_email as string,
    quizId: r.quiz_id as string,
    quizTitle: r.quiz_title as string,
    courseId: r.course_id as string,
    courseTitle: r.course_title as string,
    score: Number(r.score),
    totalQuestions: Number(r.total_questions),
    createdAt: r.created_at as Date,
  }));
}

export async function getQuizAttemptsForTeacher(teacherId: string): Promise<
  Array<{
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    createdAt: Date;
  }>
> {
  const rows = await sql`
    SELECT u.id as user_id, u.name as user_name, u.email as user_email,
           qa.quiz_id, q.title as quiz_title, c.id as course_id, c.title as course_title,
           qa.score, qa.total_questions, qa.created_at
    FROM "QuizAttempt" qa
    JOIN "User" u ON u.id = qa.user_id
    JOIN "Quiz" q ON q.id = qa.quiz_id
    JOIN "Course" c ON c.id = q.course_id AND c.created_by_id = ${teacherId}
    ORDER BY qa.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    userName: r.user_name as string,
    userEmail: r.user_email as string,
    quizId: r.quiz_id as string,
    quizTitle: r.quiz_title as string,
    courseId: r.course_id as string,
    courseTitle: r.course_title as string,
    score: Number(r.score),
    totalQuestions: Number(r.total_questions),
    createdAt: r.created_at as Date,
  }));
}

/** إجمالي أرباح المنصة (كورسات + اشتراكات + متجر) */
export async function getTotalPlatformEarnings(): Promise<number> {
  let coursesTotal = 0;
  let subscriptionsTotal = 0;
  let storeTotal = 0;

  try {
    const rows = await sql`SELECT COALESCE(SUM(amount), 0)::float as total FROM "Payment"`;
    coursesTotal = Number((rows[0] as { total: number })?.total ?? 0);
  } catch {
    coursesTotal = 0;
  }

  try {
    const rows = await sql`SELECT COALESCE(SUM(price_paid), 0)::float as total FROM "UserPlatformSubscription"`;
    subscriptionsTotal = Number((rows[0] as { total: number })?.total ?? 0);
  } catch {
    subscriptionsTotal = 0;
  }

  try {
    const rows = await sql`SELECT COALESCE(SUM(price_paid), 0)::float as total FROM "UserStorePurchase"`;
    storeTotal = Number((rows[0] as { total: number })?.total ?? 0);
  } catch {
    storeTotal = 0;
  }

  return coursesTotal + subscriptionsTotal + storeTotal;
}

export async function getTotalEarningsForTeacher(teacherId: string): Promise<number> {
  try {
    const rows = await sql`
      SELECT COALESCE(SUM(p.amount), 0)::float as total
      FROM "Payment" p
      INNER JOIN "Course" c ON c.id = p.course_id AND c.created_by_id = ${teacherId}
    `;
    return Number((rows[0] as { total: number })?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function createPayment(userId: string, courseId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const id = generateId();
  await sql`
    INSERT INTO "Payment" (id, user_id, course_id, amount)
    VALUES (${id}, ${userId}, ${courseId}, ${amount})
  `;
}

// ----- LiveStream -----
export async function getLiveStreamsByCourseId(courseId: string): Promise<LiveStream[]> {
  const rows = await sql`
    SELECT * FROM "LiveStream" WHERE course_id = ${courseId} ORDER BY "order" ASC, scheduled_at ASC
  `;
  return rowsToCamel(rows as Record<string, unknown>[]) as unknown as LiveStream[];
}

export async function getLiveStreamsAll(): Promise<(LiveStream & { course?: { id: string; title: string; slug: string } })[]> {
  const rows = await sql`
    SELECT ls.*, c.id as c_id, c.title as c_title, c.slug as c_slug
    FROM "LiveStream" ls
    LEFT JOIN "Course" c ON c.id = ls.course_id
    ORDER BY ls.scheduled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const { c_id, c_title, c_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, course: c_id ? { id: c_id, title: c_title, slug: c_slug } : undefined };
  }) as unknown as (LiveStream & { course?: { id: string; title: string; slug: string } })[];
}

export async function getLiveStreamsForTeacher(
  teacherId: string,
): Promise<(LiveStream & { course?: { id: string; title: string; slug: string } })[]> {
  const rows = await sql`
    SELECT ls.*, c.id as c_id, c.title as c_title, c.slug as c_slug
    FROM "LiveStream" ls
    INNER JOIN "Course" c ON c.id = ls.course_id AND c.created_by_id = ${teacherId}
    ORDER BY ls.scheduled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const { c_id, c_title, c_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, course: c_id ? { id: c_id, title: c_title, slug: c_slug } : undefined };
  }) as unknown as (LiveStream & { course?: { id: string; title: string; slug: string } })[];
}

export async function getLiveStreamById(id: string): Promise<LiveStream | null> {
  const rows = await sql`SELECT * FROM "LiveStream" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as LiveStream | null;
}

export async function createLiveStream(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  provider: LiveStreamProvider;
  meeting_url: string;
  meeting_id?: string | null;
  meeting_password?: string | null;
  scheduled_at: Date;
  description?: string | null;
  order?: number;
}): Promise<LiveStream> {
  const id = generateId();
  await sql`
    INSERT INTO "LiveStream" (id, course_id, title, title_ar, provider, meeting_url, meeting_id, meeting_password, scheduled_at, description, "order")
    VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.provider}, ${data.meeting_url}, ${data.meeting_id ?? null}, ${data.meeting_password ?? null}, ${data.scheduled_at}, ${data.description ?? null}, ${data.order ?? 0})
  `;
  const ls = await getLiveStreamById(id);
  if (!ls) throw new Error("فشل إنشاء البث المباشر");
  return ls;
}

export async function updateLiveStream(
  id: string,
  data: {
    course_id?: string;
    title?: string;
    title_ar?: string | null;
    provider?: LiveStreamProvider;
    meeting_url?: string;
    meeting_id?: string | null;
    meeting_password?: string | null;
    scheduled_at?: Date;
    description?: string | null;
    order?: number;
  }
): Promise<void> {
  if (data.course_id !== undefined) await sql`UPDATE "LiveStream" SET course_id = ${data.course_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title !== undefined) await sql`UPDATE "LiveStream" SET title = ${data.title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title_ar !== undefined) await sql`UPDATE "LiveStream" SET title_ar = ${data.title_ar}, updated_at = NOW() WHERE id = ${id}`;
  if (data.provider !== undefined) await sql`UPDATE "LiveStream" SET provider = ${data.provider}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_url !== undefined) await sql`UPDATE "LiveStream" SET meeting_url = ${data.meeting_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_id !== undefined) await sql`UPDATE "LiveStream" SET meeting_id = ${data.meeting_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_password !== undefined) await sql`UPDATE "LiveStream" SET meeting_password = ${data.meeting_password}, updated_at = NOW() WHERE id = ${id}`;
  if (data.scheduled_at !== undefined) await sql`UPDATE "LiveStream" SET scheduled_at = ${data.scheduled_at}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "LiveStream" SET description = ${data.description}, updated_at = NOW() WHERE id = ${id}`;
  if (data.order !== undefined) await sql`UPDATE "LiveStream" SET "order" = ${data.order}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteLiveStream(id: string): Promise<void> {
  await sql`DELETE FROM "LiveStream" WHERE id = ${id}`;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const rows = await sql`SELECT * FROM "User" WHERE role = ${role} ORDER BY created_at DESC`;
  return rows as User[];
}

/** حذف حساب مدرس — يتحقق من الرتبة قبل الحذف (دوراته تبقى مع created_by_id = null إن كان القيد كذلك في قاعدة البيانات) */
export async function deleteTeacherUser(userId: string): Promise<void> {
  const u = await getUserById(userId);
  if (!u) throw new Error("المستخدم غير موجود");
  if (u.role !== "TEACHER") throw new Error("يمكن حذف حسابات المدرسين فقط");
  await sql`DELETE FROM "User" WHERE id = ${userId}`;
}

/** طلاب لديهم تسجيل في أي كورس أنشأه المدرس */
export async function getStudentsEnrolledInTeacherCourses(teacherId: string): Promise<User[]> {
  const rows = await sql`
    SELECT DISTINCT u.*
    FROM "User" u
    INNER JOIN "Enrollment" e ON e.user_id = u.id
    INNER JOIN "Course" c ON c.id = e.course_id AND c.created_by_id = ${teacherId}
    WHERE u.role = 'STUDENT'
    ORDER BY u.name ASC
  `;
  return rows as User[];
}

export async function getEnrollmentsWithCourseByUserId(userId: string): Promise<Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>> {
  const rows = await sql`
    SELECT e.*, c.id as c_id, c.title as c_title, c.title_ar as c_title_ar, c.slug as c_slug
    FROM "Enrollment" e
    JOIN "Course" c ON c.id = e.course_id
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    course_id: r.course_id,
    enrolled_at: r.enrolled_at,
    course: {
      id: r.c_id,
      title: r.c_title,
      titleAr: r.c_title_ar,
      slug: r.c_slug,
    },
  })) as Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>;
}

/** دورات الطالب المسجّل فيها — بنفس شكل الكورسات في الصفحة الرئيسية (للعرض كبطاقات) */
export async function getEnrolledCoursesForUser(userId: string): Promise<(Course & { category?: Category })[]> {
  await ensureLessonRatingsSchema();
  const rows = await sql`
    SELECT c.*, ${courseRatingSelectSql()}, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Enrollment" e
    JOIN "Course" c ON c.id = e.course_id
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export async function getUserByEmailExcludingId(email: string, excludeUserId: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE email = ${email} AND id != ${excludeUserId} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

// ----- Counts -----
export async function countUsersByRole(role: UserRole): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = ${role}`;
  return Number((rows[0] as { c: number }).c ?? 0);
}

export async function countCourses(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int as c FROM "Course"`;
  return Number((rows[0] as { c: number }).c ?? 0);
}

// ----- Conversation & Message (التواصل الخاص مع الطلبة) -----
export async function getOrCreateConversation(staffUserId: string, studentUserId: string): Promise<Conversation> {
  const existing = await sql`
    SELECT * FROM "Conversation" WHERE staff_user_id = ${staffUserId} AND student_user_id = ${studentUserId} LIMIT 1
  `;
  const row = existing[0] as Record<string, unknown> | undefined;
  if (row) return rowToCamel(row) as Conversation;
  const id = generateId();
  await sql`
    INSERT INTO "Conversation" (id, staff_user_id, student_user_id, created_at, updated_at)
    VALUES (${id}, ${staffUserId}, ${studentUserId}, NOW(), NOW())
  `;
  const rows = await sql`SELECT * FROM "Conversation" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Conversation;
}

export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const rows = await sql`SELECT * FROM "Conversation" WHERE id = ${conversationId} LIMIT 1`;
  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? (rowToCamel(r) as Conversation) : null;
}

/** محادثات الموظف مع الطلبة (للأدمن/مساعد) */
export async function getConversationsByStaffId(staffUserId: string): Promise<(Conversation & { studentName?: string })[]> {
  const rows = await sql`
    SELECT c.*, u.name as student_name
    FROM "Conversation" c
    JOIN "User" u ON u.id = c.student_user_id
    WHERE c.staff_user_id = ${staffUserId}
    ORDER BY c.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const { student_name, ...rest } = r;
    const conv = rowToCamel(rest) as Conversation;
    return { ...conv, studentName: student_name as string };
  });
}

/** محادثات الطالب (الرسائل الواردة من الموظفين) */
export async function getConversationsByStudentId(studentUserId: string): Promise<(Conversation & { staffName?: string; staffRole?: string })[]> {
  const rows = await sql`
    SELECT c.*, u.name as staff_name, u.role as staff_role
    FROM "Conversation" c
    JOIN "User" u ON u.id = c.staff_user_id
    WHERE c.student_user_id = ${studentUserId}
    ORDER BY c.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const { staff_name, staff_role, ...rest } = r;
    const conv = rowToCamel(rest) as Conversation;
    return { ...conv, staffName: staff_name as string, staffRole: staff_role as string };
  });
}

/** قائمة الموظفين الذين يمكن للطالب مراسلتهم (أدمن + مساعد أدمن) */
export async function getStaffForStudentMessaging(): Promise<{ id: string; role: string }[]> {
  const rows = await sql`
    SELECT id, role FROM "User"
    WHERE role IN ('ADMIN', 'ASSISTANT_ADMIN')
    ORDER BY role ASC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({ id: r.id as string, role: r.role as string }));
}

export async function canUserAccessConversation(userId: string, role: UserRole, conversation: Conversation): Promise<boolean> {
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
    return conversation.staffUserId === userId;
  }
  if (role === "STUDENT") return conversation.studentUserId === userId;
  return false;
}

export async function getMessageById(messageId: string): Promise<Message | null> {
  const rows = await sql`SELECT * FROM "Message" WHERE id = ${messageId} LIMIT 1`;
  const r = rows[0] as Record<string, unknown> | undefined;
  return r ? (rowToCamel(r) as Message) : null;
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const rows = await sql`
    SELECT * FROM "Message" WHERE conversation_id = ${conversationId} ORDER BY created_at ASC
  `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as Message);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await sql`DELETE FROM "Message" WHERE id = ${messageId}`;
}

export async function createMessage(data: {
  conversation_id: string;
  sender_id: string;
  message_type: "text" | "image" | "file";
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
}): Promise<Message> {
  const id = generateId();
  await sql`
    INSERT INTO "Message" (id, conversation_id, sender_id, message_type, content, file_url, file_name, created_at)
    VALUES (${id}, ${data.conversation_id}, ${data.sender_id}, ${data.message_type}, ${data.content ?? null}, ${data.file_url ?? null}, ${data.file_name ?? null}, NOW())
  `;
  await sql`UPDATE "Conversation" SET updated_at = NOW() WHERE id = ${data.conversation_id}`;
  const rows = await sql`SELECT * FROM "Message" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Message;
}
