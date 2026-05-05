import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConversationById, canUserAccessConversation, createMessage } from "@/lib/db";
import type { UserRole } from "@/lib/types";

/** إرسال رسالة في محادثة */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: { conversationId?: string; messageType?: string; content?: string; fileUrl?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: "معرف المحادثة مطلوب" }, { status: 400 });
  }

  const type = body.messageType === "image" || body.messageType === "file" ? body.messageType : "text";
  if (type === "text" && !(body.content != null && String(body.content).trim())) {
    return NextResponse.json({ error: "محتوى النص مطلوب" }, { status: 400 });
  }
  if ((type === "image" || type === "file") && !body.fileUrl?.trim()) {
    return NextResponse.json({ error: "رابط الملف مطلوب بعد الرفع" }, { status: 400 });
  }

  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  }

  const allowed = await canUserAccessConversation(session.user.id, session.user.role as UserRole, conversation);
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const message = await createMessage({
    conversation_id: conversationId,
    sender_id: session.user.id,
    message_type: type,
    content: type === "text" ? (body.content?.trim() || null) : null,
    file_url: type !== "text" ? (body.fileUrl?.trim() || null) : null,
    file_name: type !== "text" ? (body.fileName?.trim() || null) : null,
  });
  return NextResponse.json(message);
}
