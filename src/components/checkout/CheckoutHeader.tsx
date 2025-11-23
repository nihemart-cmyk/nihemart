"use client";
import React from "react";
import { Loader2, AlertCircle } from "lucide-react";

export default function CheckoutHeader({
   title,
   missingSteps,
   t,
}: {
   title: string;
   missingSteps: string[];
   t: (k: string) => string;
}) {
   return (
      <>
         <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-6 sm:mb-8 px-2 sm:px-0">
            {title}
         </h1>

         {missingSteps.length > 0 && (
            <div className="sticky top-4 z-40 mb-4">
               <div className="mx-auto max-w-[90vw] sm:max-w-7xl px-2 sm:px-0">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 shadow-sm">
                     <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                           <div className="font-semibold text-sm">
                              {t("checkout.missing.header")}
                           </div>
                           <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">
                              {missingSteps.map((m) => (
                                 <li key={m}>{t(m)}</li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </>
   );
}
