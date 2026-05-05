import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings, updateHomepageSettings } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json({
      addBalanceTitle: settings.addBalanceTitle,
      addBalanceTitleEn: settings.addBalanceTitleEn,
      addBalanceSubtitle: settings.addBalanceSubtitle,
      addBalanceSubtitleEn: settings.addBalanceSubtitleEn,
      addBalanceMethodTitle: settings.addBalanceMethodTitle,
      addBalanceMethodTitleEn: settings.addBalanceMethodTitleEn,
      addBalanceTransferInstruction: settings.addBalanceTransferInstruction,
      addBalanceTransferInstructionEn: settings.addBalanceTransferInstructionEn,
      addBalanceWalletNumber: settings.addBalanceWalletNumber,
      addBalanceConfirmationNote: settings.addBalanceConfirmationNote,
      addBalanceConfirmationNoteEn: settings.addBalanceConfirmationNoteEn,
      addBalanceWhatsappNumber: settings.addBalanceWhatsappNumber,
      addBalanceWhatsappButtonText: settings.addBalanceWhatsappButtonText,
      addBalanceWhatsappButtonTextEn: settings.addBalanceWhatsappButtonTextEn,
      addBalanceWaitingNote: settings.addBalanceWaitingNote,
      addBalanceWaitingNoteEn: settings.addBalanceWaitingNoteEn,
    });
  } catch {
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const norm = (v: unknown) => {
    if (v === undefined) return undefined;
    const s = String(v ?? "").trim();
    return s.length > 0 ? s : null;
  };

  try {
    await updateHomepageSettings({
      add_balance_title: norm(body.addBalanceTitle),
      add_balance_title_en: norm(body.addBalanceTitleEn),
      add_balance_subtitle: norm(body.addBalanceSubtitle),
      add_balance_subtitle_en: norm(body.addBalanceSubtitleEn),
      add_balance_method_title: norm(body.addBalanceMethodTitle),
      add_balance_method_title_en: norm(body.addBalanceMethodTitleEn),
      add_balance_transfer_instruction: norm(body.addBalanceTransferInstruction),
      add_balance_transfer_instruction_en: norm(body.addBalanceTransferInstructionEn),
      add_balance_wallet_number: norm(body.addBalanceWalletNumber),
      add_balance_confirmation_note: norm(body.addBalanceConfirmationNote),
      add_balance_confirmation_note_en: norm(body.addBalanceConfirmationNoteEn),
      add_balance_whatsapp_number: norm(body.addBalanceWhatsappNumber),
      add_balance_whatsapp_button_text: norm(body.addBalanceWhatsappButtonText),
      add_balance_whatsapp_button_text_en: norm(body.addBalanceWhatsappButtonTextEn),
      add_balance_waiting_note: norm(body.addBalanceWaitingNote),
      add_balance_waiting_note_en: norm(body.addBalanceWaitingNoteEn),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
