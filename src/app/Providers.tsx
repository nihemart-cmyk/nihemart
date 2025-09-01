"use client";
import { FC, ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";

interface ProvidersProps {
  children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <>
      <LanguageProvider>
        <CartProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </CartProvider>
      </LanguageProvider>
    </>
  );
};

export default Providers;
