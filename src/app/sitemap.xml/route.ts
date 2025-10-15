import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nihemart.rw";

const PAGES = [
   "/",
   "/about",
   "/products",
   "/how-to-buy",
   "/contact",
   "/signin",
   "/signup",
];

export async function GET() {
   const urls = PAGES.map((p) => `${BASE_URL}${p}`);

   const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n") +
      `\n</urlset>`;

   return new NextResponse(xml, {
      headers: {
         "Content-Type": "application/xml",
      },
   });
}
