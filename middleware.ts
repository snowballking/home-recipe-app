import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  function withSessionCookies(redirect: NextResponse) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie;
      redirect.cookies.set(name, value, options);
    });
    for (const header of ["cache-control", "expires", "pragma"] as const) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  // ── Not logged in: block /dashboard ──────────────────────────
  if (!user && path.startsWith("/dashboard")) {
    return withSessionCookies(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  // ── Logged in: enforce admin approval for app content ────────
  if (user) {
    const protectedPath =
      path.startsWith("/dashboard") ||
      path.startsWith("/market") ||
      path.startsWith("/explore") ||
      path.startsWith("/recipe") ||
      path.startsWith("/plan") ||
      path.startsWith("/user") ||
      path.startsWith("/admin");

    if (protectedPath) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      // Admins bypass; everyone else must be approved.
      if (!profile?.is_admin && !profile?.is_approved) {
        return withSessionCookies(
          NextResponse.redirect(new URL("/pending-approval", request.url))
        );
      }

      // Non-admins cannot access /admin
      if (path.startsWith("/admin") && !profile?.is_admin) {
        return withSessionCookies(
          NextResponse.redirect(new URL("/dashboard/recipes", request.url))
        );
      }
    }

    if (path === "/" || path === "/login" || path === "/signup") {
      return withSessionCookies(
        NextResponse.redirect(new URL("/dashboard/recipes", request.url))
      );
    }

    // Already approved: don't let them linger on /pending-approval
    if (path === "/pending-approval") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_approved || profile?.is_admin) {
        return withSessionCookies(
          NextResponse.redirect(new URL("/dashboard/recipes", request.url))
        );
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/market",
    "/market/:path*",
    "/explore",
    "/explore/:path*",
    "/recipe/:path*",
    "/plan/:path*",
    "/user/:path*",
    "/admin",
    "/admin/:path*",
    "/pending-approval",
  ],
};
