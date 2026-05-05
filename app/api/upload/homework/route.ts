import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2, isR2Configured, getMissingR2EnvVars } from "@/lib/r2";

const MAX_PDF = 10 * 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;
const PDF_TYPE = "application/pdf";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** رفع ملف واجب (PDF أو صورة) — للطالب المسجّل فقط */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
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

  const isPdf = file.type === PDF_TYPE;
  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. استخدم PDF أو صورة (jpeg, png, webp, gif)." },
      { status: 400 }
    );
  }

  if (isPdf && file.size > MAX_PDF) {
    return NextResponse.json({ error: "حجم الملف أكبر من 10 ميجابايت" }, { status: 400 });
  }
  if (isImage && file.size > MAX_IMAGE) {
    return NextResponse.json({ error: "حجم الصورة أكبر من 5 ميجابايت" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || (isPdf ? "pdf" : "jpg");
  const safeExt = isPdf ? "pdf" : ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const key = `homework/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url: uploadedUrl } = await uploadToR2(buffer, key, file.type);
    const baseUrl = process.env.R2_PUBLIC_URL?.trim()?.replace(/\/$/, "") || null;
    const url = uploadedUrl || (baseUrl ? `${baseUrl}/${key}` : null);
    if (!url) {
      return NextResponse.json({ error: "تم الرفع لكن الرابط غير متوفر." }, { status: 200 });
    }
    return NextResponse.json({ url, key, fileName: file.name });
  } catch (e) {
    console.error("Homework upload error:", e);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
