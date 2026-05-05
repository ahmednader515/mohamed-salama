"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { dateLocaleForUi } from "@/lib/i18n/dashboard-table";

type ConversationItem = {
  id: string;
  staffUserId?: string;
  studentUserId?: string;
  studentName?: string;
  staffName?: string;
  staffRole?: string;
  updatedAt?: string;
};

type StaffItem = { id: string; role: string };

type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: string;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

type StudentItem = { id: string; name: string; email: string };

export function MessagesView({
  isStaff,
  userId,
  userName,
}: {
  isStaff: boolean;
  userId: string;
  userName: string;
}) {
  const t = useT();
  const locale = useLocale();
  const V = "dashboard.messagesView";
  const dateLocale = dateLocaleForUi(locale);

  function roleLabel(role: string) {
    return t(`header.role.${role}`, role);
  }
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const filteredStudents = !studentSearch.trim()
    ? students
    : students.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(studentSearch.trim().toLowerCase()) ||
          (s.email || "").toLowerCase().includes(studentSearch.trim().toLowerCase())
      );

  useEffect(() => {
    fetch("/api/messages/conversations")
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
    if (isStaff) {
      fetch("/api/messages/students")
        .then((r) => r.json())
        .then((data) => setStudents(Array.isArray(data) ? data : []))
        .catch(() => setStudents([]));
    } else {
      fetch("/api/messages/staff")
        .then((r) => r.json())
        .then((data) => setStaffList(Array.isArray(data) ? data : []))
        .catch(() => setStaffList([]));
    }
  }, [isStaff]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    fetch(`/api/messages/conversations/${selectedConversationId}`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data.messages) ? data.messages : []))
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [selectedConversationId]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, messagesLoading]);

  async function openChatWithStudent(studentId: string) {
    setSelectedStudentId(studentId);
    const existing = conversations.find((c) => (c as { studentUserId?: string }).studentUserId === studentId);
    if (existing) {
      setSelectedConversationId(existing.id);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const conv = await res.json();
      if (conv.id) {
        setSelectedConversationId(conv.id);
        setConversations((prev) => {
          const has = prev.some((c) => c.id === conv.id);
          if (has) return prev;
          const name = students.find((s) => s.id === studentId)?.name ?? t(`${V}.studentFallback`);
          return [{ id: conv.id, studentName: name, ...conv }, ...prev];
        });
      }
    } finally {
      setSending(false);
    }
  }

  function selectConversation(convId: string) {
    setSelectedConversationId(convId);
    setSelectedStudentId(null);
  }

  async function deleteMessage(msgId: string) {
    if (deletingId) return;
    setDeletingId(msgId);
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function openChatWithStaff(staffId: string) {
    const existing = conversations.find((c) => c.staffUserId === staffId);
    if (existing) {
      setSelectedConversationId(existing.id);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      const conv = await res.json();
      if (conv.id) {
        setSelectedConversationId(conv.id);
        const staff = staffList.find((s) => s.id === staffId);
        setConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) return prev;
          return [{ id: conv.id, staffUserId: staffId, staffRole: staff?.role, ...conv }, ...prev];
        });
      }
    } finally {
      setSending(false);
    }
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed || !selectedConversationId || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConversationId, messageType: "text", content: trimmed }),
      });
      const msg = await res.json();
      if (msg.id) setMessages((prev) => [...prev, msg]);
    } finally {
      setSending(false);
    }
  }

  async function sendFile(type: "image" | "file") {
    if (!selectedConversationId || sending || fileUploading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : "image/*,.pdf,.doc,.docx,.xls,.xlsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setFileUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const up = await fetch("/api/upload/message", { method: "POST", body: formData });
        const upData = await up.json();
        if (!up.ok || !upData.url) {
          setFileUploading(false);
          return;
        }
        setSending(true);
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: selectedConversationId,
            messageType: upData.messageType || type,
            fileUrl: upData.url,
            fileName: upData.fileName || file.name,
          }),
        });
        const msg = await res.json();
        if (msg.id) setMessages((prev) => [...prev, msg]);
      } finally {
        setSending(false);
        setFileUploading(false);
      }
    };
    input.click();
  }

  const currentTitle = selectedConversationId
    ? isStaff
      ? conversations.find((c) => c.id === selectedConversationId)?.studentName ?? students.find((s) => s.id === selectedStudentId)?.name ?? t(`${V}.studentFallback`)
      : (() => {
          const conv = conversations.find((c) => c.id === selectedConversationId);
          if (conv?.staffRole) return roleLabel(conv.staffRole);
          return conv?.staffName ?? t(`${V}.staffFallbackAdmin`);
        })()
    : null;

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {isStaff ? (
          <>
            <h3 className="mb-3 font-medium text-[var(--color-foreground)]">{t(`${V}.studentsHeading`)}</h3>
            <input
              type="search"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t(`${V}.searchPlaceholderStaff`)}
              className="mb-3 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm placeholder:text-[var(--color-muted)]"
            />
            <ul className="max-h-[420px] space-y-1 overflow-y-auto">
              {filteredStudents.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openChatWithStudent(s.id)}
                    disabled={sending}
                    className={`w-full rounded-[var(--radius-btn)] px-3 py-2 text-right text-sm ${selectedStudentId === s.id || conversations.find((c) => c.id === selectedConversationId)?.studentUserId === s.id ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" : "hover:bg-[var(--color-background)]"}`}
                  >
                    {s.name || s.email}
                  </button>
                </li>
              ))}
              {students.length === 0 && !loading && <p className="text-sm text-[var(--color-muted)]">{t(`${V}.noStudents`)}</p>}
              {students.length > 0 && filteredStudents.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t(`${V}.noSearchResultsStaff`)}</p>}
            </ul>
          </>
        ) : (
          <>
            <h3 className="mb-3 font-medium text-[var(--color-foreground)]">{t(`${V}.messagingStaffHeading`)}</h3>
            {loading ? (
              <p className="text-sm text-[var(--color-muted)]">{t(`${V}.loading`)}</p>
            ) : (
              <ul className="space-y-1">
                {staffList.map((s) => {
                  const conv = conversations.find((c) => c.staffUserId === s.id);
                  const label = roleLabel(s.role);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => (conv ? selectConversation(conv.id) : openChatWithStaff(s.id))}
                        disabled={sending}
                        className={`w-full rounded-[var(--radius-btn)] px-3 py-2 text-right text-sm ${selectedConversationId === conv?.id ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" : "hover:bg-[var(--color-background)]"}`}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && staffList.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t(`${V}.noContactsStaff`)}</p>}
          </>
        )}
      </div>

      <div className="flex min-h-[400px] flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {!selectedConversationId ? (
          <div className="flex flex-1 items-center justify-center text-[var(--color-muted)]">
            {isStaff ? t(`${V}.selectPromptStaff`) : t(`${V}.selectPromptStudent`)}
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-foreground)]">
              {currentTitle}
            </div>
            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-4">
              {messagesLoading ? (
                <p className="text-sm text-[var(--color-muted)]">{t(`${V}.loadingMessages`)}</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isMe = m.senderId === userId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                        <div className={`relative max-w-[85%] rounded-[var(--radius-btn)] px-3 py-2 ${isMe ? "bg-[var(--color-primary)]/15 text-[var(--color-foreground)]" : "bg-[var(--color-background)]"}`}>
                          {m.messageType === "text" && <p className="whitespace-pre-wrap text-sm">{m.content}</p>}
                          {(m.messageType === "image" || m.messageType === "file") && m.fileUrl && (
                            <div>
                              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] underline">
                                {m.fileName ?? t(`${V}.openFile`)}
                              </a>
                              {m.messageType === "image" && (
                                <img src={m.fileUrl} alt="" className="mt-2 max-h-48 rounded-[var(--radius-btn)] object-cover" />
                              )}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-xs text-[var(--color-muted)]">
                              {new Date(m.createdAt).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" })}
                            </p>
                            {isMe && (
                              <button
                                type="button"
                                onClick={() => deleteMessage(m.id)}
                                disabled={deletingId === m.id}
                                title={t(`${V}.deleteMessageTitle`)}
                                className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-background)] hover:text-red-500 disabled:opacity-50"
                              >
                                {deletingId === m.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendText())}
                  placeholder={t(`${V}.messagePlaceholder`)}
                  rows={2}
                  className="min-w-[200px] flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => sendFile("image")}
                    disabled={fileUploading || sending}
                    title={t(`${V}.imageTitle`)}
                    className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    onClick={() => sendFile("file")}
                    disabled={fileUploading || sending}
                    title={t(`${V}.fileTitle`)}
                    className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
                  >
                    📎
                  </button>
                  <button
                    type="button"
                    onClick={sendText}
                    disabled={sending || !text.trim()}
                    className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {t(`${V}.send`)}
                  </button>
                </div>
              </div>
              {fileUploading && <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${V}.uploadingFile`)}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
