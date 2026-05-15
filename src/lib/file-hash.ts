/**
 * SHA-256 hex digest of a File / Blob using the browser's crypto.subtle.
 * Runs client-side from the upload hook; the hash is then passed to the
 * insertResumeRow server action for dedup.
 */
export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
