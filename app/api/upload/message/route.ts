import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2, isR2Configured, getMissingR2EnvVars } from "@/lib/r2";

const MAX_FILE = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp", "gif", "doc", "docx", "xls", "xlsx"];

/** رفع صورة أو ملف للرسائل — لأي مستخدم مسجّل (أدمن / مساعد / طالب) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if (!isR2Configured()) {
    const missing = getMissingR2EnvVars().filter((m) => !m.startsWith("R2_PUBLIC"));
    return NextResponse.json(
      { error: "التخزين غير مضبوط. تواصل مع الإدارة." },
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

  const isImage = IMAGE_TYPES.includes(file.type);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const allowed = isImage || file.type === "application/pdf" || ALLOWED_EXT.includes(ext);
  if (!allowed) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. استخدم صورة أو PDF أو مستند." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE) {
    return NextResponse.json({ error: "حجم الملف أكبر من 10 ميجابايت" }, { status: 400 });
  }

  const safeExt = ALLOWED_EXT.includes(ext) ? ext : "bin";
  const key = `messages/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url: uploadedUrl } = await uploadToR2(buffer, key, file.type);
    const baseUrl = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/$/, "") || null;
    const url = uploadedUrl || (baseUrl ? `${baseUrl}/${key}` : null);
    if (!url) {
      return NextResponse.json({ error: "تم الرفع لكن الرابط غير متوفر." }, { status: 200 });
    }
    const messageType = isImage ? "image" : "file";
    return NextResponse.json({ url, key, fileName: file.name, messageType });
  } catch (e) {
    console.error("Message upload error:", e);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
