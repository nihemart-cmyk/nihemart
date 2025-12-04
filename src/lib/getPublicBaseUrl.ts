import type { NextRequest } from "next/server";

/**
 * Build a public-facing base URL for redirects and assets.
 *
 * Priority:
 * 1. Explicit env URLs (NEXT_PUBLIC_APP_URL / NEXTAUTH_URL / VERCEL_URL)
 * 2. In production, derive https://<hostname> from the incoming request
 * 3. In non-production, fall back to request.nextUrl.origin (keeps :3000 locally)
 */
export function getPublicBaseUrl(request: NextRequest): string {
   const envUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

   if (envUrl && envUrl.trim().length > 0) {
      return envUrl.replace(/\/$/, "");
   }

   const url = new URL(request.url);

   // In production, never leak internal ports like :3000 – always use https + hostname
   if (process.env.NODE_ENV === "production") {
      return `https://${url.hostname}`;
   }

   // In development keep the original origin (e.g. http://localhost:3000)
   return request.nextUrl.origin.replace(/\/$/, "");
}


