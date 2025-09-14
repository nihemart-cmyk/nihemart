"use client";

import { FC, ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ReactQueryProvider } from "@/providers/react.query.provider";
import { AuthProvider } from "@/providers/auth.provider";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

interface ProvidersProps {
   children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
   return (
      <ReactQueryProvider>
         <LanguageProvider>
            <AuthProvider>
               <NotificationsProvider>
                  <CartProvider>
                     <NuqsAdapter>{children}</NuqsAdapter>
                  </CartProvider>
               </NotificationsProvider>
            </AuthProvider>
         </LanguageProvider>
      </ReactQueryProvider>
   );
};

export default Providers;
