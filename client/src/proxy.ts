import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Protected routes: redirect unauthenticated users to /login
  const isProtectedRoute = pathname.startsWith("/conversations");
  if (isProtectedRoute && !session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect already-authenticated users to /conversations
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  if (isAuthRoute && session) {
    const conversationsUrl = req.nextUrl.clone();
    conversationsUrl.pathname = "/conversations";
    return NextResponse.redirect(conversationsUrl);
  }

  return res;
}

export const config = {
  matcher: ["/conversations/:path*", "/login", "/register"],
};
