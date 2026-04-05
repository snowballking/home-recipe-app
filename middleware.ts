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

  if (!user && path.startsWith("/dashboard")) {
    return withSessionCookies(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  if (user && (path === "/login" || path === "/signup")) {
    return withSessionCookies(
      NextResponse.redirect(new URL("/dashboard", request.url))
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
