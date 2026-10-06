import { NextResponse, type NextRequest } from "next/server";
import { isSupabase } from "@/lib/env";
import { getPublicDataSource } from "@/services";

export const dynamic = "force-dynamic";

/**
 * Called daily by Vercel Cron (see vercel.json) so the free Supabase project
 * sees activity and isn't paused after a quiet week.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isSupabase) return NextResponse.json({ ok: true, skipped: "mock data source" });

  try {
    await (await getPublicDataSource()).artists.list();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
