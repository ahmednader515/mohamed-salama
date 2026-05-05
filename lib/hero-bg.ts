/**
 * خلفية هيرو الصفحة الرئيسية — تدرجات جاهزة + ألوان مخصّصة (hex).
 */

export const HERO_BG_PRESET_GRADIENTS: Record<string, { from: string; to: string }> = {
  navy: { from: "#14162E", to: "#1E2145" },
  indigo: { from: "#1e1b4b", to: "#312e81" },
  purple: { from: "#2e1065", to: "#4c1d95" },
  teal: { from: "#134e4a", to: "#0f766e" },
  forest: { from: "#14532d", to: "#166534" },
  slate: { from: "#0f172a", to: "#1e293b" },
  crimson: { from: "#450a0a", to: "#7f1d1d" },
  rose: { from: "#4c0519", to: "#9f1239" },
  sunset: { from: "#431407", to: "#c2410c" },
  sky: { from: "#0c4a6e", to: "#0369a1" },
  cyan: { from: "#083344", to: "#0e7490" },
  stone: { from: "#1c1917", to: "#44403c" },
  midnight: { from: "#020617", to: "#1e293b" },
  wine: { from: "#2e0b1f", to: "#581c3f" },
};

const HEX3_BODY = /^[0-9A-Fa-f]{3}$/;
const HEX6_BODY = /^[0-9A-Fa-f]{6}$/;
const HEX8_BODY = /^[0-9A-Fa-f]{8}$/;

/** إزالة محارف غير مرئية شائعة من نسخ التصميم / الوورد */
function stripInvisible(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
}

/** تحويل أرقام/حروف hex من النسخة العريضة (يابانية/صينية) إلى ASCII */
function normalizeFullWidthHexBody(body: string): string {
  let out = "";
  for (const ch of body) {
    const c = ch.charCodeAt(0);
    if (c >= 0xff10 && c <= 0xff19) out += String.fromCharCode(c - 0xff10 + 0x30);
    else if (c >= 0xff21 && c <= 0xff26) out += String.fromCharCode(c - 0xff21 + 0x41);
    else if (c >= 0xff41 && c <= 0xff46) out += String.fromCharCode(c - 0xff41 + 0x61);
    else out += ch;
  }
  return out;
}

/**
 * أخطاء شائعة: حرف O بدل 0 في آخر خانة (#1135BO)، مسافات داخل السلسلة، # عريضة ＃.
 */
function sanitizeHexBody(body: string): string {
  let b = stripInvisible(body).replace(/\s+/g, "");
  b = normalizeFullWidthHexBody(b);
  // في سياق RRGGBB غالباً O المستديرة خطأ إدخال عن 0
  b = b.replace(/[Oo]/g, "0");
  return b;
}

/**
 * قبول ألوان شائعة في النماذج / المخططات:
 * `#RRGGBB`, `#RGB`, بدون `#`، وأحيانًا `#RRGGBBAA` من حالّات بعض المتصفّحات لمُدخل type="color".
 */
export function normalizeHeroHex(input: string): string | null {
  let s = stripInvisible(input.trim());
  if (!s) return null;
  while (s.startsWith("#") || s.startsWith("＃")) s = s.slice(1);
  s = sanitizeHexBody(s);
  if (!s) return null;
  if (HEX8_BODY.test(s)) s = s.slice(0, 6);
  if (HEX6_BODY.test(s)) return `#${s.toLowerCase()}`;
  if (HEX3_BODY.test(s)) {
    const r = s[0];
    const g = s[1];
    const b = s[2];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function resolveHeroBgGradient(settings: {
  heroBgPreset?: string | null;
  heroBgCustomFrom?: string | null;
  heroBgCustomTo?: string | null;
}): { from: string; to: string } {
  const nf = normalizeHeroHex(String(settings.heroBgCustomFrom ?? ""));
  const nt = normalizeHeroHex(String(settings.heroBgCustomTo ?? ""));
  if (nf && nt) return { from: nf, to: nt };
  const key = settings.heroBgPreset?.trim() ?? "";
  if (key && HERO_BG_PRESET_GRADIENTS[key]) return HERO_BG_PRESET_GRADIENTS[key];
  return HERO_BG_PRESET_GRADIENTS.navy;
}
