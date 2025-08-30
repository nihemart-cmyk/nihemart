"use client";
import { FC, ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/contexts/LanguageContext";

interface ProvidersProps {
  children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <>
      <LanguageProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </LanguageProvider>
    </>
  );
};

export default Providers;
