import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth/session";

const LOGIN_PATH = "/admin/login";

// First line of defence only — every admin page and action re-checks authorisation server-side.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === LOGIN_PATH;

  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") {
    const authed = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (!authed && !isLogin) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !isLogin) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
