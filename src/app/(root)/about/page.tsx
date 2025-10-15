import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AboutClient = dynamic(() => import("./Client"), { ssr: false });

export const metadata: Metadata = {
  title: "About",
  description:
    "Menya Nihemart — intego zacu, indangagaciro n'itsinda rituma ubucuruzi bwo kuri internet buboneka mu Rwanda.",
};

export default function AboutPage() {
  return <AboutClient />;
}