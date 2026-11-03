import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { createLabToken, labFolderOf } from "@/lib/lab-links";
import { isLabPath } from "@/services/lab";

/**
 * Admin only: turns "Open" into a viewer link (/lab-view/<token>/<folder>/<file>) valid for 2 hours.
 * The token covers the file's folder, so an HTML page's own CSS, scripts and images load too.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  const key = request.nextUrl.searchParams.get("path") ?? "";
  if (!admin?.isPlatformAdmin || !isLabPath(key)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = createLabToken(labFolderOf(key));
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return NextResponse.redirect(new URL(`/lab-view/${token}/${encoded}`, request.url));
}
