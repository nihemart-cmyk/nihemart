import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
            setAll(cookiesToSet) {
               cookiesToSet.forEach(({ name, value, options }) =>
                  request.cookies.set(name, value)
               );
               supabaseResponse = NextResponse.next({
                  request,
               });
               cookiesToSet.forEach(({ name, value, options }) =>
                  supabaseResponse.cookies.set(name, value, options)
               );
            },
         },
      }
   );

   // Do not run code between createServerClient and
   // supabase.auth.getUser(). A simple mistake could make it very hard to debug
   // issues with users being randomly logged out.

   // IMPORTANT: DO NOT REMOVE auth.getUser()

   const {
      data: { user },
   } = await supabase.auth.getUser();

   // Protect all private routes: redirect unauthenticated users to /signin
   if (
      !user &&
      !request.nextUrl.pathname.startsWith("/signin") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/error")
   ) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      return NextResponse.redirect(url);
   }

   // Prevent logged-in users from accessing /signin or /auth/signin
   if (
      user &&
      ["/signin", "/auth/signin", "/(auth)/signin"].includes(
         request.nextUrl.pathname
      )
   ) {
      const url = request.nextUrl.clone();

      // Fetch user roles to determine redirect. Use user metadata as a fallback
      // because the user_roles row may not exist yet immediately after admin-created users.
      const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);

      const metaRole = (user as any)?.user_metadata?.role as string | undefined;

      const isAdmin =
         roles?.some((r: any) => r.role === "admin") || metaRole === "admin";
      const isRider =
         roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

      if (isAdmin) {
         url.pathname = "/admin";
      } else if (isRider) {
         url.pathname = "/rider";
      } else {
         url.pathname = "/";
      }

      return NextResponse.redirect(url);
   }

   // Protect /admin routes: only allow users with admin role
   if (user && request.nextUrl.pathname.startsWith("/admin")) {
      const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);

      const metaRole = (user as any)?.user_metadata?.role as string | undefined;
      const isAdmin =
         roles?.some((r: any) => r.role === "admin") || metaRole === "admin";

      if (!isAdmin) {
         const url = request.nextUrl.clone();
         url.pathname = "/";
         return NextResponse.redirect(url);
      }
   }

   // Protect /rider routes: only allow users with rider role
   if (user && request.nextUrl.pathname.startsWith("/rider")) {
      const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);

      const metaRole = (user as any)?.user_metadata?.role as string | undefined;
      const isRider =
         roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

      if (!isRider) {
         const url = request.nextUrl.clone();
         url.pathname = "/";
         return NextResponse.redirect(url);
      }
   }

   // IMPORTANT: You *must* return the supabaseResponse object as it is.
   // If you're creating a new response object with NextResponse.next() make sure to:
   // 1. Pass the request in it, like so:
   //    const myNewResponse = NextResponse.next({ request })
   // 2. Copy over the cookies, like so:
   //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
   // 3. Change the myNewResponse object to fit your needs, but avoid changing
   //    the cookies!
   // 4. Finally:
   //    return myNewResponse
   // If this is not done, you may be causing the browser and server to go out
   // of sync and terminate the user's session prematurely!

   return supabaseResponse;
}
