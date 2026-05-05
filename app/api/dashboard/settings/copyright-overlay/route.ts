import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings, updateHomepageSettings } from "@/lib/db";

type CopyrightOverlayStyle = "floating" | "watermark";

function normalizeStyle(input: unknown): CopyrightOverlayStyle {
  const s = String(input ?? "").trim().toLowerCase();
  return s === "watermark" ? "watermark" : "floating";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json({
      copyrightOverlayStyle:
        settings.copyrightOverlayStyle === "watermark" ? "watermark" : "floating",
    });
  } catch {
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  try {
    const style = normalizeStyle(body.copyrightOverlayStyle);
    await updateHomepageSettings({
      copyright_overlay_style: style,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
