import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ContactClient = dynamic(() => import("./Client"), { ssr: false });

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Twandikire ku bijyanye na serivisi, ubufasha cyangwa ubucuruzi. Nihemart irahari kugufasha.",
};

export default function ContactPage() {
  return <ContactClient />;
}