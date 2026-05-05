import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getR2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID?.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    bucket: process.env.R2_BUCKET_NAME?.trim(),
    publicUrl: process.env.R2_PUBLIC_URL?.trim()?.replace(/\/$/, ""),
  };
}

function getClient(): S3Client | null {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

/**
 * رفع ملف إلى R2 وإرجاع الرابط العام (إن وُجد R2_PUBLIC_URL)
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; url: string | null }> {
  const { bucket, publicUrl } = getR2Config();
  const client = getClient();
  if (!client || !bucket) {
    throw new Error("R2 غير مضبوط: تأكد من R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME في .env");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = publicUrl ? `${publicUrl}/${key}` : null;
  return { key, url };
}

export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey, bucket } = getR2Config();
  return !!(accountId && accessKeyId && secretAccessKey && bucket);
}

/** يُرجع قائمة بأسماء المتغيرات الناقصة في .env */
export function getMissingR2EnvVars(): string[] {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicUrl } = getR2Config();
  const missing: string[] = [];
  if (!accountId) missing.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("R2_BUCKET_NAME");
  if (!publicUrl) missing.push("R2_PUBLIC_URL (لظهور رابط الصورة بعد الرفع)");
  return missing;
}
