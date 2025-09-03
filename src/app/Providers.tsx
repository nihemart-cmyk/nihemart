"use client";

import { FC, ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ReactQueryProvider } from "@/providers/react.query.provider";

interface ProvidersProps {
  children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <ReactQueryProvider>
      <LanguageProvider>
        <CartProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </CartProvider>
      </LanguageProvider>
    </ReactQueryProvider>
  );
};

export default Providers;
