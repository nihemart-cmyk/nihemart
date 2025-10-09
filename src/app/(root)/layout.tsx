import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/landing-page/NavBar";
import AnnouncementBar from "@/components/landing-page/AnnouncementBar";
import Footer from "@/components/landing-page/Footer";
import "../globals.css";

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

export const metadata: Metadata = {
   title: "Nihemart",
   description: "A modern e-commerce platform, where you can buy anything.",
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <>
         <AnnouncementBar />
         <NavBar />
         {children}
         <Footer />
      </>
   );
}
