/** أحرف واضحة (بدون I و O لتقليل الالتباس) */
const LETTER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const ALNUM = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** كود من 5 رموز: حرف واحد + 4 أحرف/أرقام (مثل A0125) */
export function generateCopyrightCodeCandidate(): string {
  const L = LETTER[Math.floor(Math.random() * LETTER.length)]!;
  let rest = "";
  for (let i = 0; i < 4; i++) {
    rest += ALNUM[Math.floor(Math.random() * ALNUM.length)]!;
  }
  return L + rest;
}
