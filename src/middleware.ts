import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
   return await updateSession(request);
}

// Specify which paths to match
export const config = {
   matcher: [
      "/profile",
      "/profile/:path*",
      "/admin",
      "/admin/:path*",
      "/rider",
      "/rider/:path*",
      "/checkout",
      "/checkout/:path*",
      "/signin",
      "/auth/signin",
      "/(auth)/signin",
      // Add more private routes as needed
   ],
};
