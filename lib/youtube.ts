/**
 * استخراج معرف فيديو يوتيوب من الرابط
 * يدعم: youtu.be/xxx, youtube.com/watch?v=xxx, youtube.com/embed/xxx
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const be = u.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (be) return be[1];
  const watch = u.match(/(?:v=)([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = u.match(/(?:embed\/)([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
