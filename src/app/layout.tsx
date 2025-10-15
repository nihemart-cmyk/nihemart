import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "sonner";
import TopProgressBar from "@/components/TopProgressBar";

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

const SITE_NAME = "Nihemart";
const DEFAULT_DESCRIPTION =
   "Muri NIHE MART ducuruza product utabona mu rwanda kuri make ushaka kutubona watwandikira kur whatsapp 0792412177.";
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nihemart.rw";

export const metadata: Metadata = {
   title: {
      default: SITE_NAME,
      template: `%s - ${SITE_NAME}`,
   },
   description: DEFAULT_DESCRIPTION,
   applicationName: SITE_NAME,
   openGraph: {
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      siteName: SITE_NAME,
      url: BASE_URL,
      type: "website",
      images: [
         {
            url: `${BASE_URL}/open-graph.png`,
            width: 1200,
            height: 630,
            alt: SITE_NAME,
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [`${BASE_URL}/twitter.png`],
   },
};
export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en">
         <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
         >
            <TopProgressBar />
            <Toaster richColors />
            <Providers>{children}</Providers>
         </body>
      </html>
   );
}
