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
      let isRider =
         roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

      // Fallback: if no explicit role found, check if a rider row exists for this user
      // This helps newly-created rider accounts (admin-created) which may not have
      // a user_roles row yet but do have a riders record.
      if (!isRider) {
         try {
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (riderRow && (riderRow as any).id) isRider = true;
         } catch (e) {
            // ignore errors and assume not a rider
         }
      }

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

      // Fallback: check riders table to allow rider users access if they have a riders row
      if (!isRider) {
         const url = request.nextUrl.clone();
         try {
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (!riderRow || !(riderRow as any).id) {
               url.pathname = "/";
               return NextResponse.redirect(url);
            }
            // else: riderRow exists, allow through
         } catch (e) {
            url.pathname = "/";
            return NextResponse.redirect(url);
         }
      }

      // Riders are allowed through the /rider protection block; do not
      // perform additional redirects here because that would cause a
      // redirect-to-self loop when visiting /rider.
   }

   // Redirect authenticated riders away from non-public storefront pages
   // Run this check only for requests NOT already under /rider to avoid
   // self-redirect loops.
   if (
      user &&
      !request.nextUrl.pathname.startsWith("/rider") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/signin")
   ) {
      const pathname = request.nextUrl.pathname;

      // Whitelist of paths/prefixes riders are allowed to visit
      const riderAllowedPrefixes = [
         "/about",
         "/contact",
         "/how-to-buy",
         "/auth",
         "/signin",
         "/error",
         "/api",
         "/_next",
         "/static",
         "/assets",
         "/favicon.ico",
      ];

      const isAllowed = riderAllowedPrefixes.some(
         (p) =>
            pathname === p ||
            pathname.startsWith(p + "/") ||
            pathname.startsWith(p)
      );

      if (!isAllowed) {
         // Determine if the user is a rider (check user_roles, metadata, and riders table)
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         let isRider =
            roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

         if (!isRider) {
            try {
               const { data: riderRow } = await supabase
                  .from("riders")
                  .select("id")
                  .eq("user_id", user.id)
                  .maybeSingle();
               if (riderRow && (riderRow as any).id) isRider = true;
            } catch (e) {
               // ignore fallback errors
            }
         }

         if (isRider) {
            const url = request.nextUrl.clone();
            url.pathname = "/rider";
            return NextResponse.redirect(url);
         }
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
