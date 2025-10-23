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

   const {
      data: { user },
   } = await supabase.auth.getUser();

   // Define public routes that don't require authentication
   const publicRoutes = [
      "/",
      "/signin",
      "/auth/signin",
      "/products",
      "/products/:path*",
      "/about",
      "/contact",
      "/how-to-buy",
      "/error",
      // Add API routes that should be public (be careful with this)
      "/api/auth/callback", // OAuth callback
   ];

   const isPublicRoute = publicRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return request.nextUrl.pathname === route;
   });

   // Define protected routes
   const protectedRoutes = [
      "/checkout",
      "/checkout/:path*",
      "/profile",
      "/profile/:path*",
      "/admin",
      "/admin/:path*",
      "/rider",
      "/rider/:path*",
   ];

   const isProtectedRoute = protectedRoutes.some((route) => {
      if (route.includes(":path*")) {
         const baseRoute = route.replace("/:path*", "");
         return (
            request.nextUrl.pathname === baseRoute ||
            request.nextUrl.pathname.startsWith(baseRoute + "/")
         );
      }
      return request.nextUrl.pathname === route;
   });

   // If user is NOT logged in and trying to access protected route
   if (!user && isProtectedRoute) {
      const redirectUrl = new URL("/signin", request.url);
      redirectUrl.searchParams.set(
         "redirect",
         request.nextUrl.pathname + request.nextUrl.search
      );
      return NextResponse.redirect(redirectUrl);
   }

   // If user IS logged in and trying to access signin page
   if (
      user &&
      (request.nextUrl.pathname === "/signin" ||
         request.nextUrl.pathname === "/auth/signin")
   ) {
      // Check if there's a redirect parameter first
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/")) {
         return NextResponse.redirect(new URL(redirectParam, request.url));
      }

      // Otherwise redirect based on role
      const { data: roles } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);

      const metaRole = (user as any)?.user_metadata?.role as string | undefined;
      const isAdmin =
         roles?.some((r: any) => r.role === "admin") || metaRole === "admin";

      let isRider =
         roles?.some((r: any) => r.role === "rider") || metaRole === "rider";
      if (!isRider) {
         const { data: riderRow } = await supabase
            .from("riders")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
         if (riderRow) isRider = true;
      }

      if (isAdmin) {
         return NextResponse.redirect(new URL("/admin", request.url));
      } else if (isRider) {
         return NextResponse.redirect(new URL("/rider", request.url));
      } else {
         return NextResponse.redirect(new URL("/", request.url));
      }
   }

   // Role-based route protection
   if (user) {
      // Protect admin routes
      if (request.nextUrl.pathname.startsWith("/admin")) {
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         const isAdmin =
            roles?.some((r: any) => r.role === "admin") || metaRole === "admin";

         if (!isAdmin) {
            return NextResponse.redirect(new URL("/", request.url));
         }
      }

      // Protect rider routes
      if (request.nextUrl.pathname.startsWith("/rider")) {
         const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

         const metaRole = (user as any)?.user_metadata?.role as
            | string
            | undefined;
         const isRider =
            roles?.some((r: any) => r.role === "rider") || metaRole === "rider";

         if (!isRider) {
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (!riderRow) {
               return NextResponse.redirect(new URL("/", request.url));
            }
         }
      }

      // Redirect riders away from non-public, non-rider pages
      if (
         !request.nextUrl.pathname.startsWith("/rider") &&
         !request.nextUrl.pathname.startsWith("/api") &&
         !isPublicRoute
      ) {
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
            const { data: riderRow } = await supabase
               .from("riders")
               .select("id")
               .eq("user_id", user.id)
               .maybeSingle();
            if (riderRow) isRider = true;
         }

         // If user is a rider, only allow rider routes and public routes
         if (isRider) {
            return NextResponse.redirect(new URL("/rider", request.url));
         }
      }
   }

   return supabaseResponse;
}
