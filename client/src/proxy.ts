import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_ROUTES } from "@/config/url";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  const isProtectedRoute = pathname.startsWith(APP_ROUTES.CONVERSATIONS.INDEX);
  if (isProtectedRoute && !session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = APP_ROUTES.AUTH.LOGIN;
    return NextResponse.redirect(loginUrl);
  }

  const isAuthRoute = pathname === APP_ROUTES.AUTH.LOGIN || pathname === APP_ROUTES.AUTH.REGISTER;
  if (isAuthRoute && session) {
    const conversationsUrl = req.nextUrl.clone();
    conversationsUrl.pathname = APP_ROUTES.CONVERSATIONS.INDEX;
    return NextResponse.redirect(conversationsUrl);
  }

  return res;
}

export const config = {
  matcher: ["/conversations/:path*", "/login", "/register"],
};
