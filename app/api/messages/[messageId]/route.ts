import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMessageById, deleteMessage } from "@/lib/db";

/** حذف رسالة (للمرسل فقط) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { messageId } = await params;
  if (!messageId?.trim()) {
    return NextResponse.json({ error: "معرف الرسالة مطلوب" }, { status: 400 });
  }

  const message = await getMessageById(messageId.trim());
  if (!message) {
    return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  }

  if (message.senderId !== session.user.id) {
    return NextResponse.json({ error: "يمكنك حذف رسائلك فقط" }, { status: 403 });
  }

  await deleteMessage(messageId.trim());
  return NextResponse.json({ ok: true });
}
