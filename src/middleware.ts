import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabase } from "./integrations/supabase/client";

// Protect /admin and /profile routes
export async function middleware(req: NextRequest) {
  // const url = req.nextUrl.clone();
  // // const supabase = createServerComponentClient({ cookies });

  // // Get user session
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();

  // // Protect /admin
  // if (url.pathname.startsWith("/admin")) {
  //   if (!user) {
  //     url.pathname = "/signin";
  //     return NextResponse.redirect(url);
  //   }
  //   // Fetch user role from your DB or JWT
  //   // Example: user.user_metadata.role === "admin"
  //   if (user.user_metadata?.role !== "admin") {
  //     url.pathname = "/";
  //     return NextResponse.redirect(url);
  //   }
  // }

  // // Protect /profile
  // if (url.pathname.startsWith("/profile")) {
  //   if (!user) {
  //     url.pathname = "/signin";
  //     return NextResponse.redirect(url);
  //   }
  // }

  return NextResponse.next();
}

// Specify which paths to match
export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
