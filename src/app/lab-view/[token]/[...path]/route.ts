import { NextResponse, type NextRequest } from "next/server";
import { labFolderOf, verifyLabToken } from "@/lib/lab-links";
import { isLabPath, readLabFile } from "@/services/lab";

// Serves Lab files (interactive HTML pages and their CSS, scripts, images…) to whoever holds a valid,
// unexpired folder token from Admin → Lab → Open. No token, wrong folder or expired: 404.

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  woff2: "font/woff2",
  woff: "font/woff",
};

type Params = { params: Promise<{ token: string; path: string[] }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token, path } = await params;
  // Segments may arrive already decoded; decoding twice would break names containing "%".
  const safeDecode = (segment: string) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  };
  const key = path.map(safeDecode).join("/");
  if (!isLabPath(key) || !verifyLabToken(token, labFolderOf(key))) {
    return NextResponse.json({ error: "This link has expired. Open the file again from Admin → Lab." }, { status: 404 });
  }

  const bytes = await readLabFile(key);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": TYPES[extension] ?? "application/octet-stream",
    "Cache-Control": "private, no-store",
    // The token is in the URL: never pass it on to other sites in the Referer header.
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Content-Type-Options": "nosniff",
  };
  if (extension === "html" || extension === "htm" || extension === "svg") {
    // Run the page in a sealed-off origin: its scripts work, but it can't read the site's cookies or the
    // admin session. Side effect: localStorage/cookies are unavailable to the page.
    headers["Content-Security-Policy"] = "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads";
  }
  return new NextResponse(new Uint8Array(bytes), { headers });
}
