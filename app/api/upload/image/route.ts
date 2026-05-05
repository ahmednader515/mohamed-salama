import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2, isR2Configured, getMissingR2EnvVars } from "@/lib/r2";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  const canUpload =
    role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER";
  if (!session || !canUpload) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if (!isR2Configured()) {
    const missing = getMissingR2EnvVars().filter((m) => !m.startsWith("R2_PUBLIC"));
    return NextResponse.json(
      {
        error: "التخزين R2 غير مضبوط. أضف في ملف .env المتغيرات التالية (من لوحة Cloudflare > R2):",
        missing: missing.length ? missing : ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"],
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "لم يُرفع أي ملف" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. استخدم: jpeg, png, webp, gif" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "حجم الملف أكبر من 5 ميجابايت" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const key = `courses/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url: uploadedUrl } = await uploadToR2(buffer, key, file.type);

    const baseUrl = (uploadedUrl ? null : process.env.R2_PUBLIC_URL?.trim()?.replace(/\/$/, "")) || null;
    const url = uploadedUrl || (baseUrl ? `${baseUrl}/${key}` : null);

    if (!url) {
      return NextResponse.json({
        error: "تم الرفع لكن R2_PUBLIC_URL غير مضبوط. لا يمكن إرجاع رابط الصورة.",
        key,
      }, { status: 200 });
    }

    return NextResponse.json({ url, key });
  } catch (e) {
    console.error("R2 upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل رفع الملف" },
      { status: 500 }
    );
  }
}
