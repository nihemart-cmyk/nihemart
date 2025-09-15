"use client";

import Image from "next/image";
import { FC, useState, useEffect, ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";
import SidebarAnimatedBackground from "./admin/sidebar-animated-bg";
import { BadgeDollarSign, ChevronDown, LogOut, Settings } from "lucide-react";
import { Button } from "./ui/button";

interface NavItem {
   id: string;
   title: string;
   icon: ElementType;
   href?: string;
   subLinks?: Omit<NavItem, "subLinks" | "icon">[];
}

type FlatNavItem = {
   item: NavItem | Omit<NavItem, "subLinks" | "icon">;
   parent?: NavItem;
};

const navItems: NavItem[] = [
   {
      id: "1",
      title: "Dashboard",
      href: "/admin",
      icon: Icons.sidebar.dashboard,
   },
   {
      id: "8",
      title: "Transactions",
      href: "/admin/transactions",
      icon: BadgeDollarSign,
   },
   {
      id: "2",
      title: "Users",
      icon: Icons.sidebar.users,
      subLinks: [
         { id: "2-1", title: "User Management", href: "/admin/users" },
         { id: "2-2", title: "Add new user", href: "/admin/users/new" },
         {
            id: "2-3",
            title: "User roles & permissions",
            href: "/admin/users/permissions",
         },
      ],
   },

   {
      id: "4",
      title: "Products",
      icon: Icons.sidebar.products,
      subLinks: [
         { id: "4-1", title: "Products Management", href: "/admin/products" },
         { id: "4-2", title: "Add product", href: "/admin/products/new" },
         {
            id: "4-3",
            title: "Product Categories",
            href: "/admin/products/categories",
         },
         {
            id: "4-4",
            title: "Discounts & Offers",
            href: "/admin/products/discounts",
         },
         {
            id: "4-5",
            title: "Product Reviews / Ratings",
            href: "/admin/products/reviews",
         },
      ],
   },
   {
      id: "3",
      title: "Orders",
      icon: Icons.sidebar.orders,
      subLinks: [
         { id: "3-1", title: "Orders Management", href: "/admin/orders" },
         { id: "3-2", title: "New orders", href: "/admin/orders/new" },
         {
            id: "3-3",
            title: "External orders",
            href: "/admin/orders/external",
         },
      ],
   },
   {
      id: "5",
      title: "Sales",
      icon: Icons.sidebar.sales,
      subLinks: [
         {
            id: "5-1",
            title: "Sales Overview / Dashboard",
            href: "/admin/sales",
         },
         { id: "5-2", title: "Sales Reports", href: "/admin/sales/reports" },
      ],
   },
   {
      id: "6",
      title: "Stock",
      icon: Icons.sidebar.stock,
      subLinks: [
         { id: "6-1", title: "Stock Management", href: "/admin/stock" },
         {
            id: "6-2",
            title: "Add Stock / Update Stock",
            href: "/admin/stock/manage",
         },
         { id: "6-3", title: "Stock History", href: "/admin/users/history" },
      ],
   },
   {
      id: "7",
      title: "Riders",
      icon: Icons.sidebar.riders,
      subLinks: [
         { id: "7-1", title: "Rider Management", href: "/admin/riders" },
         { id: "7-3", title: "Add New Rider", href: "/admin/riders/new" },
      ],
   },
];

const Sidebar: FC = () => {
   const router = useRouter();
   const pathname = usePathname();
   const { user, roles, signOut } = useAuth();

   const fullName = user?.user_metadata?.full_name || user?.email || "User";
   const role = roles.has("admin") ? "Admin" : "User";
   const imageUrl = user?.user_metadata?.avatar_url || "";

   const handleLogout = async () => {
      try {
         await signOut();
         toast.success("Successfully logged out");
         router.push("/");
      } catch (error) {
         toast.error("Error logging out");
      }
   };

   const [primaryActiveId, setPrimaryActiveId] = useState<string | null>(null);
   const [secondaryActiveId, setSecondaryActiveId] = useState<string | null>(
      null
   );
   const [openMenu, setOpenMenu] = useState<string | null>(null);

   useEffect(() => {
      let bestMatch: FlatNavItem | null = null;
      const allLinks = navItems.flatMap((item): FlatNavItem[] => {
         if (item.subLinks) {
            return item.subLinks.map((sub) => ({ item: sub, parent: item }));
         } else {
            return [{ item: item, parent: undefined }];
         }
      });

      allLinks.sort(
         (a, b) => (b.item.href?.length ?? 0) - (a.item.href?.length ?? 0)
      );

      for (const link of allLinks) {
         if (link.item.href && pathname?.startsWith(link.item.href)) {
            bestMatch = link;
            break;
         }
      }

      if (bestMatch) {
         if (bestMatch.parent) {
            setPrimaryActiveId(bestMatch.parent.id);
            setSecondaryActiveId(bestMatch.item.id);
            setOpenMenu(bestMatch.parent.id);
         } else {
            setPrimaryActiveId((bestMatch.item as NavItem).id);
            setSecondaryActiveId(null);
            setOpenMenu(null);
         }
      } else if (pathname === "/admin") {
         setPrimaryActiveId("1");
         setSecondaryActiveId(null);
         setOpenMenu(null);
      }
   }, [pathname]);

   const handleParentClick = (item: NavItem) => {
      const isOpening = openMenu !== item.id;
      setOpenMenu(isOpening ? item.id : null);

      if (isOpening && item.subLinks && item.subLinks[0]?.href) {
         router.push(item.subLinks[0].href);
      }
   };

   return (
      <div className="w-full h-full flex flex-col py-10 px-1 lg:px-5">
         <div className="w-full ml-2 mb-8 flex-shrink-0 flex flex-col items-start gap-2">
            <Image
               src={logo}
               alt="ilead logo"
               priority
               height={50}
               width={200}
            />
         </div>

         <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1">
               <SidebarAnimatedBackground activeId={primaryActiveId}>
                  {navItems.map((item) => {
                     const Icon = item.icon;
                     const isOpen = openMenu === item.id;

                     if (item.subLinks) {
                        return (
                           <div
                              key={item.id}
                              data-id={item.id}
                              className="flex flex-col"
                           >
                              <button
                                 onClick={() => handleParentClick(item)}
                                 className={cn(
                                    "px-6 py-2 flex items-center gap-3 w-full justify-start font-medium"
                                 )}
                              >
                                 <Icon size={20} />
                                 <span>{item.title}</span>
                                 <motion.span
                                    className="ml-auto"
                                    animate={{ rotate: isOpen ? 0 : -90 }}
                                    transition={{ duration: 0.2 }}
                                 >
                                    <ChevronDown size={16} />
                                 </motion.span>
                              </button>
                              <AnimatePresence>
                                 {isOpen && (
                                    <motion.div
                                       initial={{ height: 0, opacity: 0 }}
                                       animate={{ height: "auto", opacity: 1 }}
                                       exit={{ height: 0, opacity: 0 }}
                                       transition={{
                                          duration: 0.3,
                                          ease: "easeInOut",
                                       }}
                                       className="overflow-hidden flex flex-col pl-8 text-sm"
                                    >
                                       {item.subLinks.map((subLink) => {
                                          const isSubLinkActive =
                                             secondaryActiveId === subLink.id;
                                          return (
                                             <Link
                                                key={subLink.id}
                                                href={subLink.href!}
                                                className={cn(
                                                   "px-4 py-1 flex items-center gap-3 w-full justify-start text-neutral-600",
                                                   isSubLinkActive
                                                      ? "font-bold text-neutral-800"
                                                      : "font-medium"
                                                )}
                                             >
                                                <span>{subLink.title}</span>
                                             </Link>
                                          );
                                       })}
                                    </motion.div>
                                 )}
                              </AnimatePresence>
                           </div>
                        );
                     }
                     return (
                        <Link
                           key={item.id}
                           href={item.href!}
                           data-id={item.id}
                           className={cn("w-full")}
                        >
                           <p className="px-6 py-2 !flex items-center gap-3 w-full justify-start font-medium">
                              <Icon size={20} />
                              <span>{item.title}</span>
                           </p>
                        </Link>
                     );
                  })}
               </SidebarAnimatedBackground>
            </div>
         </div>

         <div className="pt-4 flex-shrink-0 w-full flex flex-col">
            <Button
               variant={"ghost"}
               size={"lg"}
               className="h-12 flex items-center justify-start text-lg"
            >
               <Settings size={20} /> Settings
            </Button>
            <Button
               variant="ghost"
               size="lg"
               onClick={handleLogout}
               className="h-12 flex items-center justify-start text-lg text-red-600 hover:text-red-700 hover:bg-red-50"
            >
               <LogOut className="h-5 w-5 mr-2" />
               Logout
            </Button>
         </div>
      </div>
   );
};

export default Sidebar;
