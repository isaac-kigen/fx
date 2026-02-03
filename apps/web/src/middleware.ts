import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getSession();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isDeniedRoute = request.nextUrl.pathname.startsWith("/access-denied");
  if (!data.session && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (data.session) {
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", data.session.user.id).single();
    const allowed = profile?.role === "admin" || profile?.role === "trader";
    if (!allowed && !isDeniedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/access-denied";
      return NextResponse.redirect(redirectUrl);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
