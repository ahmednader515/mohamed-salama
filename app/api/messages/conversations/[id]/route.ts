import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConversationById, getMessagesByConversationId, canUserAccessConversation } from "@/lib/db";
import type { UserRole } from "@/lib/types";

/** جلب رسائل محادثة معينة */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: conversationId } = await params;
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  }

  const allowed = await canUserAccessConversation(session.user.id, session.user.role as UserRole, conversation);
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const messages = await getMessagesByConversationId(conversationId);
  return NextResponse.json({ conversation, messages });
}
