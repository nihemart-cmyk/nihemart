import type { Metadata } from "next";
import RiderSidebar from "@/components/RiderSidebar";
import RiderTopBar from "@/components/RiderTopBar";
import { ReactNode } from "react";

export const metadata: Metadata = {
   title: "Rider Dashboard",
   description:
      "Porogaramu y'umugenzuzi — amakuru y'ibyo gutwara, imirimo n'itumanaho rya Nihemart.",
};

interface LayoutProps {
   children: ReactNode;
}

const layout = ({ children }: LayoutProps) => {
   return (
      <div className="w-full h-screen overflow-hidden flex bg-white">
         <div className="w-80 border-r bg-surface-secondary border-border-primary h-full hidden lg:block">
            <RiderSidebar />
         </div>
         <div className="w-full">
            <RiderTopBar
               variant="primary"
               title="Rider Dashboard"
            />
            {children}
         </div>
      </div>
   );
};

export default layout;
