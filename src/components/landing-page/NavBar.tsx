"use client";

import Image from "next/image";
import { FC, useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { cn } from "@/lib/utils";
import { Globe, Menu, ShoppingCart, User, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "../ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { SearchPopover } from "../search-popover";
import { Language } from "@/locales";
import NotificationsBell from "../NotificationsBell";

interface NavBarProps {}

export const routes = [
   { name: "nav.home", url: "/" },
   { name: "nav.products", url: "/products" },
   // { name: "nav.about", url: "/about" },
   { name: "nav.contact", url: "/contact" },
   { name: "nav.howToBuy", url: "/how-to-buy" },
] as const;

const NavBar: FC<NavBarProps> = ({}) => {
   const cart = useCart();
   const { items, itemsCount, initialized } = cart;
   const [mounted, setMounted] = useState(false);
   // Show unique product count in badge
   const uniqueProductCount = items.length;
   const [badgeCount, setBadgeCount] = useState<number>(
      () => uniqueProductCount || 0
   );

   useEffect(() => {
      setMounted(true);
   }, []);

   useEffect(() => {
      setBadgeCount(uniqueProductCount || 0);
   }, [uniqueProductCount]);

   useEffect(() => {
      try {
         if (
            (uniqueProductCount === 0 && !initialized) ||
            uniqueProductCount === 0
         ) {
            const raw = localStorage.getItem("cart");
            if (raw) {
               const parsed = JSON.parse(raw) as Array<any>;
               const total = parsed.length;
               if (total && total !== badgeCount) setBadgeCount(total);
            }
         }
      } catch (err) {
         // ignore
      }
   }, [initialized]);

   useEffect(() => {
      const onStorage = (e: StorageEvent) => {
         if (e.key === "cart") {
            try {
               const val = e.newValue;
               if (!val) {
                  setBadgeCount(0);
                  return;
               }
               const parsed = JSON.parse(val) as Array<any>;
               const total = parsed.length;
               setBadgeCount(total);
            } catch (err) {
               // ignore
            }
         }
      };

      window.addEventListener("storage", onStorage);
      const onCustom = (e: any) => {
         try {
            const c = e?.detail?.count;
            // If event is fired, recalculate from localStorage
            const raw = localStorage.getItem("cart");
            if (raw) {
               const parsed = JSON.parse(raw) as Array<any>;
               setBadgeCount(parsed.length);
            } else {
               setBadgeCount(0);
            }
         } catch (err) {
            // ignore
         }
      };
      window.addEventListener("cart:updated", onCustom as EventListener);
      return () => window.removeEventListener("storage", onStorage);
   }, []);
   const { user, hasRole, signOut } = useAuth();
   const router = useRouter();

   const { language, setLanguage, t } = useLanguage();

   const handleLanguageChange = (lang: Language) => {
      setLanguage(lang);
   };

   const handleLogout = async () => {
      try {
         await signOut();
         toast.success("Successfully logged out");
         router.push("/");
      } catch (error) {
         toast.error("Error logging out");
      }
   };

   return (
      <div className="sticky top-0 w-full z-[998] bg-white border shadow-md">
         <MaxWidthWrapper
            size={"lg"}
            className="w-full flex items-center justify-between py-2"
         >
            <Link href="/">
               <Image
                  src={logo}
                  alt="ilead logo"
                  priority
                  className="w-14 h-16"
               />
            </Link>

            <div className="hidden lg:flex items-center gap-4">
               {routes.map(({ url, name }, i) => (
                  <Link
                     key={i}
                     href={url}
                     className={cn(
                        "relative text-slate-500 font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-brand-orange after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
                     )}
                  >
                     {t(name)}
                  </Link>
               ))}
            </div>

            {/* Replace the old form with the new SearchPopover component */}
            <SearchPopover />

            <div className="flex items-center md:gap-2 gap-1">
               <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  aria-label="Cart"
                  className="hover:bg-blue-500 group"
               >
                  <Link
                     href={"/cart"}
                     className="relative"
                  >
                     <ShoppingCart className="h-5 w-5 text-slate-700 group-hover:text-white transition-colors duration-200" />
                     {/* Always render the Badge node so server and client DOM shape match.
                         Populate the visible count only after client mount to avoid hydration errors. */}
                     <Badge
                        className={`absolute -top-2 -right-2 h-5 w-5 rounded-full text-xs p-0 flex items-center justify-center bg-orange-400 outline-none z-10 ${
                           !mounted || badgeCount === 0
                              ? "opacity-0 pointer-events-none"
                              : "opacity-100"
                        }`}
                     >
                        <span suppressHydrationWarning>
                           {mounted && badgeCount > 0 ? badgeCount : ""}
                        </span>
                     </Badge>
                  </Link>
               </Button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon"
                        aria-label="User menu"
                     >
                        <User className="h-5 w-5" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="end"
                     className="z-[9999]"
                  >
                     {!user ? (
                        <>
                           <DropdownMenuItem asChild>
                              <Link href={"/about"}>{t("nav.about")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/returns"}>{t("nav.returns")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/signin"}>{t("nav.login")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/signup"}>{t("nav.register")}</Link>
                           </DropdownMenuItem>
                        </>
                     ) : (
                        <>
                           <DropdownMenuItem asChild>
                              <Link href={"/about"}>{t("nav.about")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/profile"}>{t("nav.profile")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/returns"}>{t("nav.returns")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/wishlist"}>
                                 {t("nav.wishlist")}
                              </Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/orders"}>{t("nav.orders")}</Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem asChild>
                              <Link href={"/notifications"}>
                                 {t("nav.notifications")}
                              </Link>
                           </DropdownMenuItem>
                           {hasRole("admin") && (
                              <DropdownMenuItem asChild>
                                 <Link href={"/admin"}>{t("nav.admin")}</Link>
                              </DropdownMenuItem>
                           )}
                           <DropdownMenuItem onClick={handleLogout}>
                              <LogOut className="h-4 w-4 mr-2" />
                              {t("nav.logout")}
                           </DropdownMenuItem>
                        </>
                     )}
                  </DropdownMenuContent>
               </DropdownMenu>
               <NotificationsBell />
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button className="relative px-2 lg:hidden bg-brand-blue hover:bg-brand-blue/90 ml-1">
                        <Menu />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     className="w-56 z-[9999]"
                     align="end"
                     sideOffset={10}
                     forceMount
                  >
                     {routes.map(({ name, url }, index) => (
                        <DropdownMenuItem
                           key={index}
                           asChild
                           className="border-b"
                        >
                           <Link href={url}>{t(name)}</Link>
                        </DropdownMenuItem>
                     ))}
                     <DropdownMenuItem
                        asChild
                        className="border-b"
                     >
                        <Link href="/wishlist">{t("nav.wishlist")}</Link>
                     </DropdownMenuItem>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              aria-label={
                                 t("nav.language") || "Select language"
                              }
                              className="bg-orange-500 hover:bg-orange-500/90 w-full mt-2"
                           >
                              <Globe className="h-4 w-4" />
                              <span className="">{language.toUpperCase()}</span>
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                           align="end"
                           className="z-[9999]"
                        >
                           <DropdownMenuItem
                              onClick={() => handleLanguageChange("en")}
                           >
                              English
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onClick={() => handleLanguageChange("rw")}
                           >
                              Kinyarwanda
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </MaxWidthWrapper>
      </div>
   );
};

export default NavBar;
